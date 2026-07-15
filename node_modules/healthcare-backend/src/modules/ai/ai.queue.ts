import { Queue, Worker, type Job } from 'bullmq';
import { config } from '../../config/index.js';
import { logger } from '../../common/utils/logger.js';
import { aiService } from './ai.service.js';

const connection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
};

export const aiQueue = new Queue('ai-queue', { connection });

export function startAIWorker(): Worker {
  const worker = new Worker(
    'ai-queue',
    async (job: Job) => {
      const { appointmentId } = job.data;
      logger.info(`AI background job running: ${job.name}`, { appointmentId, attempts: job.attemptsMade + 1 });

      if (job.name === 'pre-visit-retry') {
        const success = await aiService.generatePreVisitSummarySync(appointmentId);
        if (!success) {
          throw new Error(`Failed to generate pre-visit summary in background retry for appointment ${appointmentId}`);
        }
      } else if (job.name === 'post-visit-retry') {
        const success = await aiService.generatePostVisitSummarySync(appointmentId);
        if (!success) {
          throw new Error(`Failed to generate post-visit summary in background retry for appointment ${appointmentId}`);
        }
      }
    },
    { connection, concurrency: 2 }
  );

  worker.on('failed', (job, err) => {
    logger.error(`AI background job ${job?.id} failed permanently: ${err.message}`, { attempts: job?.attemptsMade });
  });

  return worker;
}
