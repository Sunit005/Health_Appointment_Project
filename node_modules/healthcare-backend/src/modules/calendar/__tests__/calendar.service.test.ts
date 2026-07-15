import '../../doctor/__tests__/setup.js';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    GOOGLE_CLIENT_ID: 'mock-google-client-id',
    GOOGLE_CLIENT_SECRET: 'mock-google-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:5000/api/v1/schedule/auth/google/callback',
  }
}));

import { calendarService } from '../calendar.service.js';
import { doctorRepository } from '../../../database/repositories/doctor.repository.js';
import { prisma } from '../../../database/prismaClient.js';

// Mock repositories
vi.mock('../../../database/repositories/doctor.repository.js', () => ({
  doctorRepository: {
    update: vi.fn(),
    findByUserId: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../database/prismaClient.js', () => {
  const mockPrisma = {
    calendarEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

describe('Calendar Service Tests', () => {
  const globalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  it('should get correct auth URL', () => {
    const url = calendarService.getAuthUrl('doc-user-1');
    expect(url).toContain('client_id=mock-google-client-id');
    expect(url).toContain('state=doc-user-1');
  });

  it('should skip createCalendarEvent if Google Calendar event already exists', async () => {
    vi.mocked(prisma.calendarEvent.findUnique).mockResolvedValue({
      googleEventId: 'existing-event-123',
    } as any);

    // Spy on updateCalendarEvent to check delegation
    const updateSpy = vi.spyOn(calendarService, 'updateCalendarEvent').mockResolvedValue(undefined);

    await calendarService.createCalendarEvent('appt-1');

    expect(updateSpy).toHaveBeenCalledWith('appt-1');
    updateSpy.mockRestore();
  });

  it('should refresh access token on 401 response and retry request', async () => {
    vi.mocked(prisma.calendarEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: 'appt-1',
      scheduledStart: new Date(),
      scheduledEnd: new Date(),
      doctor: {
        id: 'doc-1',
        googleCalendarToken: 'expired-token',
        googleRefreshToken: 'valid-refresh-token',
      },
      patient: {
        user: { email: 'patient@example.com' },
      },
    } as any);

    // Mock fetch calls:
    // 1st: POST event (401)
    // 2nd: POST refresh token (200)
    // 3rd: POST event retry (200)
    const fetchMock = vi.mocked(global.fetch)
      .mockResolvedValueOnce({ status: 401, ok: false } as any) // POST event fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-fresh-token' }),
      } as any) // Token refresh succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-google-event-id' }),
      } as any); // POST event retry succeeds

    await calendarService.createCalendarEvent('appt-1');

    expect(doctorRepository.update).toHaveBeenCalledWith('doc-1', {
      googleCalendarToken: 'new-fresh-token',
    });
    expect(prisma.calendarEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ googleEventId: 'new-google-event-id' }),
    }));
  });
});
