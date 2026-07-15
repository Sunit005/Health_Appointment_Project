import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { UserRole } from '@healthcare/shared';
import { HttpError } from '../errors/HttpError.js';

/**
 * Role-based authorization middleware factory.
 *
 * Verifies that the authenticated user (set by `authenticate` middleware)
 * has one of the allowed roles. Must be used AFTER `authenticate`.
 *
 * @param allowedRoles - One or more roles permitted to access the route.
 * @returns An Express middleware function.
 *
 * @throws {HttpError} 401 — when the request is not authenticated.
 * @throws {HttpError} 403 — when the user's role is not in `allowedRoles`.
 *
 * @example
 * router.get('/admin/metrics', authenticate, authorize('ADMIN'), metricsController.get);
 */
export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw HttpError.unauthorized('Authentication required.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw HttpError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      );
    }

    next();
  };
}
