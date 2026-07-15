import type { RefreshToken } from '@prisma/client';
import { prisma } from '../prismaClient.js';

/**
 * Data-access layer for the `refresh_tokens` table.
 */
export const refreshTokenRepository = {
  /**
   * Stores a new refresh token (as a hash) in the database.
   *
   * @param data - Token creation fields.
   * @returns The created `RefreshToken` record.
   */
  create(data: {
    tokenHash: string;
    userId: string;
    sessionId: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  /**
   * Looks up a refresh token by its SHA-256 hash.
   *
   * @param tokenHash - The SHA-256 hash of the token to find.
   * @returns The matching `RefreshToken` record or `null`.
   */
  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  /**
   * Marks a token as used (consumed during rotation).
   *
   * @param id - The `RefreshToken` UUID.
   * @returns The updated record.
   */
  markUsed(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { isUsed: true },
    });
  },

  /**
   * Revokes all tokens in the same family.
   * Triggered when token reuse is detected to prevent session hijacking.
   *
   * @param familyId - The token family ID to revoke.
   */
  revokeFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: { familyId },
      data: { isRevoked: true },
    });
  },

  /**
   * Revokes all refresh tokens for a user.
   * Used on logout-all or password change.
   *
   * @param userId - The user UUID.
   */
  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },
};
