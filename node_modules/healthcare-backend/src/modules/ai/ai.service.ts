import { prisma } from '../../database/prismaClient.js';
import { config } from '../../config/index.js';
import { logger } from '../../common/utils/logger.js';

/** Calls OpenAI chat completion. Returns null on any failure so callers degrade gracefully. */
async function callLLM(systemPrompt: string, userContent: string): Promise<string | null> {
  if (!config.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not set — LLM features disabled');
    return null;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      logger.error('OpenAI API error', { status: res.status });
      return null;
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    logger.error('LLM call failed', { error: err });
    return null;
  }
}

/** Strips PII patterns before sending to external LLM. */
function sanitizeForLLM(text: string): string {
  return text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\+?\d[\d\s\-().]{7,}\d\b/g, '[PHONE]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
}

export const aiService = {
  /**
   * Generates a pre-visit summary from symptom text.
   * Fails gracefully — schedules a background retry if LLM is down.
   */
  async generatePreVisitSummary(appointmentId: string): Promise<void> {
    const success = await aiService.generatePreVisitSummarySync(appointmentId);
    if (success) return;

    // FAILED: Set pending state in DB and queue retry in background
    logger.warn('Pre-visit LLM summary generation failed. Marking as pending and queueing retry.', { appointmentId });
    
    // Fetch symptom submission to get raw text for rawPrompt field
    const submission = await prisma.symptomSubmission.findUnique({ where: { appointmentId } });
    const sanitizedPrompt = submission ? sanitizeForLLM(submission.rawText) : '';

    await prisma.preVisitSummary.upsert({
      where: { appointmentId },
      update: {
        summary: 'Pending AI generation...',
        urgencyLevel: 'ROUTINE',
      },
      create: {
        appointmentId,
        summary: 'Pending AI generation...',
        urgencyLevel: 'ROUTINE',
        rawPrompt: sanitizedPrompt,
      },
    }).catch(err => {
      logger.error('Failed to create pending PreVisitSummary', { appointmentId, error: err });
    });

    // Queue background retry
    const { aiQueue } = await import('./ai.queue.js');
    await aiQueue.add('pre-visit-retry', { appointmentId }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }).catch(err => {
      logger.error('Failed to queue pre-visit retry job', { appointmentId, error: err });
    });
  },

  /** Synchronously attempts to generate and save a pre-visit summary. Returns boolean indicating success. */
  async generatePreVisitSummarySync(appointmentId: string): Promise<boolean> {
    const submission = await prisma.symptomSubmission.findUnique({
      where: { appointmentId },
    });
    if (!submission) return false;
    if (submission.llmProcessed) return true;

    const sanitized = sanitizeForLLM(submission.rawText);

    const systemPrompt = `You are a clinical triage assistant. Given patient-reported symptoms, 
respond ONLY with a JSON object: 
{ "urgencyLevel": "ROUTINE"|"URGENT"|"CRITICAL", 
  "chiefComplaint": "one sentence summary", 
  "suggestedQuestions": ["question1","question2","question3"] }
Never include PII. Be concise and clinically accurate.`;

    const raw = await callLLM(systemPrompt, sanitized);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as {
        urgencyLevel: 'ROUTINE' | 'URGENT' | 'CRITICAL';
        chiefComplaint: string;
        suggestedQuestions: string[];
      };

      await prisma.$transaction([
        prisma.symptomSubmission.update({
          where: { appointmentId },
          data: {
            urgencyLevel: parsed.urgencyLevel ?? 'ROUTINE',
            chiefComplaint: parsed.chiefComplaint,
            suggestedQuestions: parsed.suggestedQuestions ?? [],
            llmProcessed: true,
          },
        }),
        prisma.preVisitSummary.upsert({
          where: { appointmentId },
          update: {
            summary: parsed.chiefComplaint,
            urgencyLevel: parsed.urgencyLevel ?? 'ROUTINE',
          },
          create: {
            appointmentId,
            summary: parsed.chiefComplaint,
            urgencyLevel: parsed.urgencyLevel ?? 'ROUTINE',
            rawPrompt: sanitized,
          },
        }),
      ]);

      logger.info('Pre-visit summary generated successfully', { appointmentId });
      return true;
    } catch (err) {
      logger.warn('Failed to parse pre-visit summary JSON', { appointmentId, error: err });
      return false;
    }
  },

  /**
   * Generates a patient-friendly summary from doctor notes.
   * Fails gracefully — schedules a background retry if LLM is down.
   */
  async generatePostVisitSummary(appointmentId: string): Promise<void> {
    const success = await aiService.generatePostVisitSummarySync(appointmentId);
    if (success) return;

    // FAILED: Set pending state in DB and queue retry in background
    logger.warn('Post-visit LLM summary generation failed. Marking as pending and queueing retry.', { appointmentId });

    await prisma.visitNote.update({
      where: { appointmentId },
      data: {
        patientSummary: 'Pending AI generation...',
        glossaryMappings: {},
      },
    }).catch(err => {
      logger.error('Failed to update pending VisitNote patientSummary', { appointmentId, error: err });
    });

    // Queue background retry
    const { aiQueue } = await import('./ai.queue.js');
    await aiQueue.add('post-visit-retry', { appointmentId }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }).catch(err => {
      logger.error('Failed to queue post-visit retry job', { appointmentId, error: err });
    });
  },

  /** Synchronously attempts to generate and save a post-visit summary. Returns boolean indicating success. */
  async generatePostVisitSummarySync(appointmentId: string): Promise<boolean> {
    const note = await prisma.visitNote.findUnique({ where: { appointmentId } });
    if (!note) return false;
    if (note.llmProcessed) return true;

    const sanitized = sanitizeForLLM(note.doctorNotes);

    const systemPrompt = `You are a patient-facing medical interpreter. 
Convert clinical notes into an 8th-grade reading level patient summary.
Respond ONLY with JSON: 
{ "patientSummary": "...", 
  "glossaryMappings": { "medical_term": "plain_english_explanation" } }
Never include PII. Be empathetic and clear.`;

    const raw = await callLLM(systemPrompt, sanitized);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as {
        patientSummary: string;
        glossaryMappings: Record<string, string>;
      };

      await prisma.visitNote.update({
        where: { appointmentId },
        data: {
          patientSummary: parsed.patientSummary,
          glossaryMappings: parsed.glossaryMappings ?? {},
          llmProcessed: true,
        },
      });

      logger.info('Post-visit summary generated successfully', { appointmentId });
      return true;
    } catch (err) {
      logger.warn('Failed to parse post-visit summary JSON', { appointmentId, error: err });
      return false;
    }
  },

  /**
   * Returns an AI triage assessment directly to the patient.
   * Does NOT require an appointment — standalone symptom check.
   */
  async triageSymptoms(symptomText: string) {
    const sanitized = sanitizeForLLM(symptomText);

    const systemPrompt = `You are a clinical triage assistant. 
Assess the symptoms and respond ONLY with JSON:
{ "urgencyLevel": "ROUTINE"|"URGENT"|"CRITICAL",
  "suggestedSpecialty": "string",
  "disclaimer": "AI suggestion only. Dial 911 if experiencing an emergency." }`;

    const raw = await callLLM(systemPrompt, sanitized);

    if (!raw) {
      return {
        urgencyLevel: 'ROUTINE' as const,
        suggestedSpecialty: 'General Practice',
        disclaimer: 'AI assessment unavailable. Please consult a healthcare provider.',
        llmAvailable: false,
      };
    }

    try {
      const parsed = JSON.parse(raw) as {
        urgencyLevel: 'ROUTINE' | 'URGENT' | 'CRITICAL';
        suggestedSpecialty: string;
        disclaimer: string;
      };
      return { ...parsed, llmAvailable: true };
    } catch {
      return {
        urgencyLevel: 'ROUTINE' as const,
        suggestedSpecialty: 'General Practice',
        disclaimer: 'AI assessment unavailable. Please consult a healthcare provider.',
        llmAvailable: false,
      };
    }
  },
};
