const express = require('express');

const controller = require('./academics.controller');
const { authenticate, resolveInstitution, institutionGuard } = require('../auth/auth.middleware');
const { withCacheHeaders } = require('../../shared/middleware/cacheHeaders');
const { blockSuperAdminInstitutionAccess } = require('../../shared/middleware/privacy-guard');
const { generalApiRateLimiter, reportGenerationRateLimiter } = require('../../shared/middleware/rateLimits');
const { enforceSubscriptionAccess } = require('../../shared/middleware/subscription-enforcement');

const router = express.Router();

router.use(
  authenticate,
  resolveInstitution,
  institutionGuard,
  blockSuperAdminInstitutionAccess,
  enforceSubscriptionAccess('academics'),
  generalApiRateLimiter
);

router.get('/structure', controller.listAcademicStructure);
router.post('/groups', controller.createAcademicGroup);
router.post('/periods', controller.createAcademicPeriod);
router.post('/offerings', controller.createAcademicOffering);
router.post('/scores', controller.saveScores);
router.get('/report-cards', withCacheHeaders({ maxAge: 86400, immutable: true }), controller.getReportCards);
router.put('/report-cards/:id/publish', reportGenerationRateLimiter, controller.publishReportCard);
router.get('/ranking', controller.getRanking);

module.exports = router;
