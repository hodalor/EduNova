const Queue = require('bull');

const env = require('../../config/env');
const logger = require('../../config/logger');
const { models } = require('../../config/database');
const { getSocketNamespaces } = require('../../shared/helpers/socket');
const channels = require('./communication.channels');

const notificationQueue = new Queue('eduova-notifications', env.REDIS_URL);

const channelHandlers = {
  sms: ({ recipient, notification }) => channels.sendSMS(recipient.phone, notification.body),
  email: ({ recipient, notification }) =>
    channels.sendEmail(recipient.email, notification.title, `<p>${notification.body}</p>`),
  push: ({ recipient, notification }) =>
    channels.sendPush(recipient.device_token, notification.title, notification.body, {
      notification_id: notification.id,
    }),
  whatsapp: ({ recipient, notification }) => channels.sendWhatsApp(recipient.phone, notification.body, {}),
};

notificationQueue.process(async (job) => {
  const { notificationId, recipientIds = [] } = job.data;
  const notification = await models.Notification.findByPk(notificationId);
  if (!notification) {
    return null;
  }

  const recipients = await models.User.findAll({ where: { id: recipientIds } });
  const results = [];

  for (const recipient of recipients) {
    for (const channel of notification.channels || []) {
      const handler = channelHandlers[channel];
      if (!handler) {
        continue;
      }
      try {
        const result = await handler({ recipient, notification });
        results.push({ recipient_id: recipient.id, ...result });
      } catch (error) {
        logger.error('Notification delivery failed', {
          notification_id: notification.id,
          recipient_id: recipient.id,
          channel,
          error: error.message,
        });
        throw error;
      }
    }

    const { notifications } = getSocketNamespaces();
    if (notifications) {
      notifications.to(recipient.id).emit('notification:new', {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        sent_at: new Date().toISOString(),
      });
    }
  }

  await notification.update({ status: 'sent', sent_at: new Date() });
  return results;
});

const enqueueNotification = async ({ notificationId, recipientIds, priority = 'normal' }) => {
  const priorityMap = { urgent: 1, high: 2, normal: 3, low: 4 };

  return notificationQueue.add(
    { notificationId, recipientIds },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      priority: priorityMap[priority] || 3,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};

module.exports = {
  notificationQueue,
  enqueueNotification,
};
