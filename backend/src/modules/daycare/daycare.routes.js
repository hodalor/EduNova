const express = require('express');

const controller = require('./daycare.controller');
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

router.get('/present-now', controller.getPresentNow);
router.post('/milestone/:studentId', controller.addMilestone);
router.get('/milestones/:studentId', controller.getMilestones);
router.post('/pickup/authorize', controller.authorizePickup);
router.post('/pickup/verify', controller.verifyPickup);

module.exports = router;
