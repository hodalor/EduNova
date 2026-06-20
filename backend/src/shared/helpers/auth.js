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

  await redisClient.set(
    `auth:refresh:${tokenId}`,
    JSON.stringify({ user_id: user.id, institution_id: user.institution_id }),
    'EX',
    REFRESH_TTL_SECONDS
  );
  await redisClient.sadd(`auth:user-refresh:${user.id}`, tokenId);
  await redisClient.expire(`auth:user-refresh:${user.id}`, REFRESH_TTL_SECONDS);

  return token;
};

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

const blacklistToken = async (token, ttlSeconds = ACCESS_TTL_SECONDS) =>
  redisClient.set(`auth:blacklist:${token}`, '1', 'EX', ttlSeconds);

const isTokenBlacklisted = async (token) => Boolean(await redisClient.get(`auth:blacklist:${token}`));

const incrementFailedLogin = async (key) => {
  const attempts = await redisClient.incr(key);
  if (attempts === 1) {
    await redisClient.expire(key, LOGIN_LOCK_WINDOW_SECONDS);
  }
  return attempts;
};

const getFailedLoginCount = async (key) => Number(await redisClient.get(key) || 0);
const clearFailedLogin = async (key) => redisClient.del(key);

const isLocked = async (email, institutionId) => {
  const key = `auth:login:fail:${institutionId}:${email}`;
  const attempts = await getFailedLoginCount(key);
  const retryIn = attempts >= LOGIN_MAX_ATTEMPTS ? await redisClient.ttl(key) : 0;

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
  await redisClient.set(`auth:otp:${purpose}:${token}`, JSON.stringify({ userId, value, metadata }), 'EX', ttl);
  return token;
};

const getOtpRecord = async (purpose, token) => {
  const raw = await redisClient.get(`auth:otp:${purpose}:${token}`);
  return raw ? JSON.parse(raw) : null;
};

const deleteOtpRecord = async (purpose, token) => redisClient.del(`auth:otp:${purpose}:${token}`);

const revokeRefreshToken = async (token) => {
  const payload = verifyRefreshToken(token);
  await redisClient.del(`auth:refresh:${payload.jti}`);
  await redisClient.srem(`auth:user-refresh:${payload.sub}`, payload.jti);
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
