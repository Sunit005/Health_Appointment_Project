import { Queue, Worker, type Job } from 'bullmq';
import { config } from '../../config/index.js';
import { logger } from '../../common/utils/logger.js';
import { prisma } from '../../database/prismaClient.js';
import cronParser from 'cron-parser';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface ReminderJobData {
  reminderId: string;
  patientId: string;
  medicationName: string;
  dosageInstruction: string;
  frequencyCron: string;
}

const connection = { host: config.REDIS_HOST, port: config.REDIS_PORT, password: config.REDIS_PASSWORD || undefined };

export const emailQueue = new Queue<EmailJobData>('email-queue', { connection });
export const reminderQueue = new Queue<ReminderJobData>('reminder-queue', { connection });
export const deadLetterQueue = new Queue<{ originalJobId: string; data: EmailJobData; failedAt: string; error: string }>('dead-letter-queue', { connection });

/** Dispatches a single email job with retry logic. */
export async function queueEmail(data: EmailJobData): Promise<void> {
  await emailQueue.add('send-email', data, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

/** Schedules a recurring medication reminder. */
export async function scheduleMedicationReminder(data: ReminderJobData): Promise<void> {
  await reminderQueue.add('medication-reminder', data, {
    repeat: { pattern: data.frequencyCron, tz: 'UTC' },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

/** Email worker — sends via SendGrid or logs in dev. */
export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    'email-queue',
    async (job: Job<EmailJobData>) => {
      const { to, subject, body } = job.data;
      const attempts = job.attemptsMade;
      if (attempts > 0) {
        logger.warn(`Retrying email job ${job.id} (Attempt ${attempts + 1}/5)`, { to, subject, attempt: attempts + 1 });
      }

      if (!config.SENDGRID_API_KEY || config.SENDGRID_API_KEY === 'mock-sendgrid-api-key') {
        logger.info('[DEV] Email skipped (no SENDGRID_API_KEY)', { to, subject });
        return;
      }

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: config.EMAIL_FROM_ADDRESS },
          subject,
          content: [{ type: 'text/plain', value: body }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`SendGrid error ${res.status}: ${text}`);
      }

      logger.info('Email sent successfully', { to, subject });
    },
    { connection, concurrency: 5 },
  );

  worker.on('failed', async (job, err) => {
    if (job) {
      logger.warn(`Email job ${job.id} failed on attempt ${job.attemptsMade}/5. Error: ${err.message}`);
      if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
        logger.error(`Email job ${job.id} failed permanently after 5 attempts. Dead-lettering...`, {
          to: job.data.to,
          subject: job.data.subject,
          error: err.message,
        });
        await deadLetterQueue.add('dead-letter', {
          originalJobId: job.id ?? 'unknown',
          data: job.data,
          failedAt: new Date().toISOString(),
          error: err.message,
        }).catch(dlqErr => {
          logger.error('Failed to add job to deadLetterQueue', { error: dlqErr.message });
        });
      }
    }
  });

  return worker;
}

/** Reminder worker — logs and could trigger push notifications. */
export function startReminderWorker(): Worker<ReminderJobData> {
  return new Worker<ReminderJobData>(
    'reminder-queue',
    async (job: Job<ReminderJobData>) => {
      const { reminderId, patientId, medicationName, dosageInstruction, frequencyCron } = job.data;
      logger.info('Medication reminder fired', { reminderId, patientId, medicationName, dosageInstruction });

      // 1. Create a MedicationReminderLog in the database
      const log = await prisma.medicationReminderLog.create({
        data: {
          medicationReminderId: reminderId,
          scheduledTime: new Date(),
          status: 'PENDING',
        },
      });

      // 2. Fetch the patient user's email
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { user: { select: { email: true } } },
      });

      // 3. Create a Notification record
      const notifBody = `Time to take your medication: ${medicationName}. Dosage: ${dosageInstruction}.`;
      await prisma.notification.create({
        data: {
          patientId,
          type: 'EMAIL',
          subject: `Medication Reminder: ${medicationName}`,
          body: notifBody,
          metadata: { reminderId, logId: log.id },
        },
      });

      // 4. Dispatch a retryable email reminder
      if (patient?.user?.email) {
        await queueEmail({
          to: patient.user.email,
          subject: `Medication Reminder: ${medicationName}`,
          body: notifBody,
          metadata: { reminderId, logId: log.id },
        }).catch(() => {});
      }

      // 5. Update nextFireAt in the database
      let nextFireAt: Date | null = null;
      try {
        const interval = cronParser.parseExpression(frequencyCron);
        nextFireAt = interval.next().toDate();
      } catch (err) {
        logger.error('Failed to calculate next fire time in worker', { error: err });
      }

      await prisma.medicationReminder.update({
        where: { id: reminderId },
        data: { nextFireAt },
      });
    },
    { connection, concurrency: 10 },
  );
}
