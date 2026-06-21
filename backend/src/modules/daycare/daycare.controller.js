const daycareService = require('./daycare.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  getPresentNow: wrap((req) => daycareService.listPresentNow({ institutionId: req.institutionId })),
  addMilestone: async (req, res) => {
    const data = await daycareService.addMilestone({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  getMilestones: wrap((req) => daycareService.getMilestones({ studentId: req.params.studentId })),
  authorizePickup: async (req, res) => {
    const data = await daycareService.authorizePickup({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  verifyPickup: wrap((req) =>
    daycareService.verifyPickup({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
};
