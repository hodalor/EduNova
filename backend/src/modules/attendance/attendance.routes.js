const express = require('express');

const controller = require('./attendance.controller');
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
  enforceSubscriptionAccess('attendance'),
  generalApiRateLimiter
);

router.post('/sessions/:sessionId/mark', controller.markAttendance);
router.put('/sessions/:sessionId/close', controller.closeSession);
router.get('/report', controller.getReport);

module.exports = router;
