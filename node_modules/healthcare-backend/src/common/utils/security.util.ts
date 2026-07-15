import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token.
 *
 * @param bytes - Number of random bytes to generate (default: 32).
 * @returns A hex-encoded random string.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hashes a plain-text token using SHA-256.
 * Used to store refresh tokens in the database without exposing the raw value.
 *
 * @param token - The plain-text token to hash.
 * @returns A hex-encoded SHA-256 digest.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` if the strings are equal.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Still perform the comparison to maintain constant time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
