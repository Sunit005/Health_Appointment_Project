import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { HttpError } from '../errors/HttpError.js';

/**
 * Authentication middleware.
 *
 * Reads the JWT access token from the `Authorization: Bearer <token>` header,
 * verifies it, and injects the decoded user payload into `req.user`.
 *
 * Throws a 401 `HttpError` if the header is missing, malformed, or the token
 * fails verification.
 *
 * @throws {HttpError} 401 — when the token is missing or invalid.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw HttpError.unauthorized('Authentication token is required. Please log in.');
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    throw HttpError.unauthorized('Authentication token is required. Please log in.');
  }

  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
  };

  next();
}
