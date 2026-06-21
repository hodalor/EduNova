const transportService = require('./transport.service');

const wrap = (handler) => async (req, res) =>
  res.json({
    success: true,
    data: await handler(req),
  });

module.exports = {
  listVehicles: wrap((req) =>
    transportService.listVehicles({
      institutionId: req.institutionId,
    })
  ),
  getVehicleLocation: wrap((req) =>
    transportService.getVehicleLocation({
      institutionId: req.institutionId,
      vehicleId: req.params.vehicleId,
    })
  ),
  updateGpsLocation: async (req, res) => {
    const data = await transportService.updateGpsLocation({
      institutionId: req.institutionId,
      vehicleId: req.params.vehicleId,
      payload: req.body,
      userId: req.user.id,
      ip: req.ip,
    });
    res.status(200).json({ success: true, data });
  },
};
