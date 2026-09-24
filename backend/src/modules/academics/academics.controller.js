const academicsService = require('./academics.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  listAcademicStructure: wrap((req) =>
    academicsService.listAcademicStructure({
      institutionId: req.institutionId,
      levelCode: req.query.level_code,
    })
  ),
  createAcademicGroup: async (req, res) => {
    const data = await academicsService.createAcademicGroup({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  updateAcademicGroup: wrap((req) =>
    academicsService.updateAcademicGroup({
      institutionId: req.institutionId,
      groupId: req.params.id,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    })
  ),
  deleteAcademicGroup: wrap((req) =>
    academicsService.deleteAcademicGroup({
      institutionId: req.institutionId,
      groupId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
  createAcademicPeriod: async (req, res) => {
    const data = await academicsService.createAcademicPeriod({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  updateAcademicPeriod: wrap((req) =>
    academicsService.updateAcademicPeriod({
      institutionId: req.institutionId,
      periodId: req.params.id,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    })
  ),
  deleteAcademicPeriod: wrap((req) =>
    academicsService.deleteAcademicPeriod({
      institutionId: req.institutionId,
      periodId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
  createAcademicOffering: async (req, res) => {
    const data = await academicsService.createAcademicOffering({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  updateAcademicOffering: wrap((req) =>
    academicsService.updateAcademicOffering({
      institutionId: req.institutionId,
      offeringId: req.params.id,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    })
  ),
  deleteAcademicOffering: wrap((req) =>
    academicsService.deleteAcademicOffering({
      institutionId: req.institutionId,
      offeringId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
  listAssessments: wrap((req) =>
    academicsService.listAssessments({
      institutionId: req.institutionId,
    })
  ),
  getGradebook: wrap((req) =>
    academicsService.getGradebook({
      institutionId: req.institutionId,
    })
  ),
  saveScores: async (req, res) => {
    const data = await academicsService.saveScores({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  getReportCards: wrap((req) =>
    academicsService.getReportCards({
      institutionId: req.institutionId,
    })
  ),
  publishReportCard: wrap((req) =>
    academicsService.publishReportCard({
      institutionId: req.institutionId,
      reportCardId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
  getRanking: wrap((req) =>
    academicsService.getRanking({
      className: req.query.class_name,
    })
  ),
};
