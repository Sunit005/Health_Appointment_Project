// express-async-errors MUST be the first import
import 'express-async-errors';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { config } from './config/index.js';
import { prisma } from './database/prismaClient.js';
import { requestIdMiddleware } from './common/middleware/requestId.middleware.js';
import { requestLoggerMiddleware } from './common/middleware/requestLogger.middleware.js';
import { notFoundMiddleware } from './common/middleware/notFound.middleware.js';
import { errorHandlerMiddleware } from './common/middleware/errorHandler.middleware.js';
import { formatSuccess, formatError } from './common/utils/responseFormatter.js';
import { ErrorCode } from './common/constants/errorCodes.js';
import { HttpStatus } from './common/constants/httpStatus.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import doctorRoutes from './modules/doctor/doctor.routes.js';
import appointmentRoutes from './modules/appointment/appointment.routes.js';
import prescriptionRoutes from './modules/prescription/prescription.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import calendarRoutes from './modules/calendar/calendar.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import userRoutes from './modules/user/user.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    }),
  );

  // ── CORS — explicit whitelist ─────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          origin === config.FRONTEND_URL ||
          (config.NODE_ENV === 'development' && /^http:\/\/localhost(:\d+)?$/.test(origin))
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
      exposedHeaders: ['x-correlation-id'],
    }),
  );

  // ── Request pre-processing ───────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.set('trust proxy', 1);

  // ── Health check ──────────────────────────────────────────────────────
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(HttpStatus.OK).json(
        formatSuccess({
          status: 'OK',
          database: 'CONNECTED',
          environment: config.NODE_ENV,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(
        formatError(ErrorCode.DATABASE_ERROR, 'Service degraded — database connection failed.'),
      );
    }
  });

  // ── API routes ────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/doctors', doctorRoutes);
  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api/v1/prescriptions', prescriptionRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/calendar', calendarRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/ai', aiRoutes);

  // ── 404 + Global error handler ────────────────────────────────────────
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
