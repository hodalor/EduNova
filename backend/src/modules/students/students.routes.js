const express = require('express');

const controller = require('./students.controller');
const { authenticate, resolveInstitution, institutionGuard } = require('../auth/auth.middleware');
const { blockSuperAdminInstitutionAccess } = require('../../shared/middleware/privacy-guard');
const { generalApiRateLimiter } = require('../../shared/middleware/rateLimits');
const {
  enforceSubscriptionAccess,
  enforceStudentPlanLimit,
} = require('../../shared/middleware/subscription-enforcement');

const router = express.Router();

router.use(
  authenticate,
  resolveInstitution,
  institutionGuard,
  blockSuperAdminInstitutionAccess,
  enforceSubscriptionAccess('admissions'),
  generalApiRateLimiter
);

router.get('/roster', controller.getRoster);
router.post('/', enforceStudentPlanLimit, controller.createStudent);
router.get('/', controller.listStudents);
router.get('/:studentId', controller.getStudent);

module.exports = router;
