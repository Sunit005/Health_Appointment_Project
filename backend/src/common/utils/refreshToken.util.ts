import { generateSecureToken, hashToken } from './security.util.js';
import { signRefreshToken, verifyRefreshToken } from './jwt.util.js';
import type { JwtRefreshPayload } from '../types/auth.types.js';

/**
 * The number of days a refresh token remains valid.
 * Keep in sync with JWT_REFRESH_EXPIRES_IN config.
 */
export const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * Generates a new refresh token JWT and its SHA-256 hash for database storage.
 *
 * Refresh tokens use Refresh Token Rotation (RTR):
 * - Each token belongs to a `familyId` that groups related tokens.
 * - Reuse of an already-used token in the same family triggers full family revocation.
 *
 * @param userId - The user this token belongs to.
 * @param sessionId - The session this token is scoped to.
 * @param familyId - The token family ID (generate a new UUID for first issue).
 * @returns An object containing the signed JWT and its stored hash.
 */
export function generateRefreshToken(
  userId: string,
  sessionId: string,
  familyId: string,
): { token: string; tokenHash: string; expiresAt: Date } {
  const token = signRefreshToken({ sub: userId, sessionId, familyId });
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  return { token, tokenHash, expiresAt };
}

/**
 * Verifies a refresh token JWT and extracts its payload.
 *
 * @param token - The refresh token JWT.
 * @returns The decoded `JwtRefreshPayload`.
 */
export function parseRefreshToken(token: string): JwtRefreshPayload {
  return verifyRefreshToken(token);
}

/**
 * Hashes a refresh token for database lookup.
 *
 * @param token - The plain-text refresh token.
 * @returns The SHA-256 hash.
 */
export function hashRefreshToken(token: string): string {
  return hashToken(token);
}

/**
 * Generates a new random family ID for a new refresh token family.
 *
 * @returns A 16-byte hex string.
 */
export function generateFamilyId(): string {
  return generateSecureToken(16);
}
