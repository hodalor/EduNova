const express = require('express');

const controller = require('./users.controller');
const { authenticate, resolveInstitution, institutionGuard, authorize } = require('../auth/auth.middleware');
const { blockSuperAdminInstitutionAccess } = require('../../shared/middleware/privacy-guard');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');

const router = express.Router();

router.use(
  authenticate,
  resolveInstitution,
  institutionGuard,
  blockSuperAdminInstitutionAccess,
  authorize(['institution_admin'], 'auth:manage'),
  generalApiRateLimiter
);

router.get('/', controller.listUsers);
router.post('/', controller.createUser);

module.exports = router;
