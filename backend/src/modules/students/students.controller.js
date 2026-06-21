const studentsService = require('./students.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  listStudents: wrap((req) =>
    studentsService.listStudents({
      institutionId: req.institutionId,
      parentId: req.query.parent_id || req.user.id,
    })
  ),
  getStudent: wrap((req) =>
    studentsService.getStudent({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
    })
  ),
  getRoster: wrap((req) =>
    studentsService.getRoster({
      classId: req.query.class_id,
    })
  ),
  createStudent: async (req, res) => {
    const data = await studentsService.createStudent({
      institutionId: req.institutionId,
      payload: req.body,
    });
    res.status(201).json({
      success: true,
      data,
    });
  },
};
