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
  }
}));

import { aiService } from '../ai.service.js';
import { prisma } from '../../../database/prismaClient.js';

const mockQueueAdd = vi.fn().mockResolvedValue({ id: 'job-ai-1' });

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(function() {
      return { add: mockQueueAdd };
    }),
    Worker: vi.fn().mockImplementation(function() {
      return { on: vi.fn() };
    }),
  };
});

vi.mock('../../../database/prismaClient.js', () => {
  const mockPrisma = {
    symptomSubmission: {
      findUnique: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    preVisitSummary: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    visitNote: {
      findUnique: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation((arg) => {
    if (typeof arg === 'function') {
      return arg(mockPrisma);
    }
    return Promise.all(arg);
  });
  return { prisma: mockPrisma };
});

describe('AI Service Tests', () => {
  const globalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation((arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg);
    });
    vi.mocked(prisma.symptomSubmission.findUnique).mockResolvedValue({} as any);
    vi.mocked(prisma.symptomSubmission.update).mockResolvedValue({} as any);
    vi.mocked(prisma.preVisitSummary.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.visitNote.findUnique).mockResolvedValue({} as any);
    vi.mocked(prisma.visitNote.update).mockResolvedValue({} as any);
    mockQueueAdd.mockResolvedValue({ id: 'job-ai-1' });
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  it('should generate pre-visit summary if LLM call succeeds', async () => {
    vi.mocked(prisma.symptomSubmission.findUnique).mockResolvedValue({
      id: 'sub-1',
      rawText: 'Fever and headache',
      llmProcessed: false,
    } as any);

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              urgencyLevel: 'ROUTINE',
              chiefComplaint: 'Mild fever and headache',
              suggestedQuestions: ['How long has the fever lasted?'],
            }),
          },
        },
      ],
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const success = await aiService.generatePreVisitSummarySync('appt-1');

    expect(success).toBe(true);
    expect(prisma.preVisitSummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          summary: 'Mild fever and headache',
          urgencyLevel: 'ROUTINE',
        }),
      })
    );
  });

  it('should set pending pre-visit summary and schedule background retry if LLM call fails', async () => {
    vi.mocked(prisma.symptomSubmission.findUnique).mockResolvedValue({
      id: 'sub-1',
      rawText: 'Fever and headache',
      llmProcessed: false,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    await aiService.generatePreVisitSummary('appt-1');

    expect(prisma.preVisitSummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          summary: 'Pending AI generation...',
          urgencyLevel: 'ROUTINE',
        }),
      })
    );

    expect(mockQueueAdd).toHaveBeenCalledWith(
      'pre-visit-retry',
      expect.objectContaining({ appointmentId: 'appt-1' }),
      expect.any(Object)
    );
  });

  it('should set pending post-visit summary and schedule background retry if LLM call fails for post-visit', async () => {
    vi.mocked(prisma.visitNote.findUnique).mockResolvedValue({
      id: 'note-1',
      doctorNotes: 'Patient has diabetes, monitor blood sugar.',
      llmProcessed: false,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    await aiService.generatePostVisitSummary('appt-1');

    expect(prisma.visitNote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientSummary: 'Pending AI generation...',
        }),
      })
    );

    expect(mockQueueAdd).toHaveBeenCalledWith(
      'post-visit-retry',
      expect.objectContaining({ appointmentId: 'appt-1' }),
      expect.any(Object)
    );
  });
});
