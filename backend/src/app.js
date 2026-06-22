require('express-async-errors');

const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./config/logger');
const academicsRoutes = require('./modules/academics/academics.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const authRoutes = require('./modules/auth/auth.routes');
const communicationRoutes = require('./modules/communication/communication.routes');
const daycareRoutes = require('./modules/daycare/daycare.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const mediaRoutes = require('./modules/media/media.routes');
const superAdminRoutes = require('./modules/super-admin/super-admin.routes');
const studentsRoutes = require('./modules/students/students.routes');
const tertiaryRoutes = require('./modules/tertiary/tertiary.routes');
const timetableRoutes = require('./modules/timetable/timetable.routes');
const transportRoutes = require('./modules/transport/transport.routes');
const usersRoutes = require('./modules/users/users.routes');
const errorHandler = require('./shared/middleware/errorHandler');
const notFound = require('./shared/middleware/notFound');
const sanitizeInput = require('./shared/middleware/sanitizeInput');

const allowedOrigins = Array.from(
  new Set(
    [env.FRONTEND_URL, ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : [])]
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
);

const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed by CORS.'));
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeInput);
  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.NODE_ENV === 'production' ? 200 : 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
    })
  );

  app.get('/api/v1/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'EDUOVA backend is healthy.',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/communication', communicationRoutes);
  app.use('/api/v1/communication', communicationRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/v1/academics', academicsRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/v1/timetable', timetableRoutes);
  app.use('/api/v1/transport', transportRoutes);
  app.use('/api/v1/students', studentsRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/daycare', daycareRoutes);
  app.use('/api/v1/tertiary', tertiaryRoutes);
  app.use('/api/v1/media', mediaRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
