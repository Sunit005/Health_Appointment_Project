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

import { queueEmail, emailQueue } from '../notification.queue.js';

const { mockAdd } = vi.hoisted(() => {
  return { mockAdd: vi.fn().mockResolvedValue({ id: 'job-1' }) };
});

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(function() {
      return { add: mockAdd };
    }),
    Worker: vi.fn().mockImplementation(function() {
      return { on: vi.fn() };
    }),
  };
});

describe('Notification Queue Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should add email job to queue with attempts and backoff options', async () => {
    await queueEmail({
      to: 'test@example.com',
      subject: 'Hello',
      body: 'World',
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ to: 'test@example.com' }),
      expect.objectContaining({
        attempts: 5,
        backoff: expect.objectContaining({ type: 'exponential', delay: 2000 }),
      }),
    );
  });
});
