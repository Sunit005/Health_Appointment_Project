import './setup.js';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config module to avoid real env parsing in all imported files
vi.mock('../../../config/index.js', () => ({
  config: {
    PORT: 5000,
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    DATABASE_URL: 'mysql://healthcare_user:user_password_123@localhost:3306/healthcare_db',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6380,
    REDIS_PASSWORD: '',
    JWT_ACCESS_SECRET: 'default_local_dev_jwt_access_secret_code_phrase_123!',
    JWT_REFRESH_SECRET: 'default_local_dev_jwt_refresh_secret_code_phrase_123!',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    MFA_APP_NAME: 'Healthcare Appointment Manager',
    SENDGRID_API_KEY: 'mock-sendgrid-api-key',
    EMAIL_FROM_ADDRESS: 'no-reply@healthcaremanager.com',
    OPENAI_API_KEY: 'mock-openai-api-key',
    GEMINI_API_KEY: 'mock-gemini-api-key',
  }
}));

vi.mock('../../config/index.js', () => ({
  config: {
    PORT: 5000,
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    DATABASE_URL: 'mysql://healthcare_user:user_password_123@localhost:3306/healthcare_db',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6380,
    REDIS_PASSWORD: '',
    JWT_ACCESS_SECRET: 'default_local_dev_jwt_access_secret_code_phrase_123!',
    JWT_REFRESH_SECRET: 'default_local_dev_jwt_refresh_secret_code_phrase_123!',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    MFA_APP_NAME: 'Healthcare Appointment Manager',
    SENDGRID_API_KEY: 'mock-sendgrid-api-key',
    EMAIL_FROM_ADDRESS: 'no-reply@healthcaremanager.com',
    OPENAI_API_KEY: 'mock-openai-api-key',
    GEMINI_API_KEY: 'mock-gemini-api-key',
  }
}));

vi.mock('../config/index.js', () => ({
  config: {
    PORT: 5000,
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    DATABASE_URL: 'mysql://healthcare_user:user_password_123@localhost:3306/healthcare_db',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6380,
    REDIS_PASSWORD: '',
    JWT_ACCESS_SECRET: 'default_local_dev_jwt_access_secret_code_phrase_123!',
    JWT_REFRESH_SECRET: 'default_local_dev_jwt_refresh_secret_code_phrase_123!',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    MFA_APP_NAME: 'Healthcare Appointment Manager',
    SENDGRID_API_KEY: 'mock-sendgrid-api-key',
    EMAIL_FROM_ADDRESS: 'no-reply@healthcaremanager.com',
    OPENAI_API_KEY: 'mock-openai-api-key',
    GEMINI_API_KEY: 'mock-gemini-api-key',
  }
}));

import { doctorService } from '../doctor.service.js';
import { doctorRepository } from '../../../database/repositories/doctor.repository.js';
import { patientRepository } from '../../../database/repositories/patient.repository.js';
import { prisma } from '../../../database/prismaClient.js';
import { HttpError } from '../../../common/errors/HttpError.js';
import { queueEmail } from '../../notification/notification.queue.js';

// Mock dependencies
vi.mock('../../../database/repositories/doctor.repository.js', () => ({
  doctorRepository: {
    findById: vi.fn(),
    search: vi.fn(),
  },
}));

