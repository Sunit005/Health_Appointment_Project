import type { Request } from 'express';
import type { UserRole } from '@healthcare/shared';

/**
 * Authenticated request where `req.user` is guaranteed to be present.
 * Use this type in controllers behind the `authenticate` middleware.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
    sessionId?: string;
  };
}

/**
 * Standard query parameters for paginated list endpoints.
 */
export interface PaginationQuery {
  page?: string;
  limit?: string;
}

/**
 * Resolved pagination options after parsing query strings.
 */
export interface ResolvedPagination {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Resolves raw query string pagination params into safe numeric values.
 *
 * @param query - Raw query parameters from the request.
 * @returns Parsed and bounded pagination options.
 */
export function resolvePagination(query: PaginationQuery): ResolvedPagination {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
