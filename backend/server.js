const http = require('http');
const { Server } = require('socket.io');

const createApp = require('./src/app');
const communicationService = require('./src/modules/communication/communication.service');
const socketService = require('./src/modules/notifications/socket.service');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { sequelize, connectDatabase } = require('./src/config/database');
const { redisClient, connectRedis } = require('./src/config/redis');

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});

app.locals.io = io;
socketService.initializeSocketNamespaces({ io });

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();
    communicationService.registerEventSubscribers();

    server.listen(env.PORT, () => {
      logger.info(`EDUOVA backend listening on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to bootstrap server', { error: error.message });
    process.exit(1);
  }
};

let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.warn(`${signal} received. Starting graceful shutdown.`);

  server.close(async (serverError) => {
    if (serverError) {
      logger.error('Error while closing HTTP server', { error: serverError.message });
    }

    try {
      io.close();
      if (redisClient.status !== 'end') {
        await redisClient.quit();
      }
      await sequelize.close();
      logger.info('Graceful shutdown completed.');
      process.exit(serverError ? 1 : 0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error: error.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : reason,
  });
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message });
  shutdown('uncaughtException');
});

startServer();
