import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware that assigns a unique correlation ID to every incoming request.
 *
 * The ID is read from the `x-correlation-id` header if the client provides
 * one (useful for distributed systems that propagate trace IDs), otherwise
 * a new UUID v4 is generated.
 *
 * The ID is written back to the response headers so clients can correlate
 * their request with server logs.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-correlation-id'];
  const correlationId =
    typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}
