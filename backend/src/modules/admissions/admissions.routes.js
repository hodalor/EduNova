const express = require('express');

const controller = require('./admissions.controller');
const { authenticate, resolveInstitution, institutionGuard, authorize } = require('../auth/auth.middleware');
const { blockSuperAdminInstitutionAccess } = require('../../shared/middleware/privacy-guard');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');

const router = express.Router();

router.get('/public/:code', generalApiRateLimiter, controller.getPublicCatalog);
router.post('/public/:code/applications', generalApiRateLimiter, controller.submitApplication);

router.use(
  authenticate,
  resolveInstitution,
  institutionGuard,
  blockSuperAdminInstitutionAccess,
  generalApiRateLimiter
);

router.get('/applications', authorize(['institution_admin'], 'admissions:read'), controller.listApplications);
router.get('/applications/:id', authorize(['institution_admin'], 'admissions:read'), controller.getApplication);
router.post(
  '/applications/:id/admit',
  authorize(['institution_admin'], 'admissions:write'),
  controller.admitApplication
);

module.exports = router;
