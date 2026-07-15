import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { formatError } from '../utils/responseFormatter.js';
import { ErrorCode } from '../constants/errorCodes.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { logger } from '../utils/logger.js';
import { config } from '../../config/index.js';

/**
 * Global Express error-handling middleware.
 *
 * Must be registered LAST in the middleware chain (after all routes and the 404
 * handler) with exactly four parameters so Express identifies it as an error handler.
 *
 * Distinguishes between operational errors (`AppError` subclasses) and unexpected
 * programmer errors, logging stack traces in development and sanitised messages in
 * production.
 */
export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // next is required for Express to recognise this as an error handler
  _next: NextFunction,
): void {
  const correlationId = req.correlationId ?? 'unknown';

  if (err instanceof AppError && err.isOperational) {
    // Operational error — expected, safe to return details to client
    if (err.statusCode >= 500) {
      logger.error('Operational server error', {
        correlationId,
        errorCode: err.errorCode,
        message: err.message,
        stack: err.stack,
      });
    } else {
      logger.warn('Client error', {
        correlationId,
        errorCode: err.errorCode,
        message: err.message,
      });
    }

    res.status(err.statusCode).json(
      formatError(err.errorCode, err.message, correlationId, err.details),
    );
    return;
  }

  // Unknown / programmer error — never leak internals
  const errorMessage = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled error', {
    correlationId,
    message: errorMessage,
    stack,
  });

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
    formatError(
      ErrorCode.INTERNAL_ERROR,
      config.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : errorMessage,
      correlationId,
    ),
  );
}
