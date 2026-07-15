import '../../doctor/__tests__/setup.js';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config module to avoid real env parsing
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

import { appointmentService } from '../appointment.service.js';
import { doctorRepository } from '../../../database/repositories/doctor.repository.js';
import { patientRepository } from '../../../database/repositories/patient.repository.js';
import { appointmentRepository } from '../../../database/repositories/appointment.repository.js';
import { userRepository } from '../../../database/repositories/user.repository.js';
import { authRepository } from '../../auth/auth.repository.js';
import { calendarService } from '../../calendar/calendar.service.js';
import { queueEmail } from '../../notification/notification.queue.js';
import { prisma } from '../../../database/prismaClient.js';

// Mock dependencies
vi.mock('../../../database/repositories/doctor.repository.js', () => ({
  doctorRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
  },
}));

vi.mock('../../../database/repositories/patient.repository.js', () => ({
  patientRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
  },
}));

vi.mock('../../../database/repositories/appointment.repository.js', () => ({
  appointmentRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    expireHolds: vi.fn(),
    findForPatient: vi.fn(),
    findForDoctor: vi.fn(),
  },
}));

vi.mock('../../../database/repositories/user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../auth/auth.repository.js', () => ({
  authRepository: {
    logAuditEvent: vi.fn(),
  },
}));

