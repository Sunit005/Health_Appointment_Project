import { prisma } from '../../database/prismaClient.js';
import type { Patient } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Auth-specific data-access helpers that span multiple models.
 * For model-specific operations use the dedicated repositories in `/database/repositories`.
 */
export const authRepository = {
  /**
   * Creates a Patient profile record linked to an existing user.
   *
   * @param data - Patient profile fields.
   * @returns The created `Patient` record.
   */
  createPatientProfile(data: {
    userId: string;
    firstName: string;
    lastName: string;
    dob: Date;
    phoneNumber?: string;
  }): Promise<Patient> {
    return prisma.patient.create({ data });
  },

  /**
   * Writes an audit log entry for an auth event.
   *
   * @param data - The audit fields to record.
   */
  async logAuditEvent(data: {
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        correlationId: data.correlationId,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        ...(data.userId ? { userId: data.userId } : {}),
      },
    });
  },
};
