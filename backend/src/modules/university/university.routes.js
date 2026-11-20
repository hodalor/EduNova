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

const staff = ['institution_admin', 'teacher'];
const readers = ['institution_admin', 'teacher', 'student', 'accountant'];

router.get('/intakes', authorize(readers), controller.listIntakes);
router.post('/intakes', authorize(['institution_admin']), controller.createIntake);
router.delete('/intakes/:id', authorize(['institution_admin']), controller.deleteIntake);
router.get('/intake-report', authorize(readers), controller.intakeReport);
router.get('/notices', authorize(readers), controller.listNotices);
router.post('/notices', authorize(['institution_admin']), controller.createNotice);
router.get('/blasts', authorize(['institution_admin']), controller.listBlasts);
router.post('/blasts', authorize(['institution_admin']), controller.sendBlast);
router.get('/results', authorize([...staff, 'student']), controller.listResults);
router.post('/results', authorize(staff), controller.recordResult);
router.patch('/results/weights', authorize(['institution_admin']), controller.updateWeights);

module.exports = router;
