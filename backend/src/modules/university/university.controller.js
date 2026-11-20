const universityService = require('./university.service');
const exams = require('./university.exams');

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
  resultTemplate: async (req, res, next) => {
    try {
      const file = await exams.resultTemplate({ offeringId: req.query.offering_id });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.csv);
    } catch (error) {
      next(error);
    }
  },
  previewResults: wrap((req) => exams.previewResults({ payload: req.body })),
  commitResults: wrap((req) => exams.commitResults({ user: req.user, payload: req.body })),
  listPendingResults: wrap(() => exams.listPendingResults()),
  approveResults: wrap((req) => exams.approveResults({ batchId: req.params.batchId })),
  saveWindow: wrap((req) => exams.saveWindow({ payload: req.body })),
  extendWindow: wrap((req) => exams.extendWindow({ windowId: req.params.id, extendedUntil: req.body.extended_until })),
  examBoard: wrap((req) => exams.examBoard({ user: req.user })),
  saveSitting: wrap((req) => exams.saveSitting({ payload: req.body, collection: req.body.collection })),
  removeSitting: wrap((req) => exams.removeSitting({ id: req.params.id, collection: req.query.collection })),
  examDocket: wrap((req) => exams.examDocket({ user: req.user, studentId: req.query.student_id })),
  confirmationSlip: wrap((req) => exams.confirmationSlip({ user: req.user, studentId: req.query.student_id })),
  lectureTimetable: wrap((req) => exams.lectureTimetableForStudent({ user: req.user })),
};
