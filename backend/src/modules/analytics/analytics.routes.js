const express = require('express');

const controller = require('./analytics.controller');
const { authenticate, resolveInstitution, institutionGuard } = require('../auth/auth.middleware');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');

const router = express.Router();

router.use(authenticate, resolveInstitution, institutionGuard, generalApiRateLimiter);

router.get('/overview', controller.getOverview);
router.get('/finance/revenue', controller.getRevenue);
router.get('/academics/performance', controller.getPerformance);
router.get('/attendance/rate', controller.getAttendanceRate);
router.get('/enrollment-trend', controller.getEnrollmentTrend);
router.get('/alerts/active', controller.getActiveAlerts);

module.exports = router;
