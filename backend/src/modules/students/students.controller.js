const { models } = require('../../config/database');
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
      parentId: req.user.role === 'parent' ? req.query.parent_id || req.user.id : req.query.parent_id,
    })
  ),
  listDeletedStudents: wrap((req) =>
    studentsService.listDeletedStudents({
      institutionId: req.institutionId,
    })
  ),
  getStudent: wrap(async (req) => {
    if (req.user?.role === 'student') {
      const linkedStudent = models.Student
        ? await models.Student.findOne({
            where: { user_id: req.user.id, institution_id: req.institutionId },
            attributes: ['id'],
          }).catch(() => null)
        : null;

      if (!linkedStudent || String(linkedStudent.id) !== String(req.params.studentId)) {
        throw Object.assign(new Error('You can only view your own student record.'), {
          statusCode: 403,
        });
      }
    }

    return studentsService.getStudent({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
    });
  }),
  updateStudent: wrap((req) =>
    studentsService.updateStudent({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
      payload: req.body,
      actorId: req.user.id,
      ip: req.ip,
    })
  ),
  deleteStudent: wrap((req) =>
    studentsService.deleteStudent({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
      actor: req.user,
      ip: req.ip,
    })
  ),
  restoreStudent: wrap((req) =>
    studentsService.restoreStudent({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
      actor: req.user,
      ip: req.ip,
    })
  ),
  permanentlyDeleteStudent: wrap((req) =>
    studentsService.permanentlyDeleteStudent({
      institutionId: req.institutionId,
      studentId: req.params.studentId,
      actor: req.user,
      ip: req.ip,
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
      actorId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({
      success: true,
      data,
    });
  },
};
