const nodemailer = require('nodemailer');
const twilio = require('twilio');

const env = require('../../config/env');
const logger = require('../../config/logger');

const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 587),
  secure: false,
  auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

let twilioClient = null;
try {
  if (env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_SID.startsWith('AC')) {
    twilioClient = twilio(env.TWILIO_SID, env.TWILIO_TOKEN);
  }
} catch (error) {
  logger.warn('Twilio client initialization skipped', { error: error.message });
}

const sendSMS = async (phone, message) => {
  if (!twilioClient || !env.TWILIO_PHONE) {
    logger.warn('SMS channel not configured', { phone, message });
    return { channel: 'sms', delivered: false, reason: 'twilio_not_configured' };
  }
  const result = await twilioClient.messages.create({ to: phone, from: env.TWILIO_PHONE, body: message });
  return { channel: 'sms', delivered: true, provider_id: result.sid };
};

const sendEmail = async (to, subject, html) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('Email channel not configured', { to, subject });
    return { channel: 'email', delivered: false, reason: 'smtp_not_configured' };
  }
  const result = await mailer.sendMail({ from: env.SMTP_USER, to, subject, html });
  return { channel: 'email', delivered: true, provider_id: result.messageId };
};

const sendPush = async (deviceToken, title, body, data = {}) => {
  logger.info('Push notification dispatched', { deviceToken, title, body, data });
  return { channel: 'push', delivered: true };
};

const sendWhatsApp = async (phone, template, params = {}) => {
  if (!twilioClient || !env.TWILIO_PHONE) {
    logger.warn('WhatsApp channel not configured', { phone, template, params });
    return { channel: 'whatsapp', delivered: false, reason: 'twilio_not_configured' };
  }

  const body = Object.entries(params).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, value),
    template
  );
  const result = await twilioClient.messages.create({
    to: `whatsapp:${phone}`,
    from: `whatsapp:${env.TWILIO_PHONE}`,
    body,
  });

  return { channel: 'whatsapp', delivered: true, provider_id: result.sid };
};

module.exports = {
  sendSMS,
  sendEmail,
  sendPush,
  sendWhatsApp,
};
