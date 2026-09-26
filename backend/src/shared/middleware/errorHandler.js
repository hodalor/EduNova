const logger = require('../../config/logger');

const extractSequelizeMessage = (error) => {
  if (!error || typeof error !== 'object' || !Array.isArray(error.errors)) {
    return null;
  }

  const messages = error.errors
    .map((item) => String(item.message || item.path || '').trim())
    .filter(Boolean);

  return messages.length ? messages.join(' | ') : null;
};

const extractDatabaseDetail = (error) =>
  [
    error?.parent?.detail,
    error?.original?.detail,
    error?.parent?.message,
    error?.original?.message,
  ]
    .map((item) => String(item || '').trim())
    .find(Boolean) || null;

module.exports = (error, req, res, next) => {
  logger.error('Unhandled application error', {
    message: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
  });

  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  const sequelizeMessage = extractSequelizeMessage(error);
  const databaseDetail = extractDatabaseDetail(error);
  const responseMessage =
    statusCode === 500
      ? sequelizeMessage || databaseDetail || error.message || 'Internal server error'
      : error.message;

  return res.status(statusCode).json({
    success: false,
    message: responseMessage,
  });
};
