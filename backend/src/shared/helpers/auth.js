const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

const env = require('../../config/env');
const logger = require('../../config/logger');
const { redisClient } = require('../../config/redis');
const { getPermissionsForRole } = require('../constants/permissions');

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const LOGIN_LOCK_WINDOW_SECONDS = 15 * 60;
const LOGIN_MAX_ATTEMPTS = 5;
const PASSWORD_ROUNDS = 12;
const fallbackCache = new Map();
const fallbackSets = new Map();
let hasLoggedRedisFallback = false;

const logRedisFallback = (operation, error) => {
  if (hasLoggedRedisFallback) {
    return;
  }

  hasLoggedRedisFallback = true;
  logger.warn('Redis unavailable for auth helper; using in-memory fallback', {
    operation,
    error: error.message,
  });
};

const safeRedisGet = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logRedisFallback('get', error);
    return fallbackCache.get(key) || null;
  }
};

const safeRedisSet = async (key, value, ...args) => {
  try {
    return await redisClient.set(key, value, ...args);
  } catch (error) {
    logRedisFallback('set', error);
    fallbackCache.set(key, value);
    return 'OK';
  }
};

const safeRedisDel = async (...keys) => {
  try {
    return await redisClient.del(...keys);
  } catch (error) {
    logRedisFallback('del', error);
    const flattened = keys.flat();
    flattened.forEach((key) => {
      fallbackCache.delete(key);
      fallbackSets.delete(key);
    });
    return flattened.length;
  }
};

const safeRedisSadd = async (key, value) => {
  try {
    return await redisClient.sadd(key, value);
  } catch (error) {
    logRedisFallback('sadd', error);
    const current = fallbackSets.get(key) || new Set();
    current.add(value);
    fallbackSets.set(key, current);
    return current.size;
  }
};

const safeRedisSrem = async (key, value) => {
  try {
    return await redisClient.srem(key, value);
  } catch (error) {
    logRedisFallback('srem', error);
    const current = fallbackSets.get(key);
    if (!current) {
      return 0;
    }
    current.delete(value);
    return 1;
  }
};

const safeRedisExpire = async (key, seconds) => {
  try {
    return await redisClient.expire(key, seconds);
  } catch (error) {
    logRedisFallback('expire', error);
    return 1;
  }
};

const safeRedisIncr = async (key) => {
  try {
    return await redisClient.incr(key);
  } catch (error) {
    logRedisFallback('incr', error);
    const next = Number(fallbackCache.get(key) || 0) + 1;
    fallbackCache.set(key, String(next));
    return next;
  }
};

const safeRedisTtl = async (key) => {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    logRedisFallback('ttl', error);
    return fallbackCache.has(key) ? LOGIN_LOCK_WINDOW_SECONDS : 0;
  }
};

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 587),
  secure: false,
  auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

let smsClient = null;
try {
  if (env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_SID.startsWith('AC')) {
    smsClient = twilio(env.TWILIO_SID, env.TWILIO_TOKEN);
  }
} catch (error) {
  logger.warn('Twilio client initialization skipped', { error: error.message });
}

const hashPassword = (plainText) => bcrypt.hash(plainText, PASSWORD_ROUNDS);
const comparePassword = (plainText, hash) => bcrypt.compare(plainText, hash);

const signToken = (payload, secret, expiresIn) => jwt.sign(payload, secret, { expiresIn });

const signAccessToken = (user) =>
  signToken(
    {
      sub: user.id,
      institution_id: user.institution_id,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
      type: 'access',
    },
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN || '15m'
  );

const signRefreshToken = async (user) => {
  const tokenId = crypto.randomUUID();
  const payload = {
    sub: user.id,
    institution_id: user.institution_id,
    role: user.role,
    type: 'refresh',
    jti: tokenId,
  };
  const token = signToken(payload, env.JWT_REFRESH_SECRET, '30d');

  await safeRedisSet(
    `auth:refresh:${tokenId}`,
    JSON.stringify({ user_id: user.id, institution_id: user.institution_id }),
    'EX',
    REFRESH_TTL_SECONDS
  );
  await safeRedisSadd(`auth:user-refresh:${user.id}`, tokenId);
  await safeRedisExpire(`auth:user-refresh:${user.id}`, REFRESH_TTL_SECONDS);

  return token;
};

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

const blacklistToken = async (token, ttlSeconds = ACCESS_TTL_SECONDS) =>
  safeRedisSet(`auth:blacklist:${token}`, '1', 'EX', ttlSeconds);

const isTokenBlacklisted = async (token) => Boolean(await safeRedisGet(`auth:blacklist:${token}`));

const incrementFailedLogin = async (key) => {
  const attempts = await safeRedisIncr(key);
  if (attempts === 1) {
    await safeRedisExpire(key, LOGIN_LOCK_WINDOW_SECONDS);
  }
  return attempts;
};

const getFailedLoginCount = async (key) => Number((await safeRedisGet(key)) || 0);
const clearFailedLogin = async (key) => safeRedisDel(key);

const isLocked = async (email, institutionId) => {
  const key = `auth:login:fail:${institutionId}:${email}`;
  const attempts = await getFailedLoginCount(key);
  const retryIn = attempts >= LOGIN_MAX_ATTEMPTS ? await safeRedisTtl(key) : 0;

  return {
    locked: attempts >= LOGIN_MAX_ATTEMPTS,
    attempts,
    retryIn,
  };
};

const recordFailedLogin = async (email, institutionId) =>
  incrementFailedLogin(`auth:login:fail:${institutionId}:${email}`);

const clearLoginLock = async (email, institutionId) =>
  clearFailedLogin(`auth:login:fail:${institutionId}:${email}`);

const sendEmail = async ({ to, subject, html }) => {
  if (!to) {
    return false;
  }
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('SMTP not configured; email logged only', { to, subject });
    return false;
  }
  await transporter.sendMail({ from: env.SMTP_USER, to, subject, html });
  return true;
};

const sendSMS = async ({ to, body }) => {
  if (!to) {
    return false;
  }
  if (!smsClient || !env.TWILIO_PHONE) {
    logger.warn('Twilio not configured; SMS logged only', { to, body });
    return false;
  }
  await smsClient.messages.create({ to, from: env.TWILIO_PHONE, body });
  return true;
};

const storeOtp = async ({ purpose, userId, value, ttl = 10 * 60, metadata = {} }) => {
  const token = crypto.randomUUID();
  await safeRedisSet(
    `auth:otp:${purpose}:${token}`,
    JSON.stringify({ userId, value, metadata }),
    'EX',
    ttl
  );
  return token;
};

const getOtpRecord = async (purpose, token) => {
  const raw = await safeRedisGet(`auth:otp:${purpose}:${token}`);
  return raw ? JSON.parse(raw) : null;
};

const deleteOtpRecord = async (purpose, token) => safeRedisDel(`auth:otp:${purpose}:${token}`);

const revokeRefreshToken = async (token) => {
  const payload = verifyRefreshToken(token);
  await safeRedisDel(`auth:refresh:${payload.jti}`);
  await safeRedisSrem(`auth:user-refresh:${payload.sub}`, payload.jti);
  return payload;
};

const rotateRefreshToken = async (token, user) => {
  await revokeRefreshToken(token);
  return signRefreshToken(user);
};

module.exports = {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_WINDOW_SECONDS,
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
  isLocked,
  recordFailedLogin,
  clearLoginLock,
  sendEmail,
  sendSMS,
  storeOtp,
  getOtpRecord,
  deleteOtpRecord,
  rotateRefreshToken,
  revokeRefreshToken,
};
