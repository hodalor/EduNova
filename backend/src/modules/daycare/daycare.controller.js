const daycareService = require('./daycare.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  getPresentNow: wrap((req) => daycareService.getOverview({ institutionId: req.institutionId })),
  createClass: async (req, res) => {
    const data = await daycareService.createClass({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  updateClass: async (req, res) => {
    const data = await daycareService.updateClass({
      institutionId: req.institutionId,
      userId: req.user.id,
      classId: req.params.classId,
      payload: req.body,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
  },
  deleteClass: wrap((req) =>
    daycareService.deleteClass({
      institutionId: req.institutionId,
      userId: req.user.id,
      classId: req.params.classId,
      ip: req.ip,
    })
  ),
  createPolicy: async (req, res) => {
    const data = await daycareService.createPolicy({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  deletePolicy: wrap((req) =>
    daycareService.deletePolicy({
      institutionId: req.institutionId,
      userId: req.user.id,
      index: req.params.index,
      ip: req.ip,
    })
  ),
  createMilestoneBand: async (req, res) => {
    const data = await daycareService.createMilestoneBand({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  deleteMilestoneBand: wrap((req) =>
    daycareService.deleteMilestoneBand({
      institutionId: req.institutionId,
      userId: req.user.id,
      id: req.params.id,
      ip: req.ip,
    })
  ),
  updateSettings: async (req, res) => {
    const data = await daycareService.updateSettings({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
  },
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
