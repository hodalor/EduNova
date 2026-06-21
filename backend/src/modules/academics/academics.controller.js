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
  createAcademicPeriod: async (req, res) => {
    const data = await academicsService.createAcademicPeriod({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  createAcademicOffering: async (req, res) => {
    const data = await academicsService.createAcademicOffering({
      institutionId: req.institutionId,
      userId: req.user.id,
      payload: req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
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
