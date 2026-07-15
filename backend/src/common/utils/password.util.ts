import argon2 from 'argon2';

/**
 * Argon2id configuration aligned with OWASP recommendations:
 * - Memory: 64 MB
 * - Time cost: 3 iterations
 * - Parallelism: 4 threads
 */
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB in KiB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Hashes a plain-text password using Argon2id.
 *
 * @param plainText - The raw password to hash.
 * @returns A string containing the Argon2id hash (includes salt and parameters).
 */
export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, ARGON2_OPTIONS);
}

/**
 * Verifies a plain-text password against a stored Argon2id hash.
 *
 * @param hash - The stored password hash.
 * @param plainText - The raw password to verify.
 * @returns `true` if the password matches the hash.
 */
export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  return argon2.verify(hash, plainText);
}
