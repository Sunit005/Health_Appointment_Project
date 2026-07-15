import type { Response } from 'express';
import { config } from '../../config/index.js';
import { REFRESH_TOKEN_TTL_DAYS } from './refreshToken.util.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * Sets the `refreshToken` HttpOnly cookie on the response.
 *
 * Security attributes:
 * - `httpOnly`: Prevents JavaScript access (XSS protection).
 * - `secure`: Only sent over HTTPS (enforced in production).
 * - `sameSite: strict`: Prevents CSRF token leakage in cross-site requests.
 * - `path: /api/v1/auth`: Restricts the cookie to the auth namespace only.
 *
 * @param res - Express response object.
 * @param token - The plain-text refresh token value.
 */
export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

/**
 * Clears the `refreshToken` cookie from the client's browser.
 *
 * @param res - Express response object.
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
}

/**
 * Reads the refresh token value from the incoming request cookies.
 *
 * @param cookies - The parsed cookies object from `req.cookies`.
 * @returns The refresh token string or `undefined` if not present.
 */
export function readRefreshTokenCookie(cookies: Record<string, string>): string | undefined {
  return cookies[REFRESH_TOKEN_COOKIE];
}
