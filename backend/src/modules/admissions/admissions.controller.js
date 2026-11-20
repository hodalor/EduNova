const admissionsService = require('./admissions.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  getPublicCatalog: wrap((req) => admissionsService.getPublicCatalog({ code: req.params.code })),
  submitApplication: wrap((req) =>
    admissionsService.submitApplication({
      code: req.params.code,
      payload: req.body,
    })
  ),
  listApplications: wrap((req) =>
    admissionsService.listApplications({
      institutionId: req.institutionId,
    })
  ),
  getApplication: wrap((req) =>
    admissionsService.getApplication({
      institutionId: req.institutionId,
      applicationId: req.params.id,
    })
  ),
  admitApplication: wrap((req) =>
    admissionsService.admitApplication({
      institutionId: req.institutionId,
      applicationId: req.params.id,
      userId: req.user?.id,
    })
  ),
};
