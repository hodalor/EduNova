const { models } = require('../../config/database');
const tertiaryService = require('./tertiary.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

const ensureStudentOwnsRecord = async (req, studentId) => {
  if (req.user?.role !== 'student') {
    return;
  }

  const student = await models.Student.findOne({
    where: { user_id: req.user.id },
    attributes: ['id'],
  });

  if (!student || String(student.id) !== String(studentId)) {
    throw Object.assign(new Error('Students can only access their own registration profile.'), {
      status: 403,
    });
  }
};

module.exports = {
  getOverview: wrap((req) =>
    tertiaryService.getOverview({ institutionId: req.institutionId })
  ),
  getStudentRegistrationState: wrap(async (req) => {
    await ensureStudentOwnsRecord(req, req.params.studentId);
    return tertiaryService.getStudentRegistrationState({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
    });
  }),
  registerCourses: async (req, res) => {
    await ensureStudentOwnsRecord(req, req.body.student_id);
    const data = await tertiaryService.registerCourses({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  getTranscript: wrap(async (req) => {
    await ensureStudentOwnsRecord(req, req.params.studentId);
    return tertiaryService.getTranscript({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
    });
  }),
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
  updateFaculty: async (req, res) => {
    const data = await tertiaryService.updateFaculty({
      institutionId: req.institutionId,
      facultyId: req.params.id,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
  },
  deleteFaculty: async (req, res) => {
    const data = await tertiaryService.deleteFaculty({
      institutionId: req.institutionId,
      facultyId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
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
  updateDepartment: async (req, res) => {
    const data = await tertiaryService.updateDepartment({
      institutionId: req.institutionId,
      departmentId: req.params.id,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
  },
  deleteDepartment: async (req, res) => {
    const data = await tertiaryService.deleteDepartment({
      institutionId: req.institutionId,
      departmentId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
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
  updateProgram: async (req, res) => {
    const data = await tertiaryService.updateProgram({
      institutionId: req.institutionId,
      programId: req.params.id,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
  },
  deleteProgram: async (req, res) => {
    const data = await tertiaryService.deleteProgram({
      institutionId: req.institutionId,
      programId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
  },
  updateProgressionPolicy: async (req, res) => {
    const data = await tertiaryService.updateProgressionPolicy({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
  },
  updateFinancePolicy: async (req, res) => {
    const data = await tertiaryService.updateFinancePolicy({
      institutionId: req.institutionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
  },
  updateStudentProgress: async (req, res) => {
    const data = await tertiaryService.updateStudentProgress({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.json({ success: true, data });
  },
};
