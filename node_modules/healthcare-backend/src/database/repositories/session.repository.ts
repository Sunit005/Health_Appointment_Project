import type { Session } from '@prisma/client';
import { prisma } from '../prismaClient.js';

/**
 * Data-access layer for the `sessions` table.
 */
export const sessionRepository = {
  /**
   * Creates a new session record for the given user.
   *
   * @param data - Session creation fields.
   * @returns The created `Session` record.
   */
  create(data: {
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    return prisma.session.create({ data });
  },

  /**
   * Finds an active session by its ID.
   *
   * @param id - The session UUID.
   * @returns The matching `Session` or `null`.
   */
  findActiveById(id: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: { id, isActive: true, expiresAt: { gt: new Date() } },
    });
  },

  /**
   * Marks a single session as inactive (logout).
   *
   * @param id - The session UUID to invalidate.
   * @returns The updated `Session` record.
   */
  deactivate(id: string): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: { isActive: false },
    });
  },

  /**
   * Deactivates ALL sessions for a user.
   * Used when a user changes their password or is banned.
   *
   * @param userId - The user UUID.
   * @returns The Prisma batch result.
   */
  deactivateAllForUser(userId: string) {
    return prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  },
};