vi.mock('../../notification/notification.queue.js', () => ({
  queueEmail: vi.fn().mockImplementation(() => Promise.resolve()),
  scheduleMedicationReminder: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock('../../calendar/calendar.service.js', () => ({
  calendarService: {
    createCalendarEvent: vi.fn().mockImplementation(() => Promise.resolve()),
    deleteCalendarEvent: vi.fn().mockImplementation(() => Promise.resolve()),
    updateCalendarEvent: vi.fn().mockImplementation(() => Promise.resolve()),
  },
}));

vi.mock('../../../database/prismaClient.js', () => {
  const mockPrisma = {
    appointment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    symptomSubmission: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

describe('Appointment Service Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((cb: any) => cb(prisma));
    vi.mocked(queueEmail).mockImplementation(() => Promise.resolve());
    vi.mocked(calendarService.createCalendarEvent).mockImplementation(() => Promise.resolve());
    vi.mocked(calendarService.deleteCalendarEvent).mockImplementation(() => Promise.resolve());
    vi.mocked(calendarService.updateCalendarEvent).mockImplementation(() => Promise.resolve());
  });

  describe('bookAppointment', () => {
    it('should successfully book an appointment when slot is free', async () => {
      vi.mocked(patientRepository.findByUserId).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', slotDurationMinutes: 30 } as any);
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.appointment.create).mockResolvedValue({
        id: 'appt-1',
        doctorId: 'doc-1',
        patientId: 'pat-1',
        scheduledStart: new Date('2026-07-20T10:00:00Z'),
        status: 'BOOKED',
      } as any);
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'usr-pat-1', email: 'pat@example.com' } as any);

      const result = await appointmentService.bookAppointment('usr-pat-1', {
        doctorId: 'doc-1',
        scheduledStart: '2026-07-20T10:00:00Z',
      });

      expect(result.id).toBe('appt-1');
      expect(prisma.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          doctorId: 'doc-1',
          patientId: 'pat-1',
          status: 'BOOKED',
          active: 'true',
        }),
      }));
    });

    it('should throw conflict error if findFirst detects an active booking', async () => {
      vi.mocked(patientRepository.findByUserId).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', slotDurationMinutes: 30 } as any);
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue({ id: 'existing-appt' } as any);

      await expect(
        appointmentService.bookAppointment('usr-pat-1', {
          doctorId: 'doc-1',
          scheduledStart: '2026-07-20T10:00:00Z',
        }),
      ).rejects.toThrow('This time slot is already booked.');
    });

    it('should handle db unique constraint violation (P2002) and throw a descriptive conflict error', async () => {
      vi.mocked(patientRepository.findByUserId).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', slotDurationMinutes: 30 } as any);
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

      // Simulate a concurrent insert failing unique constraint
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      vi.mocked(prisma.appointment.create).mockRejectedValue(p2002Error);

      await expect(
        appointmentService.bookAppointment('usr-pat-1', {
          doctorId: 'doc-1',
          scheduledStart: '2026-07-20T10:00:00Z',
        }),
      ).rejects.toThrow('This time slot was just booked by another user.');
    });
  });

  describe('cancelAppointment', () => {
    it('should clear active column status to null when cancelling appointment', async () => {
      vi.mocked(appointmentRepository.findById).mockResolvedValue({
        id: 'appt-1',
        patientId: 'pat-1',
        status: 'BOOKED',
        scheduledStart: new Date(),
      } as any);
      vi.mocked(patientRepository.findByUserId).mockResolvedValue({ id: 'pat-1' } as any);
      vi.mocked(appointmentRepository.updateStatus).mockResolvedValue({
        id: 'appt-1',
        status: 'CANCELLED',
        active: null,
      } as any);
      vi.mocked(patientRepository.findById).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'usr-pat-1', email: 'pat@example.com' } as any);

      const result = await appointmentService.cancelAppointment('appt-1', 'usr-pat-1');

      expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
        'appt-1',
        'CANCELLED',
        expect.objectContaining({ active: null }),
      );
    });
  });

  describe('holdSlot & confirmBooking', () => {
    it('should successfully hold a slot', async () => {
      vi.mocked(patientRepository.findByUserId).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1', slotDurationMinutes: 30 } as any);
      vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.appointment.create).mockResolvedValue({
        id: 'appt-1',
        doctorId: 'doc-1',
        patientId: 'pat-1',
        scheduledStart: new Date('2026-07-20T10:00:00Z'),
        status: 'PENDING_HOLD',
      } as any);

      const result = await appointmentService.holdSlot('usr-pat-1', {
        doctorId: 'doc-1',
        scheduledStart: '2026-07-20T10:00:00Z',
      });

      expect(result.status).toBe('PENDING_HOLD');
      expect(prisma.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING_HOLD',
          active: 'true',
        }),
      }));
    });

    it('should confirm hold successfully when not expired', async () => {
      const fiveMinsFuture = new Date(Date.now() + 5 * 60 * 1000);
      vi.mocked(appointmentRepository.findById).mockResolvedValue({
        id: 'appt-1',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        status: 'PENDING_HOLD',
        holdExpiresAt: fiveMinsFuture,
        scheduledStart: new Date(),
      } as any);
      vi.mocked(patientRepository.findByUserId).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
      vi.mocked(doctorRepository.findById).mockResolvedValue({ id: 'doc-1' } as any);
      vi.mocked(prisma.appointment.update).mockResolvedValue({
        id: 'appt-1',
        status: 'BOOKED',
      } as any);
      vi.mocked(userRepository.findById).mockResolvedValue({ id: 'usr-pat-1', email: 'pat@example.com' } as any);

      const result = await appointmentService.confirmBooking('appt-1', 'usr-pat-1', {
        symptomDescription: 'Headache',
      });

      expect(result.status).toBe('BOOKED');
      expect(prisma.appointment.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'appt-1' },
        data: expect.objectContaining({
          status: 'BOOKED',
          holdExpiresAt: null,
        }),
      }));
    });

    it('should throw error on confirm if hold has expired', async () => {
      const fiveMinsPast = new Date(Date.now() - 5 * 60 * 1000);
      vi.mocked(appointmentRepository.findById).mockResolvedValue({
        id: 'appt-1',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        status: 'PENDING_HOLD',
        holdExpiresAt: fiveMinsPast,
        scheduledStart: new Date(),
      } as any);
      vi.mocked(patientRepository.findByUserId).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);

      await expect(
        appointmentService.confirmBooking('appt-1', 'usr-pat-1', {}),
      ).rejects.toThrow('Hold has expired.');
    });
  });
});
