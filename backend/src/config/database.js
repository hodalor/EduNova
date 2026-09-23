const { Sequelize } = require('sequelize');

const env = require('./env');
const logger = require('./logger');

const initializeModels = require('../../database/models');

let sequelize;
let models;
let connectDatabase;

const extractSupabaseProjectRef = (value) => {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  return match ? match[1] : null;
};

const buildConnectionHelp = (error) => {
  const message = String(error?.message || '');

  if (!/tenant\/user .* not found/i.test(message)) {
    return null;
  }

  const projectRef = extractSupabaseProjectRef(env.SUPABASE_URL);
  const connectionSource = env.DATABASE_URL || '';

  return [
    'Supabase pooler could not route this connection.',
    'Copy the full Session pooler or Transaction pooler connection string from Supabase Dashboard -> Connect and replace only the password placeholder.',
    projectRef
      ? `Expected shared pooler username format for this project is "postgres.${projectRef}".`
      : 'Expected shared pooler username format is "postgres.<project-ref>".',
    connectionSource.includes('pooler.supabase.com')
      ? 'The current DATABASE_URL already points at a pooler host, so the remaining likely issue is an incorrect host copied from another region or a stale project reference.'
      : 'If you are using a direct db host instead of the shared pooler, switch to the pooler connection string for IPv4 local development.',
  ].join(' ');
};

if (env.NODE_ENV === 'test') {
  sequelize = {
    authenticate: async () => true,
    close: async () => true,
  };
  models = {};
  connectDatabase = async () => true;
} else {
  const runtimeConfig = {
    development: {
      requireSsl: false,
      pool: {
        min: 2,
        max: 10,
      },
    },
    production: {
      requireSsl: true,
      pool: {
        min: 2,
        max: 10,
      },
    },
  };
  const currentConfig =
    runtimeConfig[env.NODE_ENV] || runtimeConfig.development;

  const sharedOptions = {
    dialect: 'postgres',
    logging: env.NODE_ENV === 'development' ? (message) => logger.debug(message) : false,
    dialectOptions: currentConfig.requireSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
    pool: {
      max: currentConfig.pool.max,
      min: currentConfig.pool.min,
      acquire: 30000,
      idle: 10000,
    },
  };

  sequelize = env.DATABASE_URL
    ? new Sequelize(env.DATABASE_URL, sharedOptions)
    : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
        ...sharedOptions,
        host: env.DB_HOST,
        port: env.DB_PORT,
      });

  connectDatabase = async () => {
    try {
      await sequelize.authenticate();
      logger.info('PostgreSQL connection established successfully.');
    } catch (error) {
      const help = buildConnectionHelp(error);

      if (help) {
        logger.error('Database connection hint', { hint: help });
      }

      throw error;
    }
  };

  models = initializeModels(sequelize);
}

module.exports = {
  sequelize,
  models,
  connectDatabase,
};
