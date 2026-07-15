import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler and forwards any rejected promise
 * to the global error handler middleware.
 * Required when express-async-errors is not available or for explicit wrapping.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
