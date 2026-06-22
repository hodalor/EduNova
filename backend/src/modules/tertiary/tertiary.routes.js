const express = require('express');

const controller = require('./tertiary.controller');
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
  enforceSubscriptionAccess('academics'),
  generalApiRateLimiter
);

router.get('/overview', controller.getOverview);
router.post('/course-registration', controller.registerCourses);
router.get('/student-registration/:studentId', controller.getStudentRegistrationState);
router.get('/transcript/:studentId', controller.getTranscript);
router.get('/faculties', controller.listFaculties);
router.post('/faculties', controller.createFaculty);
router.get('/departments', controller.listDepartments);
router.post('/departments', controller.createDepartment);
router.get('/programs', controller.listPrograms);
router.post('/programs', controller.createProgram);

module.exports = router;
