import type { UserRole } from '@healthcare/shared';

/**
 * Augments the Express `Request` interface to include application-specific
 * properties injected by middleware.
 */
declare global {
  namespace Express {
    interface Request {
      /** Unique identifier for the incoming request, used for distributed tracing. */
      correlationId: string;

      /** Authenticated user payload decoded from the JWT access token. */
      user?: {
        id: string;
        email: string;
        role: UserRole;
        sessionId?: string;
      };
    }
  }
}

export {};
