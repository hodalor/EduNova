const attendanceService = require('./attendance.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  markAttendance: async (req, res) => {
    const data = await attendanceService.markAttendance({
      institutionId: req.institutionId,
      sessionId: req.params.sessionId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(201).json({ success: true, data });
  },
  closeSession: wrap((req) =>
    attendanceService.closeSession({
      institutionId: req.institutionId,
      sessionId: req.params.sessionId,
      userId: req.user.id,
      ip: req.ip,
    })
  ),
  getReport: wrap((req) =>
    attendanceService.getReport({
      institutionId: req.institutionId,
    })
  ),
};
