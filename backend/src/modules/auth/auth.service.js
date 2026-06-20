const crypto = require('crypto');

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const logger = require('../../config/logger');
const { redisClient } = require('../../config/redis');
const { models } = require('../../config/database');
const { getPermissionsForRole } = require('../../shared/constants/permissions');
const {
  comparePassword,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  blacklistToken,
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
} = require('../../shared/helpers/auth');

const buildProfile = async (user) => {
  const institution = user.institution || (await models.Institution.findByPk(user.institution_id));

  return {
    id: user.id,
    institution_id: user.institution_id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    profile_photo: user.profile_photo,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    last_login: user.last_login,
    institution,
    permissions: getPermissionsForRole(user.role),
  };
};

const login = async ({ email, password, institution_id, otp_code }) => {
  const lock = await isLocked(email, institution_id);
  if (lock.locked) {
    throw Object.assign(new Error(`Account locked. Try again in ${lock.retryIn} seconds.`), { status: 429 });
  }

  const user = await models.User.findOne({
    where: { email, institution_id },
    include: [{ model: models.Institution, as: 'institution' }],
  });

  if (!user) {
    await recordFailedLogin(email, institution_id);
    throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    await recordFailedLogin(email, institution_id);
    logger.warn('Failed login attempt', { email, institution_id, user_id: user.id });
    throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
  }

  if (user['2fa_enabled']) {
    if (!otp_code) {
      throw Object.assign(new Error('Two-factor authentication code is required.'), { status: 400 });
    }

    const verified = speakeasy.totp.verify({
      secret: user['2fa_secret'],
      encoding: 'base32',
      token: otp_code,
      window: 1,
    });

    if (!verified) {
      throw Object.assign(new Error('Invalid two-factor authentication code.'), { status: 401 });
    }
  }

  await clearLoginLock(email, institution_id);
  await user.update({ last_login: new Date() });

  const access_token = signAccessToken(user);
  const refresh_token = await signRefreshToken(user);

  logger.info('User logged in', { user_id: user.id, institution_id: user.institution_id });

  return {
    user: await buildProfile(user),
    institution: user.institution,
    permissions: getPermissionsForRole(user.role),
    tokens: {
      access_token,
      refresh_token,
      expires_in: 15 * 60,
    },
  };
};

const refresh = async ({ refresh_token }) => {
  const payload = verifyRefreshToken(refresh_token);
  const session = await redisClient.get(`auth:refresh:${payload.jti}`);
  if (!session) {
    throw Object.assign(new Error('Refresh token session not found.'), { status: 401 });
  }

  const user = await models.User.findByPk(payload.sub, {
    include: [{ model: models.Institution, as: 'institution' }],
  });
  if (!user || !user.is_active) {
    throw Object.assign(new Error('User account is inactive.'), { status: 401 });
  }

  const access_token = signAccessToken(user);
  const rotated_refresh_token = await rotateRefreshToken(refresh_token, user);

  logger.info('Refresh token rotated', { user_id: user.id });

  return {
    user: await buildProfile(user),
    permissions: getPermissionsForRole(user.role),
    tokens: {
      access_token,
      refresh_token: rotated_refresh_token,
      expires_in: 15 * 60,
    },
  };
};

const logout = async ({ token, refresh_token }) => {
  if (token) {
    await blacklistToken(token);
  }
  if (refresh_token) {
    await revokeRefreshToken(refresh_token);
  }

  logger.info('User logged out');

  return { success: true };
};

const forgotPassword = async ({ email, institution_id }) => {
  const user = await models.User.findOne({ where: { email, institution_id } });
  if (!user) {
    return { success: true };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const token = await storeOtp({
    purpose: 'reset-password',
    userId: user.id,
    value: otp,
    metadata: { institution_id },
  });

  await sendEmail({
    to: user.email,
    subject: 'EDUOVA password reset OTP',
    html: `<p>Your OTP is <strong>${otp}</strong>. Token: <strong>${token}</strong></p>`,
  });
  await sendSMS({
    to: user.phone,
    body: `EDUOVA reset OTP: ${otp}`,
  });

  logger.info('Password reset OTP generated', { user_id: user.id });

  return {
    token,
    expires_in: 600,
  };
};

const resetPassword = async ({ token, otp, password }) => {
  const record = await getOtpRecord('reset-password', token);
  if (!record || record.value !== otp) {
    throw Object.assign(new Error('Invalid or expired reset token.'), { status: 400 });
  }

  const user = await models.User.findByPk(record.userId);
  if (!user) {
    throw Object.assign(new Error('User not found.'), { status: 404 });
  }

  await user.update({ password_hash: await hashPassword(password) });
  await deleteOtpRecord('reset-password', token);

  logger.info('Password reset completed', { user_id: user.id });

  return { success: true };
};

const changePassword = async ({ user, current_password, new_password }) => {
  const valid = await comparePassword(current_password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Current password is incorrect.'), { status: 400 });
  }

  await user.update({ password_hash: await hashPassword(new_password) });
  logger.info('Password changed', { user_id: user.id });

  return { success: true };
};

const me = async (user) => ({
  user: await buildProfile(user),
  permissions: getPermissionsForRole(user.role),
});

const issueEmailVerification = async (user) => {
  const token = crypto.randomUUID();
  await redisClient.set(`auth:verify-email:${token}`, user.id, 'EX', 24 * 60 * 60);
  await sendEmail({
    to: user.email,
    subject: 'Verify your EDUOVA email',
    html: `<p>Use this verification token: <strong>${token}</strong></p>`,
  });
  return token;
};

const verifyEmail = async ({ token }) => {
  const userId = await redisClient.get(`auth:verify-email:${token}`);
  if (!userId) {
    throw Object.assign(new Error('Invalid or expired email verification token.'), { status: 400 });
  }

  const user = await models.User.findByPk(userId);
  await user.update({ email_verified: true });
  await redisClient.del(`auth:verify-email:${token}`);

  logger.info('Email verified', { user_id: user.id });

  return { success: true };
};

const setupTwoFactor = async (user) => {
  const secret = speakeasy.generateSecret({ name: `EDUOVA (${user.email})` });
  await user.update({ '2fa_secret': secret.base32, '2fa_enabled': false });

  const qr_code = await QRCode.toDataURL(secret.otpauth_url);

  logger.info('2FA setup initiated', { user_id: user.id });

  return {
    secret: secret.base32,
    qr_code,
  };
};

const verifyTwoFactor = async ({ user, code }) => {
  const verified = speakeasy.totp.verify({
    secret: user['2fa_secret'],
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!verified) {
    throw Object.assign(new Error('Invalid two-factor code.'), { status: 400 });
  }

  await user.update({ '2fa_enabled': true });
  logger.info('2FA enabled', { user_id: user.id });

  return { success: true };
};

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
  issueEmailVerification,
  verifyEmail,
  setupTwoFactor,
  verifyTwoFactor,
};
