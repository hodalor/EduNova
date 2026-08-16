const express = require('express');

const controller = require('./daycare.controller');
const { authenticate, resolveInstitution, institutionGuard } = require('../auth/auth.middleware');
const { blockSuperAdminInstitutionAccess } = require('../../shared/middleware/privacy-guard');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');

const router = express.Router();

router.use(
  authenticate,
  resolveInstitution,
  institutionGuard,
  blockSuperAdminInstitutionAccess,
  generalApiRateLimiter
);

router.get('/present-now', controller.getPresentNow);

router.post('/classes', controller.createClass);
router.patch('/classes/:classId', controller.updateClass);
router.delete('/classes/:classId', controller.deleteClass);

router.post('/policies', controller.createPolicy);
router.delete('/policies/:index', controller.deletePolicy);

router.post('/milestone-bands', controller.createMilestoneBand);
router.delete('/milestone-bands/:id', controller.deleteMilestoneBand);

router.patch('/settings', controller.updateSettings);

router.post('/milestone/:studentId', controller.addMilestone);
router.get('/milestones/:studentId', controller.getMilestones);
router.post('/pickup/authorize', controller.authorizePickup);
router.post('/pickup/verify', controller.verifyPickup);

module.exports = router;
