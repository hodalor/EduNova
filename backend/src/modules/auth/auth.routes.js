const express = require('express');

const controllerFactory = require('./auth.controller');
const validators = require('./auth.validator');
const { authenticate, institutionGuard, resolveInstitution } = require('./auth.middleware');

const controller = controllerFactory(validators);
const router = express.Router();

router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/verify-email', controller.verifyEmail);

router.use(authenticate, resolveInstitution, institutionGuard);
router.post('/logout', controller.logout);
router.post('/change-password', controller.changePassword);
router.get('/me', controller.me);
router.post('/2fa/setup', controller.setupTwoFactor);
router.post('/2fa/verify', controller.verifyTwoFactor);

module.exports = router;
