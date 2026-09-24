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
router.put('/groups/:id', controller.updateAcademicGroup);
router.delete('/groups/:id', controller.deleteAcademicGroup);
router.post('/periods', controller.createAcademicPeriod);
router.put('/periods/:id', controller.updateAcademicPeriod);
router.delete('/periods/:id', controller.deleteAcademicPeriod);
router.post('/offerings', controller.createAcademicOffering);
router.put('/offerings/:id', controller.updateAcademicOffering);
router.delete('/offerings/:id', controller.deleteAcademicOffering);
router.get('/assessments', controller.listAssessments);
router.get('/gradebook', controller.getGradebook);
router.post('/scores', controller.saveScores);
router.get('/report-cards', withCacheHeaders({ maxAge: 86400, immutable: true }), controller.getReportCards);
router.put('/report-cards/:id/publish', reportGenerationRateLimiter, controller.publishReportCard);
router.get('/ranking', controller.getRanking);

module.exports = router;
