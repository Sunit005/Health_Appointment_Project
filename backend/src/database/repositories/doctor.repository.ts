import type { Doctor } from '@prisma/client';
import { prisma } from '../prismaClient.js';

export interface DoctorSearchParams {
  specialty?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rating' | 'specialty';
  sortOrder?: 'asc' | 'desc';
}

export const doctorRepository = {
  findById(id: string): Promise<Doctor | null> {
    return prisma.doctor.findFirst({ where: { id, isDeleted: false } });
  },

  findByUserId(userId: string): Promise<Doctor | null> {
    return prisma.doctor.findFirst({ where: { userId, isDeleted: false } });
  },

  async search(params: DoctorSearchParams) {
    const { specialty, search, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isDeleted: false };
    if (specialty) where.specialty = { contains: specialty };
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { specialty: { contains: search } },
      ];
    }

    const orderBy =
      sortBy === 'name'
        ? [{ firstName: sortOrder }, { lastName: sortOrder }]
        : [{ [sortBy]: sortOrder }];

    const [doctors, total] = await prisma.$transaction([
      prisma.doctor.findMany({ where, orderBy, skip, take: limit }),
      prisma.doctor.count({ where }),
    ]);

    return { doctors, total, page, totalPages: Math.ceil(total / limit) };
  },

  create(data: {
    userId: string;
    firstName: string;
    lastName: string;
    specialty: string;
    licenseNumber?: string;
    slotDurationMinutes?: number;
  }): Promise<Doctor> {
    return prisma.doctor.create({ data });
  },

  update(id: string, data: Partial<Doctor>): Promise<Doctor> {
    return prisma.doctor.update({ where: { id }, data });
  },
};
