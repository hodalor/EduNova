const { Op } = require('sequelize');

const { models } = require('../../config/database');
const logger = require('../../config/logger');
const eventBus = require('../../shared/helpers/events');
const { parsePagination, successMeta } = require('../../shared/helpers/common');
const { enqueueNotification } = require('./notification.queue');

const pickRecipients = async ({ institutionId, roles = [], targetIds = [] }) => {
  const where = { institution_id: institutionId };

  if (targetIds.length) {
    where.id = { [Op.in]: targetIds };
  }
  if (roles.length) {
    where.role = { [Op.in]: roles };
  }

  return models.User.findAll({ where });
};

const saveAndDispatch = async ({
  institutionId,
  senderId,
  title,
  body,
  type,
  targetRoles = [],
  targetIds = [],
  channels = ['email'],
  priority = 'normal',
}) => {
  const recipients = await pickRecipients({ institutionId, roles: targetRoles, targetIds });
  const notification = await models.Notification.create({
    institution_id: institutionId,
    sender_id: senderId,
    title,
    body,
    type,
    target_roles: targetRoles,
    target_ids: recipients.map((item) => item.id),
    channels,
    status: 'queued',
  });

  await enqueueNotification({
    notificationId: notification.id,
    recipientIds: recipients.map((item) => item.id),
    priority,
  });

  logger.info('Notification queued', {
    notification_id: notification.id,
    recipients: recipients.length,
  });

  return notification;
};

const sendNotification = async ({ institutionId, senderId, payload }) =>
  saveAndDispatch({ institutionId, senderId, ...payload });

const broadcast = async ({ institutionId, senderId, payload }) =>
  saveAndDispatch({ institutionId, senderId, ...payload, targetIds: [] });

const getInbox = async ({ user, query }) => {
  const { page, limit, offset } = parsePagination(query);
  const where = {
    institution_id: user.institution_id,
    [Op.or]: [
      { target_ids: { [Op.contains]: [user.id] } },
      { target_roles: { [Op.contains]: [user.role] } },
    ],
  };

  const { rows, count } = await models.Notification.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    data: rows,
    meta: successMeta(count, page, limit),
  };
};

const markAsRead = async ({ id }) => ({ id, success: true });

const unreadCount = async ({ user }) => {
  const unread = await models.Notification.count({
    where: {
      institution_id: user.institution_id,
      [Op.or]: [
        { target_ids: { [Op.contains]: [user.id] } },
        { target_roles: { [Op.contains]: [user.role] } },
      ],
    },
  });

  return { unread };
};

const createAnnouncement = async ({ institutionId, userId, payload }) =>
  models.Announcement.create({
    institution_id: institutionId,
    created_by: userId,
    ...payload,
  });

const listAnnouncements = async ({ institutionId }) =>
  models.Announcement.findAll({
    where: { institution_id: institutionId },
    order: [['publish_at', 'DESC']],
  });

const getAnnouncement = async ({ institutionId, id }) =>
  models.Announcement.findOne({
    where: { institution_id: institutionId, id },
  });

const publishAnnouncement = async ({ institutionId, id }) => {
  const announcement = await getAnnouncement({ institutionId, id });
  if (!announcement) {
    throw Object.assign(new Error('Announcement not found.'), { status: 404 });
  }
  await announcement.update({ is_published: true, publish_at: new Date() });
  return announcement;
};

const sendMessage = async ({ institutionId, senderId, payload }) =>
  models.Message.create({
    institution_id: institutionId,
    sender_id: senderId,
    ...payload,
  });

const listThreads = async ({ institutionId, userId }) =>
  models.Message.findAll({
    where: {
      institution_id: institutionId,
      [Op.or]: [{ sender_id: userId }, { recipient_id: userId }],
    },
    order: [['created_at', 'DESC']],
  });

const getThreadMessages = async ({ institutionId, threadId, userId }) =>
  models.Message.findAll({
    where: {
      institution_id: institutionId,
      thread_id: threadId,
      [Op.or]: [{ sender_id: userId }, { recipient_id: userId }],
    },
    order: [['created_at', 'ASC']],
  });

const deleteMessage = async ({ institutionId, id, userId }) => {
  const message = await models.Message.findOne({
    where: { institution_id: institutionId, id },
  });
  if (!message) {
    throw Object.assign(new Error('Message not found.'), { status: 404 });
  }

  if (message.sender_id === userId) {
    await message.update({ is_deleted_by_sender: true });
  }
  if (message.recipient_id === userId) {
    await message.update({ is_deleted_by_recipient: true });
  }

  return { success: true };
};

const registerEventSubscribers = () => {
  const subscriptions = {
    'student.absent': ({ institutionId, parentIds, studentName }) =>
      saveAndDispatch({
        institutionId,
        senderId: null,
        title: 'Student Absence Alert',
        body: `${studentName} was marked absent today.`,
        type: 'attendance',
        targetIds: parentIds,
        channels: ['sms', 'push'],
        priority: 'urgent',
      }),
    'payment.received': ({ institutionId, parentIds, amount, receiptNumber }) =>
      saveAndDispatch({
        institutionId,
        senderId: null,
        title: 'Payment Received',
        body: `Payment of ${amount} received. Receipt ${receiptNumber}.`,
        type: 'finance',
        targetIds: parentIds,
        channels: ['sms', 'email'],
        priority: 'high',
      }),
    'invoice.overdue': ({ institutionId, parentIds, invoiceNumber }) =>
      saveAndDispatch({
        institutionId,
        senderId: null,
        title: 'Invoice Overdue',
        body: `Invoice ${invoiceNumber} is overdue. Please make payment.`,
        type: 'finance',
        targetIds: parentIds,
        channels: ['sms'],
        priority: 'high',
      }),
    'result.published': ({ institutionId, recipientIds }) =>
      saveAndDispatch({
        institutionId,
        senderId: null,
        title: 'Report Card Published',
        body: 'A new report card has been published.',
        type: 'academics',
        targetIds: recipientIds,
        channels: ['push', 'email'],
        priority: 'normal',
      }),
    'discipline.incident': ({ institutionId, parentIds }) =>
      saveAndDispatch({
        institutionId,
        senderId: null,
        title: 'Discipline Notice',
        body: 'A discipline incident has been recorded for your ward.',
        type: 'discipline',
        targetIds: parentIds,
        channels: ['sms'],
        priority: 'high',
      }),
    'bus.departed': ({ institutionId, parentIds, eta }) =>
      saveAndDispatch({
        institutionId,
        senderId: null,
        title: 'Bus Departed',
        body: `School bus departed. ETA ${eta}.`,
        type: 'transport',
        targetIds: parentIds,
        channels: ['push'],
        priority: 'normal',
      }),
    'exam.scheduled': ({ institutionId, recipientIds, message }) =>
      saveAndDispatch({
        institutionId,
        senderId: null,
        title: 'Entrance Exam Scheduled',
        body: message,
        type: 'admissions',
        targetIds: recipientIds,
        channels: ['email', 'sms'],
        priority: 'normal',
      }),
  };

  Object.entries(subscriptions).forEach(([eventName, handler]) => {
    eventBus.on(eventName, async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error('Communication event handling failed', {
          eventName,
          error: error.message,
        });
      }
    });
  });
};

module.exports = {
  sendNotification,
  broadcast,
  getInbox,
  markAsRead,
  unreadCount,
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  publishAnnouncement,
  sendMessage,
  listThreads,
  getThreadMessages,
  deleteMessage,
  registerEventSubscribers,
  saveAndDispatch,
};
