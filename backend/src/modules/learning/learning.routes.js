const express = require('express');

const controller = require('./learning.controller');
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

router.get(
  '/courses',
  authorize(['institution_admin', 'teacher', 'student'], 'academics:read'),
  controller.listCourses
);
router.get(
  '/materials',
  authorize(['institution_admin', 'teacher', 'student'], 'academics:read'),
  controller.listMaterials
);
router.post(
  '/materials',
  authorize(['institution_admin', 'teacher'], 'academics:write'),
  controller.createMaterial
);
router.get(
  '/assessments',
  authorize(['institution_admin', 'teacher', 'student'], 'academics:read'),
  controller.listAssessments
);
router.post(
  '/assessments',
  authorize(['institution_admin', 'teacher'], 'academics:write'),
  controller.createAssessment
);
router.get(
  '/assessments/:id/submissions',
  authorize(['institution_admin', 'teacher'], 'academics:write'),
  controller.listAssessmentSubmissions
);
router.post(
  '/assessments/:id/submissions',
  authorize(['student'], 'academics:read'),
  controller.submitAssessment
);
router.post(
  '/submissions/:id/grade',
  authorize(['institution_admin', 'teacher'], 'academics:write'),
  controller.gradeSubmission
);
router.get('/results/me', authorize(['student'], 'academics:read'), controller.listMyResults);

module.exports = router;
