const express = require('express');

const controller = require('./finance.controller');
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
  enforceSubscriptionAccess('finance'),
  generalApiRateLimiter
);

router.get('/invoices', controller.listInvoices);
router.post('/invoices', controller.createInvoice);
router.post('/payments', controller.recordPayment);
router.get('/reports/defaulters', reportGenerationRateLimiter, controller.getOverdueInvoices);
router.get('/fee-structures', withCacheHeaders({ maxAge: 3600 }), controller.listFeeStructures);

module.exports = router;
