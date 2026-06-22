const service = require('./super-admin.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  onboardInstitution: async (req, res) => {
    const data = await service.onboardInstitution({
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  listPlatformUsers: wrap(() => service.listPlatformUsers()),
  createPlatformUser: async (req, res) => {
    const data = await service.createPlatformUser({
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  listInstitutions: wrap(() => service.listInstitutions()),
  getInstitutionDetail: wrap((req) => service.getInstitutionDetail(req.params.id)),
  suspendInstitution: wrap((req) =>
    service.suspendInstitution({
      institutionId: req.params.id,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
  extendTrial: wrap((req) =>
    service.extendTrial({
      institutionId: req.params.id,
      days: req.body.days,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
  getPlatformAnalytics: wrap(() => service.getPlatformAnalytics()),
  getAuditLogs: wrap((req) =>
    service.getPlatformAuditLogs({
      action: req.query.action,
      resourceType: req.query.resource_type,
    })
  ),
};
