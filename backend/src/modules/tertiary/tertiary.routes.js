const express = require('express');

const controller = require('./tertiary.controller');
const { authenticate, resolveInstitution, institutionGuard, authorize } = require('../auth/auth.middleware');
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
router.post(
  '/course-registration',
  authorize(['institution_admin', 'teacher', 'student']),
  controller.registerCourses
);
router.get(
  '/student-registration/:studentId',
  authorize(['institution_admin', 'teacher', 'student']),
  controller.getStudentRegistrationState
);
router.get(
  '/transcript/:studentId',
  authorize(['institution_admin', 'teacher', 'student']),
  controller.getTranscript
);
router.get('/faculties', controller.listFaculties);
router.post('/faculties', authorize(['institution_admin', 'teacher']), controller.createFaculty);
router.get('/departments', controller.listDepartments);
router.post('/departments', authorize(['institution_admin', 'teacher']), controller.createDepartment);
router.get('/programs', controller.listPrograms);
router.post('/programs', authorize(['institution_admin', 'teacher']), controller.createProgram);
router.patch(
  '/progression-policy',
  authorize(['institution_admin', 'teacher']),
  controller.updateProgressionPolicy
);
router.patch(
  '/student-progress/:studentId',
  authorize(['institution_admin', 'teacher']),
  controller.updateStudentProgress
);

module.exports = router;
