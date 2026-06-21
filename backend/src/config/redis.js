const Redis = require('ioredis');

const env = require('./env');
const logger = require('./logger');

let redisClient;
let connectRedis;

if (env.NODE_ENV === 'test') {
  const memory = new Map();
  const sets = new Map();

  redisClient = {
    status: 'ready',
    on: () => {},
    connect: async () => true,
    quit: async () => true,
    get: async (key) => memory.get(key) || null,
    set: async (key, value) => {
      memory.set(key, value);
      return 'OK';
    },
    del: async (...keys) => {
      const flattened = keys.flat();
      flattened.forEach((key) => {
        memory.delete(key);
        sets.delete(key);
      });
      return flattened.length;
    },
    sadd: async (key, value) => {
      const current = sets.get(key) || new Set();
      current.add(value);
      sets.set(key, current);
      return current.size;
    },
    srem: async (key, value) => {
      const current = sets.get(key);
      if (!current) {
        return 0;
      }
      current.delete(value);
      return 1;
    },
    expire: async () => 1,
    incr: async (key) => {
      const next = Number(memory.get(key) || 0) + 1;
      memory.set(key, String(next));
      return next;
    },
    ttl: async () => 300,
    keys: async (pattern) => {
      const prefix = pattern.replace('*', '');
      return Array.from(memory.keys()).filter((key) => key.startsWith(prefix));
    },
  };

  connectRedis = async () => true;
} else {
  redisClient = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  redisClient.on('connect', () => {
    logger.info('Redis connection established successfully.');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis connection error', { error: error.message });
  });

  connectRedis = async () => {
    if (redisClient.status !== 'ready') {
      await redisClient.connect();
    }
  };
}

module.exports = {
  redisClient,
  connectRedis,
};
