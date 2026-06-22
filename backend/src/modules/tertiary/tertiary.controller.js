const tertiaryService = require('./tertiary.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  getOverview: wrap((req) =>
    tertiaryService.getOverview({ institutionId: req.institutionId })
  ),
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
  listFaculties: wrap((req) =>
    tertiaryService.listFaculties({ institutionId: req.institutionId })
  ),
  createFaculty: async (req, res) => {
    const data = await tertiaryService.createFaculty({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
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
  createProgram: async (req, res) => {
    const data = await tertiaryService.createProgram({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
};
