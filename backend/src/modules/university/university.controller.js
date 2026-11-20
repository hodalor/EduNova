const universityService = require('./university.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  listIntakes: wrap(() => universityService.listIntakes()),
  createIntake: wrap((req) => universityService.createIntake({ payload: req.body })),
  deleteIntake: wrap((req) => universityService.deleteIntake({ intakeId: req.params.id })),
  intakeReport: wrap((req) =>
    universityService.intakeReport({
      intakeId: req.query.intake_id,
      years: req.query.years,
    })
  ),
  listNotices: wrap((req) => universityService.listNotices({ user: req.user })),
  createNotice: wrap((req) => universityService.createNotice({ user: req.user, payload: req.body })),
  listBlasts: wrap(() => universityService.listBlasts()),
  sendBlast: wrap((req) => universityService.sendBlast({ user: req.user, payload: req.body })),
  listResults: wrap((req) => universityService.listResults({ user: req.user })),
  recordResult: wrap((req) => universityService.recordResult({ user: req.user, payload: req.body })),
  updateWeights: wrap((req) => universityService.updateWeights({ payload: req.body })),
};
