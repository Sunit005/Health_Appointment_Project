import type { Patient } from '@prisma/client';
import { prisma } from '../prismaClient.js';

export const patientRepository = {
  findById(id: string): Promise<Patient | null> {
    return prisma.patient.findFirst({ where: { id, isDeleted: false } });
  },

  findByUserId(userId: string): Promise<Patient | null> {
    return prisma.patient.findFirst({ where: { userId, isDeleted: false } });
  },

  create(data: {
    userId: string;
    firstName: string;
    lastName: string;
    dob: Date;
    phoneNumber?: string;
  }): Promise<Patient> {
    return prisma.patient.create({ data });
  },

  update(id: string, data: Partial<Patient>): Promise<Patient> {
    return prisma.patient.update({ where: { id }, data });
  },
};
