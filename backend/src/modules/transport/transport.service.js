const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');
const socketService = require('../notifications/socket.service');

const listVehicles = async ({ institutionId }) =>
  store.transport.vehicles.filter((vehicle) => vehicle.institution_id === institutionId);

const getVehicleLocation = async ({ institutionId, vehicleId }) => {
  const vehicle = store.transport.vehicles.find(
    (item) => item.vehicle_id === vehicleId && item.institution_id === institutionId
  );
  if (!vehicle) {
    throw Object.assign(new Error('Vehicle not found.'), { statusCode: 404 });
  }
  return vehicle;
};

const updateGpsLocation = async ({ institutionId, vehicleId, payload, userId, ip }) => {
  const vehicle = await getVehicleLocation({ institutionId, vehicleId });
  const previous = { ...vehicle };

  vehicle.lat = Number(payload.lat);
  vehicle.lng = Number(payload.lng);
  vehicle.speed = Number(payload.speed || vehicle.speed || 0);
  vehicle.next_stop = payload.next_stop || vehicle.next_stop;
  vehicle.eta = payload.eta || vehicle.eta;
  vehicle.updated_at = new Date().toISOString();

  socketService.emitBusLocationUpdate({
    vehicleId,
    payload: {
      vehicle_id: vehicle.vehicle_id,
      lat: vehicle.lat,
      lng: vehicle.lng,
      speed: vehicle.speed,
      next_stop: vehicle.next_stop,
      eta: vehicle.eta,
      updated_at: vehicle.updated_at,
      student_stop: vehicle.student_stop,
    },
  });

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'transport_vehicle_gps',
    resourceId: vehicle.vehicle_id,
    oldValues: previous,
    newValues: vehicle,
    ip,
  });

  return vehicle;
};

module.exports = {
  listVehicles,
  getVehicleLocation,
  updateGpsLocation,
};
