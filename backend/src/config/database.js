const { Sequelize } = require('sequelize');

const env = require('./env');
const logger = require('./logger');

const initializeModels = require('../../database/models');

let sequelize;
let models;
let connectDatabase;

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
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established successfully.');
  };

  models = initializeModels(sequelize);
}

module.exports = {
  sequelize,
  models,
  connectDatabase,
};
