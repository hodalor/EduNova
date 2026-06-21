const express = require('express');

const controller = require('./transport.controller');
const { authenticate, resolveInstitution, institutionGuard } = require('../auth/auth.middleware');
const { blockSuperAdminInstitutionAccess } = require('../../shared/middleware/privacy-guard');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');
const { enforceSubscriptionAccess } = require('../../shared/middleware/subscription-enforcement');

const router = express.Router();

router.use(
  authenticate,
  resolveInstitution,
  institutionGuard,
  blockSuperAdminInstitutionAccess,
  enforceSubscriptionAccess('transport'),
  generalApiRateLimiter
);

router.get('/vehicles', controller.listVehicles);
router.get('/vehicles/:vehicleId/location', controller.getVehicleLocation);
router.put('/vehicles/:vehicleId/gps', controller.updateGpsLocation);

module.exports = router;
