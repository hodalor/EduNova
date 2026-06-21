const logger = require('../../config/logger');

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

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};
