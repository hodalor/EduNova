const dotenv = require('dotenv');
const Joi = require('joi');

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(5000),
  DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .allow('')
    .optional(),
  DB_HOST: Joi.string().allow('').optional(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().allow('').optional(),
  DB_USER: Joi.string().allow('').optional(),
  DB_PASSWORD: Joi.string().allow('').optional(),
  REDIS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  SUPABASE_URL: Joi.string().uri().allow('').optional(),
  SUPABASE_ANON_KEY: Joi.string().allow('').optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').optional(),
  SUPABASE_STORAGE_BUCKET: Joi.string().allow('').optional(),
  SUPABASE_PUBLIC_BUCKET: Joi.string().allow('').optional(),
  SUPABASE_PRIVATE_BUCKET: Joi.string().allow('').optional(),
  SMTP_HOST: Joi.string().required(),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().allow('').required(),
  TWILIO_SID: Joi.string().allow('').required(),
  TWILIO_TOKEN: Joi.string().allow('').required(),
  TWILIO_PHONE: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().allow('').optional(),
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

const hasDatabaseUrl = Boolean(value.DATABASE_URL);
const hasSplitDatabaseConfig = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].every(
  (key) => Boolean(value[key] || value[key] === '')
);

if (!hasDatabaseUrl && !hasSplitDatabaseConfig) {
  throw new Error(
    'Environment validation error: provide DATABASE_URL or the DB_HOST/DB_NAME/DB_USER/DB_PASSWORD credentials.'
  );
}

const hasSupabaseCredentials = Boolean(value.SUPABASE_URL || value.SUPABASE_SERVICE_ROLE_KEY);
if (hasSupabaseCredentials && !(value.SUPABASE_URL && value.SUPABASE_SERVICE_ROLE_KEY)) {
  throw new Error(
    'Environment validation error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided together.'
  );
}

module.exports = value;
