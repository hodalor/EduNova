const analyticsService = require('./analytics.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  getOverview: wrap((req) =>
    analyticsService.getOverview({
      institutionId: req.institutionId,
      params: req.query,
    })
  ),
  getRevenue: wrap((req) =>
    analyticsService.getRevenue({
      institutionId: req.institutionId,
      params: req.query,
    })
  ),
  getPerformance: wrap((req) =>
    analyticsService.getPerformance({
      institutionId: req.institutionId,
      params: req.query,
    })
  ),
  getAttendanceRate: wrap((req) =>
    analyticsService.getAttendanceRate({
      institutionId: req.institutionId,
      params: req.query,
    })
  ),
  getEnrollmentTrend: wrap((req) =>
    analyticsService.getEnrollmentTrend({
      institutionId: req.institutionId,
      params: req.query,
    })
  ),
  getActiveAlerts: wrap((req) =>
    analyticsService.getActiveAlerts({
      institutionId: req.institutionId,
      params: req.query,
    })
  ),
};
