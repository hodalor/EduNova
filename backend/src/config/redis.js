const Redis = require('ioredis');

const env = require('./env');
const logger = require('./logger');

const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

redisClient.on('connect', () => {
  logger.info('Redis connection established successfully.');
});

redisClient.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

const connectRedis = async () => {
  if (redisClient.status !== 'ready') {
    await redisClient.connect();
  }
};

module.exports = {
  redisClient,
  connectRedis,
};
