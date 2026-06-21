const tertiaryService = require('./tertiary.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  getStudentRegistrationState: wrap((req) =>
    tertiaryService.getStudentRegistrationState({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
    })
  ),
  registerCourses: async (req, res) => {
    const data = await tertiaryService.registerCourses({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  getTranscript: wrap((req) =>
    tertiaryService.getTranscript({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
    })
  ),
  listDepartments: wrap((req) =>
    tertiaryService.listDepartments({ institutionId: req.institutionId })
  ),
  createDepartment: async (req, res) => {
    const data = await tertiaryService.createDepartment({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  listPrograms: wrap((req) =>
    tertiaryService.listPrograms({ institutionId: req.institutionId })
  ),
};
