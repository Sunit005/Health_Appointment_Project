import type { UserRole } from '@healthcare/shared';

/**
 * Payload encoded inside a JWT access token.
 */
export interface JwtAccessPayload {
  /** Subject: the user's UUID */
  sub: string;
  /** User email */
  email: string;
  /** User role */
  role: UserRole;
  /** Session ID this token belongs to */
  sessionId: string;
  /** Issued at (unix seconds) */
  iat?: number;
  /** Expiration (unix seconds) */
  exp?: number;
}

/**
 * Payload encoded inside a JWT refresh token.
 */
export interface JwtRefreshPayload {
  /** Subject: the user's UUID */
  sub: string;
  /** Token family ID — used for refresh token rotation & reuse detection */
  familyId: string;
  /** Session ID this token belongs to */
  sessionId: string;
  /** Issued at (unix seconds) */
  iat?: number;
  /** Expiration (unix seconds) */
  exp?: number;
}

/**
 * The result returned by `AuthService.login`.
 */
export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Data attached to `req.user` after the `authenticate` middleware runs.
 */
export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}
