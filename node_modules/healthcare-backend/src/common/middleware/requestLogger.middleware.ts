import morgan from 'morgan';
import type { Request } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../../config/index.js';

/**
 * Custom Morgan write stream that pipes HTTP access logs into Winston.
 */
const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

/**
 * Morgan token that reads the correlation ID injected by `requestIdMiddleware`.
 */
morgan.token('correlation-id', (req: Request) => req.correlationId ?? '-');

/**
 * Morgan token that outputs the authenticated user ID when available.
 */
morgan.token('user-id', (req: Request) => req.user?.id ?? 'anonymous');

/**
 * Pre-configured Morgan middleware that logs all HTTP requests via Winston.
 *
 * Production uses a concise format with structured fields.
 * Development uses a more readable combined format.
 */
export const requestLoggerMiddleware = morgan(
  config.NODE_ENV === 'production'
    ? ':correlation-id :user-id :method :url :status :res[content-length] :response-time ms'
    : ':correlation-id :method :url :status :response-time ms',
  { stream: morganStream },
);
