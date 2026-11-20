const express = require('express');

const controller = require('./university.controller');
const { authenticate, resolveInstitution, institutionGuard, authorize } = require('../auth/auth.middleware');
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

const staff = ['institution_admin', 'teacher', 'principal_lecturer'];
const readers = ['institution_admin', 'teacher', 'principal_lecturer', 'student', 'accountant'];

router.get('/intakes', authorize(readers), controller.listIntakes);
router.post('/intakes', authorize(['institution_admin']), controller.createIntake);
router.delete('/intakes/:id', authorize(['institution_admin']), controller.deleteIntake);
router.get('/intake-report', authorize(readers), controller.intakeReport);
router.get('/notices', authorize(readers), controller.listNotices);
router.post('/notices', authorize(['institution_admin']), controller.createNotice);
router.get('/blasts', authorize(['institution_admin']), controller.listBlasts);
router.post('/blasts', authorize(['institution_admin']), controller.sendBlast);
router.get('/results', authorize([...staff, 'student']), controller.listResults);
router.post('/results', authorize(['institution_admin', 'teacher']), controller.recordResult);
router.get('/results/template', authorize(['institution_admin', 'teacher']), controller.resultTemplate);
router.post('/results/preview', authorize(['institution_admin', 'teacher']), controller.previewResults);
router.post('/results/commit', authorize(['institution_admin', 'teacher']), controller.commitResults);
router.get('/results/pending', authorize(['institution_admin', 'principal_lecturer']), controller.listPendingResults);
router.post('/results/approve/:batchId', authorize(['institution_admin', 'principal_lecturer']), controller.approveResults);
router.get('/exams/board', authorize(readers), controller.examBoard);
router.post('/exams/windows', authorize(['institution_admin']), controller.saveWindow);
router.patch('/exams/windows/:id/extend', authorize(['institution_admin']), controller.extendWindow);
router.post('/exams/sittings', authorize(['institution_admin']), controller.saveSitting);
router.delete('/exams/sittings/:id', authorize(['institution_admin']), controller.removeSitting);
router.get('/exams/docket', authorize(['institution_admin', 'student']), controller.examDocket);
router.get('/exams/confirmation', authorize(['institution_admin', 'student', 'accountant']), controller.confirmationSlip);
router.get('/exams/lectures', authorize(readers), controller.lectureTimetable);
router.patch('/results/weights', authorize(['institution_admin']), controller.updateWeights);

module.exports = router;
