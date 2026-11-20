const Joi = require('joi');

module.exports = {
  login: Joi.object({
    email: Joi.string().email().optional(),
    identity: Joi.alternatives().try(Joi.string().email(), Joi.string().min(3)).optional(),
    password: Joi.string().min(8).required(),
    otp_code: Joi.string().length(6).optional(),
  }).xor('email', 'identity'),
  refresh: Joi.object({
    refresh_token: Joi.string().required(),
  }),
  logout: Joi.object({
    refresh_token: Joi.string().required(),
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),
  resetPassword: Joi.object({
    token: Joi.string().required(),
    otp: Joi.string().length(6).required(),
    password: Joi.string().min(8).required(),
  }),
  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).required(),
  }),
  verifyEmail: Joi.object({
    token: Joi.string().required(),
  }),
  twoFactorVerify: Joi.object({
    code: Joi.string().length(6).required(),
  }),
};
