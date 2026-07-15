import type { Request, Response } from 'express';
import { formatError } from '../utils/responseFormatter.js';
import { ErrorCode } from '../constants/errorCodes.js';
import { HttpStatus } from '../constants/httpStatus.js';

/**
 * Catch-all 404 handler. Register this AFTER all routes so it only
 * fires when no route matched the incoming request.
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(HttpStatus.NOT_FOUND).json(
    formatError(
      ErrorCode.NOT_FOUND,
      `The endpoint '${req.method} ${req.path}' does not exist.`,
      req.correlationId,
    ),
  );
}
