const authService = require('./auth.service');

const validate = (schema, payload) => {
  const { error, value } = schema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw Object.assign(new Error(error.details.map((item) => item.message).join(', ')), { status: 400 });
  }
  return value;
};

const createAuthController = (validators) => ({
  login: async (req, res) =>
    res.json({ success: true, data: await authService.login(validate(validators.login, req.body)) }),
  refresh: async (req, res) =>
    res.json({ success: true, data: await authService.refresh(validate(validators.refresh, req.body)) }),
  logout: async (req, res) =>
    res.json({
      success: true,
      data: await authService.logout({ token: req.token, ...validate(validators.logout, req.body) }),
    }),
  forgotPassword: async (req, res) =>
    res.json({
      success: true,
      data: await authService.forgotPassword(validate(validators.forgotPassword, req.body)),
    }),
  resetPassword: async (req, res) =>
    res.json({
      success: true,
      data: await authService.resetPassword(validate(validators.resetPassword, req.body)),
    }),
  changePassword: async (req, res) =>
    res.json({
      success: true,
      data: await authService.changePassword({
        user: req.user,
        ...validate(validators.changePassword, req.body),
      }),
    }),
  me: async (req, res) => res.json({ success: true, data: await authService.me(req.user) }),
  verifyEmail: async (req, res) =>
    res.json({ success: true, data: await authService.verifyEmail(validate(validators.verifyEmail, req.body)) }),
  setupTwoFactor: async (req, res) =>
    res.json({ success: true, data: await authService.setupTwoFactor(req.user) }),
  verifyTwoFactor: async (req, res) =>
    res.json({
      success: true,
      data: await authService.verifyTwoFactor({
        user: req.user,
        ...validate(validators.twoFactorVerify, req.body),
      }),
    }),
});

module.exports = createAuthController;
