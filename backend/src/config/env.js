const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  REDIS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  SMTP_HOST: Joi.string().required(),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().allow('').required(),
  TWILIO_SID: Joi.string().allow('').required(),
  TWILIO_TOKEN: Joi.string().allow('').required(),
  TWILIO_PHONE: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  MOBILE_API_KEY: Joi.string().required(),
  MAX_FILE_SIZE: Joi.number().integer().positive().default(5242880),
}).unknown();

const { error, value } = schema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

module.exports = value;
