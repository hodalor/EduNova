const { Sequelize } = require('sequelize');

const env = require('./env');
const logger = require('./logger');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? (message) => logger.debug(message) : false,
  dialectOptions:
    env.NODE_ENV === 'production'
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
});

const connectDatabase = async () => {
  await sequelize.authenticate();
  logger.info('PostgreSQL connection established successfully.');
};

module.exports = {
  sequelize,
  connectDatabase,
};
