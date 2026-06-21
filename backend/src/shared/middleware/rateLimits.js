const { ipKeyGenerator, rateLimit } = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

const generalApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'Too many API requests. Please slow down.',
  },
});

const reportGenerationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'Too many report generation requests. Please try again later.',
  },
});

module.exports = {
  authRateLimiter,
  generalApiRateLimiter,
  reportGenerationRateLimiter,
};
