const express = require('express');

const timetableService = require('./timetable.service');
const { authenticate, resolveInstitution, institutionGuard } = require('../auth/auth.middleware');
const { withCacheHeaders } = require('../../shared/middleware/cacheHeaders');
const { blockSuperAdminInstitutionAccess } = require('../../shared/middleware/privacy-guard');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');
const { enforceSubscriptionAccess } = require('../../shared/middleware/subscription-enforcement');

const router = express.Router();

router.use(
  authenticate,
  resolveInstitution,
  institutionGuard,
  blockSuperAdminInstitutionAccess,
  enforceSubscriptionAccess('timetable'),
  generalApiRateLimiter
);

router.get('/', withCacheHeaders({ maxAge: 3600 }), async (_req, res) => {
  res.json({
    success: true,
    data: await timetableService.listTimetable(),
  });
});

module.exports = router;
