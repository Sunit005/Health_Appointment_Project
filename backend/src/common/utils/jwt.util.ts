import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { HttpError } from '../errors/HttpError.js';
import { ErrorCode } from '../constants/errorCodes.js';
import type { JwtAccessPayload, JwtRefreshPayload } from '../types/auth.types.js';

// ---------------------------------------------------------------------------
// Access token
// ---------------------------------------------------------------------------

/**
 * Signs a new JWT access token (HS256) with the configured secret.
 *
 * @param payload - The data to encode in the token.
 * @returns A signed JWT string.
 */
export function signAccessToken(payload: Omit<JwtAccessPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jwt.sign as any)(payload, config.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  });
}

/**
 * Verifies a JWT access token and returns its decoded payload.
 *
 * @param token - The JWT string to verify.
 * @returns The decoded `JwtAccessPayload`.
 * @throws `HttpError` (401) if the token is invalid or expired.
 */
export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtAccessPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw HttpError.unauthorized('Your session has expired. Please log in again.', ErrorCode.TOKEN_EXPIRED);
    }
    throw HttpError.unauthorized('Invalid authentication token.', ErrorCode.TOKEN_INVALID);
  }
}

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

/**
 * Signs a new JWT refresh token (HS256) with the refresh secret.
 *
 * @param payload - The data to encode in the refresh token.
 * @returns A signed JWT string.
 */
export function signRefreshToken(payload: Omit<JwtRefreshPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jwt.sign as any)(payload, config.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verifies a JWT refresh token and returns its decoded payload.
 *
 * @param token - The JWT string to verify.
 * @returns The decoded `JwtRefreshPayload`.
 * @throws `HttpError` (401) if the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): JwtRefreshPayload {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtRefreshPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw HttpError.unauthorized('Your refresh token has expired. Please log in again.', ErrorCode.TOKEN_EXPIRED);
    }
    throw HttpError.unauthorized('Invalid refresh token.', ErrorCode.TOKEN_INVALID);
  }
}
