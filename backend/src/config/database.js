const { Sequelize } = require('sequelize');

const initializeModels = require('../../database/models');
const env = require('./env');
const logger = require('./logger');

const sharedOptions = {
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? (message) => logger.debug(message) : false,
  dialectOptions:
    env.NODE_ENV === 'production' || env.DATABASE_URL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

const sequelize = env.DATABASE_URL
  ? new Sequelize(env.DATABASE_URL, sharedOptions)
  : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      ...sharedOptions,
      host: env.DB_HOST,
      port: env.DB_PORT,
    });

const connectDatabase = async () => {
  await sequelize.authenticate();
  logger.info('PostgreSQL connection established successfully.');
};

const models = initializeModels(sequelize);

module.exports = {
  sequelize,
  models,
  connectDatabase,
};
