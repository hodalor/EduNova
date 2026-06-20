const communicationService = require('./communication.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req, res),
  });

module.exports = {
  sendNotification: wrap((req) =>
    communicationService.sendNotification({
      institutionId: req.institutionId,
      senderId: req.user.id,
      payload: req.body,
    })
  ),
  broadcast: wrap((req) =>
    communicationService.broadcast({
      institutionId: req.institutionId,
      senderId: req.user.id,
      payload: req.body,
    })
  ),
  getInbox: wrap((req) =>
    communicationService.getInbox({
      user: req.user,
      query: req.query,
    })
  ),
  markAsRead: wrap((req) =>
    communicationService.markAsRead({
      id: req.params.id,
      user: req.user,
    })
  ),
  unreadCount: wrap((req) => communicationService.unreadCount({ user: req.user })),
  createAnnouncement: wrap((req) =>
    communicationService.createAnnouncement({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
    })
  ),
  listAnnouncements: wrap((req) =>
    communicationService.listAnnouncements({
      institutionId: req.institutionId,
    })
  ),
  getAnnouncement: wrap((req) =>
    communicationService.getAnnouncement({
      institutionId: req.institutionId,
      id: req.params.id,
    })
  ),
  publishAnnouncement: wrap((req) =>
    communicationService.publishAnnouncement({
      institutionId: req.institutionId,
      id: req.params.id,
    })
  ),
  sendMessage: wrap((req) =>
    communicationService.sendMessage({
      institutionId: req.institutionId,
      senderId: req.user.id,
      payload: req.body,
    })
  ),
  listThreads: wrap((req) =>
    communicationService.listThreads({
      institutionId: req.institutionId,
      userId: req.user.id,
    })
  ),
  getThreadMessages: wrap((req) =>
    communicationService.getThreadMessages({
      institutionId: req.institutionId,
      threadId: req.params.id,
      userId: req.user.id,
    })
  ),
  deleteMessage: wrap((req) =>
    communicationService.deleteMessage({
      institutionId: req.institutionId,
      id: req.params.id,
      userId: req.user.id,
    })
  ),
};