vi.mock('../../../database/prismaClient.js', () => {
  const mockPrisma = {
    doctorWorkingHour: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    doctorLeave: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

vi.mock('../../notification/notification.queue.js', () => ({
  queueEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../database/repositories/patient.repository.js', () => ({
  patientRepository: {
    findById: vi.fn().mockResolvedValue({ id: 'pat-1', userId: 'usr-patient-1' }),
  },
}));

vi.mock('../../auth/auth.repository.js', () => ({
  authRepository: {
    logAuditEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('doctorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDoctors', () => {
    it('should call repository search with parameters', async () => {
      const searchParams = { specialty: 'Cardiology', page: 1, limit: 10 };
      vi.mocked(doctorRepository.search).mockResolvedValue({ doctors: [], total: 0, page: 1, totalPages: 0 });

      const result = await doctorService.listDoctors(searchParams);

      expect(doctorRepository.search).toHaveBeenCalledWith(searchParams);
      expect(result.doctors).toEqual([]);
    });
  });

  describe('getDoctorById', () => {
    it('should return doctor if found', async () => {
      const doctor = { id: 'doc-1', firstName: 'John', lastName: 'Doe', specialty: 'Cardiology' };
      vi.mocked(doctorRepository.findById).mockResolvedValue(doctor as any);

      const result = await doctorService.getDoctorById('doc-1');

      expect(doctorRepository.findById).toHaveBeenCalledWith('doc-1');
      expect(result).toEqual(doctor);
    });

    it('should throw NotFound error if doctor does not exist', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue(null);

      await expect(doctorService.getDoctorById('invalid-id')).rejects.toThrow(HttpError);
    });
  });

  describe('getAvailableSlots', () => {
    it('should throw NotFound if doctor does not exist', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue(null);

      await expect(doctorService.getAvailableSlots('invalid-id', '2026-07-20')).rejects.toThrow('Doctor not found.');
    });

    it('should throw BadRequest if date format is invalid', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1' } as any);

      await expect(doctorService.getAvailableSlots('doc-1', 'invalid-date')).rejects.toThrow('Invalid date format.');
    });

    it('should return empty slots if doctor is not working on the day', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1' } as any);
      vi.mocked(prisma.doctorWorkingHour.findFirst).mockResolvedValue(null);

      const result = await doctorService.getAvailableSlots('doc-1', '2026-07-20');

      expect(result.slots).toEqual([]);
      expect(result.message).toContain('not available on this day');
    });

    it('should return empty slots if doctor is on approved leave', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1' } as any);
      vi.mocked(prisma.doctorWorkingHour.findFirst).mockResolvedValue({
        id: 'wh-1',
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
      } as any);
      vi.mocked(prisma.doctorLeave.findFirst).mockResolvedValue({ id: 'leave-1' } as any);

      const result = await doctorService.getAvailableSlots('doc-1', '2026-07-20');

      expect(result.slots).toEqual([]);
      expect(result.message).toContain('on approved leave');
    });

    it('should generate available slots correctly when no appointments are booked', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1' } as any);
      vi.mocked(prisma.doctorWorkingHour.findFirst).mockResolvedValue({
        id: 'wh-1',
        startTime: '09:00',
        endTime: '10:00',
        slotDurationMinutes: 30,
      } as any);
      vi.mocked(prisma.doctorLeave.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

      const result = await doctorService.getAvailableSlots('doc-1', '2026-07-20');

      expect(result.slots.length).toBe(2);
      expect(result.slots[0].available).toBe(true);
      expect(result.slots[1].available).toBe(true);
    });

    it('should mark slots as unavailable if they are already booked', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1' } as any);
      vi.mocked(prisma.doctorWorkingHour.findFirst).mockResolvedValue({
        id: 'wh-1',
        startTime: '09:00',
        endTime: '10:00',
        slotDurationMinutes: 30,
      } as any);
      vi.mocked(prisma.doctorLeave.findFirst).mockResolvedValue(null);

      const date = new Date('2026-07-20');
      const dayStart = new Date(date);
      dayStart.setHours(9, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(9, 30, 0, 0);

      vi.mocked(prisma.appointment.findMany).mockResolvedValue([
        { scheduledStart: dayStart, scheduledEnd: dayEnd } as any,
      ]);

      const result = await doctorService.getAvailableSlots('doc-1', '2026-07-20');

      expect(result.slots.length).toBe(2);
      expect(result.slots[0].available).toBe(false); // Booked slot should be unavailable
      expect(result.slots[1].available).toBe(true);
    });
  });

  describe('setWorkingHours', () => {
    it('should throw NotFound if doctor does not exist', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue(null);

      await expect(doctorService.setWorkingHours('invalid-id', {} as any)).rejects.toThrow('Doctor not found.');
    });

    it('should upsert working hours if doctor exists', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1' } as any);
      vi.mocked(prisma.doctorWorkingHour.upsert).mockResolvedValue({ id: 'wh-1' } as any);

      const input = { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' };
      const result = await doctorService.setWorkingHours('doc-1', input);

      expect(prisma.doctorWorkingHour.upsert).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('requestLeave', () => {
    it('should throw NotFound if doctor does not exist', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue(null);

      await expect(doctorService.requestLeave('invalid-id', {} as any)).rejects.toThrow('Doctor not found.');
    });

    it('should throw BadRequest if end date occurs before start date', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', userId: 'usr-1' } as any);

      await expect(
        doctorService.requestLeave('doc-1', { startDate: '2026-07-20', endDate: '2026-07-19' }),
      ).rejects.toThrow('End date must be after start date.');
    });

    it('should return CONFLICTS_DETECTED when conflicts exist and confirm is falsy', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', userId: 'usr-1' } as any);
      const appt = {
        id: 'appt-1',
        scheduledStart: new Date('2026-07-20T10:00:00Z'),
        scheduledEnd: new Date('2026-07-20T10:30:00Z'),
        patient: { firstName: 'John', lastName: 'Doe' },
      };
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([appt] as any);

      const result = await doctorService.requestLeave('doc-1', {
        startDate: '2026-07-20T09:00:00Z',
        endDate: '2026-07-20T11:00:00Z',
      });

      expect(result.status).toBe('CONFLICTS_DETECTED');
      expect(result.conflictsCount).toBe(1);
      expect(result.conflicts?.[0]?.patientName).toBe('John Doe');
    });

    it('should auto-approve leave and cancel overlapping appointments when confirm is true', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', userId: 'usr-1', firstName: 'Jane', lastName: 'Smith' } as any);
      const appt = {
        id: 'appt-1',
        patientId: 'pat-1',
        scheduledStart: new Date('2026-07-20T10:00:00Z'),
        scheduledEnd: new Date('2026-07-20T10:30:00Z'),
        patient: { firstName: 'John', lastName: 'Doe' },
      };
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([appt] as any);
      vi.mocked(prisma.doctorLeave.create).mockResolvedValue({ id: 'leave-1' } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: 'admin@example.com' }] as any);
      vi.mocked(patientRepository.findById).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ email: 'patient@example.com' } as any);

      const result = await doctorService.requestLeave('doc-1', {
        startDate: '2026-07-20T09:00:00Z',
        endDate: '2026-07-20T11:00:00Z',
        confirm: true,
      });

      expect(result.status).toBe('APPROVED');
      expect(prisma.doctorLeave.create).toHaveBeenCalled();
      expect(prisma.appointment.update).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(queueEmail).toHaveBeenCalled();
      expect(result.cancelledAppointments).toBe(1);
    });
  });

  describe('approveLeave', () => {
    it('should throw NotFound if leave does not exist', async () => {
      vi.mocked(prisma.doctorLeave.findUnique).mockResolvedValue(null);

      await expect(doctorService.approveLeave('invalid-leave', 'admin-1')).rejects.toThrow('Leave request not found.');
    });

    it('should approve leave, cancel affected appointments, and queue notifications', async () => {
      const leave = { id: 'leave-1', doctorId: 'doc-1', startDate: new Date('2026-07-20'), endDate: new Date('2026-07-21') };
      vi.mocked(prisma.doctorLeave.findUnique).mockResolvedValue(leave as any);
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', firstName: 'Jane', lastName: 'Smith' } as any);
      vi.mocked(prisma.doctorLeave.update).mockResolvedValue({ ...leave, status: 'APPROVED' } as any);

      const appt = {
        id: 'appt-1',
        patientId: 'pat-1',
        scheduledStart: new Date('2026-07-20T10:00:00Z'),
      };
      vi.mocked(prisma.appointment.findMany).mockResolvedValue([appt] as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: 'admin@example.com' }] as any);
      vi.mocked(patientRepository.findById).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ email: 'patient@example.com' } as any);

      const result = await doctorService.approveLeave('leave-1', 'admin-1');

      expect(prisma.doctorLeave.update).toHaveBeenCalledWith({
        where: { id: 'leave-1' },
        data: { status: 'APPROVED' },
      });
      expect(prisma.appointment.update).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(result.cancelledAppointments).toBe(1);
    });
  });
});
