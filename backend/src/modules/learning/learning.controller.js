const learningService = require('./learning.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  listCourses: wrap((req) =>
    learningService.listCourses({
      institutionId: req.institutionId,
      role: req.user.role,
      userId: req.user.id,
    })
  ),
  listMaterials: wrap((req) =>
    learningService.listMaterials({
      institutionId: req.institutionId,
      role: req.user.role,
      userId: req.user.id,
      query: req.query,
    })
  ),
  createMaterial: async (req, res) => {
    const data = await learningService.createMaterial({
      institutionId: req.institutionId,
      user: req.user,
      payload: req.body,
    });
    res.status(201).json({ success: true, data });
  },
  listAssessments: wrap((req) =>
    learningService.listAssessments({
      institutionId: req.institutionId,
      role: req.user.role,
      userId: req.user.id,
      query: req.query,
    })
  ),
  createAssessment: async (req, res) => {
    const data = await learningService.createAssessment({
      institutionId: req.institutionId,
      user: req.user,
      payload: req.body,
    });
    res.status(201).json({ success: true, data });
  },
  listAssessmentSubmissions: wrap((req) =>
    learningService.listAssessmentSubmissions({
      institutionId: req.institutionId,
      assessmentId: req.params.id,
    })
  ),
  submitAssessment: async (req, res) => {
    const data = await learningService.submitAssessment({
      institutionId: req.institutionId,
      userId: req.user.id,
      assessmentId: req.params.id,
      payload: req.body,
    });
    res.status(201).json({ success: true, data });
  },
  gradeSubmission: wrap((req) =>
    learningService.gradeSubmission({
      institutionId: req.institutionId,
      submissionId: req.params.id,
      payload: req.body,
      user: req.user,
    })
  ),
  listMyResults: wrap((req) =>
    learningService.listMyResults({
      institutionId: req.institutionId,
      userId: req.user.id,
    })
  ),
};
