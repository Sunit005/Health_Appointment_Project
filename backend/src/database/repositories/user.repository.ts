import type { User, Role } from '@prisma/client';
import { prisma } from '../prismaClient.js';

/**
 * Low-level data-access methods for the `users` table.
 * All business rules belong in the service layer, not here.
 */
export const userRepository = {
  /**
   * Finds a user by their unique email address.
   *
   * @param email - The email address to look up.
   * @returns The matching `User` record or `null`.
   */
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isDeleted: false },
    });
  },

  /**
   * Finds a user by their UUID primary key.
   *
   * @param id - The user UUID.
   * @returns The matching `User` record or `null`.
   */
  findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, isDeleted: false },
    });
  },

  /**
   * Finds a user by their password-reset token.
   *
   * @param token - The raw reset token (not hashed).
   * @returns The matching `User` record or `null`.
   */
  findByResetToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        isDeleted: false,
        passwordResetTokenExpires: { gt: new Date() },
      },
    });
  },

  /**
   * Finds a user by their email-verification token.
   *
   * @param token - The raw email verification token.
   * @returns The matching `User` record or `null`.
   */
  findByEmailVerifyToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        isDeleted: false,
        emailVerifyTokenExpires: { gt: new Date() },
      },
    });
  },

  /**
   * Creates a new user record.
   *
   * @param data - Fields required to create the user.
   * @returns The created `User` record.
   */
  create(data: {
    email: string;
    passwordHash: string;
    role: Role;
    emailVerifyToken?: string;
    emailVerifyTokenExpires?: Date;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
    });
  },

  /**
   * Updates arbitrary fields on a user record.
   *
   * @param id - The user UUID.
   * @param data - Fields to update.
   * @returns The updated `User` record.
   */
  update(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  /**
   * Soft-deletes a user by setting `isDeleted` and `deletedAt`.
   *
   * @param id - The user UUID.
   * @returns The updated `User` record.
   */
  softDelete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  },
};
