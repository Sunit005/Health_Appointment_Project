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

import { prescriptionService } from '../prescription.service.js';
import { doctorRepository } from '../../../database/repositories/doctor.repository.js';
import { patientRepository } from '../../../database/repositories/patient.repository.js';
import { appointmentRepository } from '../../../database/repositories/appointment.repository.js';
import { prisma } from '../../../database/prismaClient.js';
import { queueEmail, scheduleMedicationReminder } from '../../notification/notification.queue.js';

vi.mock('../../../database/repositories/doctor.repository.js', () => ({
  doctorRepository: {
    findByUserId: vi.fn(),
  },
}));

vi.mock('../../../database/repositories/patient.repository.js', () => ({
  patientRepository: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../database/repositories/appointment.repository.js', () => ({
  appointmentRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../notification/notification.queue.js', () => ({
  queueEmail: vi.fn().mockImplementation(() => Promise.resolve()),
  scheduleMedicationReminder: vi.fn().mockImplementation(() => Promise.resolve()),
}));

vi.mock('../../auth/auth.repository.js', () => ({
  authRepository: {
    logAuditEvent: vi.fn().mockImplementation(() => Promise.resolve()),
  },
}));

vi.mock('../../../database/prismaClient.js', () => {
  const mockPrisma = {
    appointment: {
      update: vi.fn(),
    },
    visitNote: {
      upsert: vi.fn(),
    },
    prescription: {
      create: vi.fn(),
    },
    medicationReminder: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    medicationReminderLog: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notification: {
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

describe('Prescription Service Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((cb: any) => cb(prisma));
    vi.mocked(queueEmail).mockImplementation(() => Promise.resolve());
    vi.mocked(scheduleMedicationReminder).mockImplementation(() => Promise.resolve());
  });

  it('should successfully create a prescription and reminders with translated cron schedules', async () => {
    vi.mocked(doctorRepository.findByUserId).mockResolvedValue({ id: 'doc-1', firstName: 'Aarav', lastName: 'Sharma' } as any);
    vi.mocked(appointmentRepository.findById).mockResolvedValue({ id: 'appt-1', doctorId: 'doc-1', patientId: 'pat-1' } as any);
    vi.mocked(patientRepository.findById).mockResolvedValue({ id: 'pat-1', userId: 'usr-pat-1' } as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ email: 'patient@example.com' } as any);

    vi.mocked(prisma.prescription.create).mockResolvedValue({ id: 'presc-1' } as any);
    vi.mocked(prisma.medicationReminder.create).mockResolvedValue({
      id: 'rem-1',
      medicationName: 'Metformin',
      dosageInstruction: '500mg',
      frequencyCron: '0 9,21 * * *',
    } as any);

    const data = {
      appointmentId: 'appt-1',
      clinicalNotes: 'Take after food',
      diagnosis: 'Diabetes Type 2',
      medications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      ],
    };

    const result = await prescriptionService.createPrescription('doc-user-1', data);

    expect(result.prescription.id).toBe('presc-1');
    expect(prisma.medicationReminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          frequencyCron: '0 9,21 * * *',
        }),
      })
    );
    expect(scheduleMedicationReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderId: 'rem-1',
        frequencyCron: '0 9,21 * * *',
      })
    );
  });
});
