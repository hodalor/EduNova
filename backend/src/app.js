require('express-async-errors');

const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { isAllowedOrigin } = require('./config/cors');
const env = require('./config/env');
const logger = require('./config/logger');
const academicsRoutes = require('./modules/academics/academics.routes');
const admissionsRoutes = require('./modules/admissions/admissions.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const authRoutes = require('./modules/auth/auth.routes');
const communicationRoutes = require('./modules/communication/communication.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const learningRoutes = require('./modules/learning/learning.routes');
const mediaRoutes = require('./modules/media/media.routes');
const superAdminRoutes = require('./modules/super-admin/super-admin.routes');
const studentsRoutes = require('./modules/students/students.routes');
const tertiaryRoutes = require('./modules/tertiary/tertiary.routes');
const universityRoutes = require('./modules/university/university.routes');
const timetableRoutes = require('./modules/timetable/timetable.routes');
const transportRoutes = require('./modules/transport/transport.routes');
const usersRoutes = require('./modules/users/users.routes');
const errorHandler = require('./shared/middleware/errorHandler');
const notFound = require('./shared/middleware/notFound');
const sanitizeInput = require('./shared/middleware/sanitizeInput');

const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        logger.warn('Blocked CORS origin', { origin });
        callback(null, false);
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

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'EDUOVA backend is healthy.',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

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
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/learning', learningRoutes);
  app.use('/api/v1/learning', learningRoutes);
  app.use('/api/academics', academicsRoutes);
  app.use('/api/v1/academics', academicsRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/v1/attendance', attendanceRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/v1/timetable', timetableRoutes);
  app.use('/api/transport', transportRoutes);
  app.use('/api/v1/transport', transportRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/v1/students', studentsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/tertiary', tertiaryRoutes);
  app.use('/api/v1/tertiary', tertiaryRoutes);
  app.use('/api/university', universityRoutes);
  app.use('/api/v1/university', universityRoutes);
  app.use('/api/admissions', admissionsRoutes);
  app.use('/api/v1/admissions', admissionsRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/v1/media', mediaRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
