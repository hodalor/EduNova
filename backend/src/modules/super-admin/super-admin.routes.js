const express = require('express');

const controller = require('./super-admin.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');

const router = express.Router();

router.use(authenticate, authorize(['super_admin']), generalApiRateLimiter);

router.get('/users', controller.listPlatformUsers);
router.post('/users', controller.createPlatformUser);
router.post('/institutions', controller.onboardInstitution);
router.get('/institutions', controller.listInstitutions);
router.get('/institutions/:id', controller.getInstitutionDetail);
router.put('/institutions/:id/suspend', controller.suspendInstitution);
router.post('/institutions/:id/trial', controller.extendTrial);
router.get('/analytics', controller.getPlatformAnalytics);
router.get('/audit-logs', controller.getAuditLogs);

module.exports = router;
