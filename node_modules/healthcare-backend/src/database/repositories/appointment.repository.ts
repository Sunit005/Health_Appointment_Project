import type { Appointment, AppointmentStatus } from '@prisma/client';
import { prisma } from '../prismaClient.js';

export const appointmentRepository = {
  findById(id: string): Promise<Appointment | null> {
    return prisma.appointment.findFirst({
      where: { id },
      include: { doctor: true, patient: true, symptomSubmission: true, calendarEvent: true },
    });
  },

  findByDoctorAndTime(doctorId: string, scheduledStart: Date): Promise<Appointment | null> {
    return prisma.appointment.findFirst({
      where: {
        doctorId,
        scheduledStart,
        status: { notIn: ['CANCELLED', 'NOSHOW'] },
      },
    });
  },

  findConflicting(doctorId: string, start: Date, end: Date, excludeId?: string): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: {
        doctorId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { notIn: ['CANCELLED', 'NOSHOW'] },
        OR: [
          { scheduledStart: { gte: start, lt: end } },
          { scheduledEnd: { gt: start, lte: end } },
          { scheduledStart: { lte: start }, scheduledEnd: { gte: end } },
        ],
      },
    });
  },

  findForPatient(patientId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return prisma.$transaction([
      prisma.appointment.findMany({
        where: { patientId },
        include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
        orderBy: { scheduledStart: 'desc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where: { patientId } }),
    ]);
  },

  findForDoctor(doctorId: string, date?: Date) {
    const start = date ? new Date(date.setHours(0, 0, 0, 0)) : undefined;
    const end = date ? new Date(date.setHours(23, 59, 59, 999)) : undefined;
    return prisma.appointment.findMany({
      where: {
        doctorId,
        status: { notIn: ['CANCELLED', 'NOSHOW'] },
        ...(start && end ? { scheduledStart: { gte: start, lte: end } } : {}),
      },
      include: {
        patient: { select: { firstName: true, lastName: true, medicalRecordNumber: true } },
        symptomSubmission: true,
      },
      orderBy: { scheduledStart: 'asc' },
    });
  },

  create(data: {
    doctorId: string;
    patientId: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    status?: AppointmentStatus;
    holdExpiresAt?: Date;
    active?: string | null;
  }): Promise<Appointment> {
    return prisma.appointment.create({ data });
  },

  updateStatus(id: string, status: AppointmentStatus, extra?: Partial<Appointment>): Promise<Appointment> {
    return prisma.appointment.update({ where: { id }, data: { status, ...extra } });
  },

  expireHolds(): Promise<{ count: number }> {
    return prisma.appointment.updateMany({
      where: {
        status: 'PENDING_HOLD',
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: 'CANCELLED', cancelReason: 'Hold expired', active: null },
    });
  },

  findByDoctorInRange(doctorId: string, start: Date, end: Date): Promise<Appointment[]> {
    return prisma.appointment.findMany({
      where: {
        doctorId,
        status: { notIn: ['CANCELLED', 'NOSHOW'] },
        scheduledStart: { gte: start, lt: end },
      },
      include: { patient: { select: { userId: true, firstName: true, lastName: true } } },
      orderBy: { scheduledStart: 'asc' },
    });
  },
};
