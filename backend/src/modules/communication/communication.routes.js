const express = require('express');

const controller = require('./communication.controller');
const { authenticate, authorize, institutionGuard, resolveInstitution } = require('../auth/auth.middleware');

const router = express.Router();

router.use(authenticate, resolveInstitution, institutionGuard);

router.post(
  '/notifications/send',
  authorize(['super_admin', 'institution_admin', 'teacher'], 'communication:write'),
  controller.sendNotification
);
router.post(
  '/notifications/broadcast',
  authorize(['super_admin', 'institution_admin'], 'communication:write'),
  controller.broadcast
);
router.get('/notifications/my', controller.getInbox);
router.put('/notifications/:id/read', controller.markAsRead);
router.get('/notifications/unread-count', controller.unreadCount);

router.post(
  '/announcements',
  authorize(['super_admin', 'institution_admin', 'teacher'], 'communication:write'),
  controller.createAnnouncement
);
router.get('/announcements', controller.listAnnouncements);
router.get('/announcements/:id', controller.getAnnouncement);
router.put(
  '/announcements/:id/publish',
  authorize(['super_admin', 'institution_admin'], 'communication:write'),
  controller.publishAnnouncement
);

router.post('/messages', controller.sendMessage);
router.get('/messages/threads', controller.listThreads);
router.get('/messages/threads/:id', controller.getThreadMessages);
router.delete('/messages/:id', controller.deleteMessage);

module.exports = router;
