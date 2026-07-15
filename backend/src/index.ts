import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma } from './database/prismaClient.js';
import { logger } from './common/utils/logger.js';
import { startEmailWorker, startReminderWorker } from './modules/notification/notification.queue.js';
import { startAIWorker } from './modules/ai/ai.queue.js';

const app = createApp();

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }

  // Start BullMQ background workers
  const emailWorker = startEmailWorker();
  const reminderWorker = startReminderWorker();
  const aiWorker = startAIWorker();

  emailWorker.on('failed', (job, err) =>
    logger.error('Email job failed', { jobId: job?.id, error: err }),
  );
  reminderWorker.on('failed', (job, err) =>
    logger.error('Reminder job failed', { jobId: job?.id, error: err }),
  );
  aiWorker.on('failed', (job, err) =>
    logger.error('AI background job failed', { jobId: job?.id, error: err }),
  );

  logger.info('Background workers started (email + reminder + AI)');

  const server = app.listen(config.PORT, () => {
    logger.info('Healthcare API server started', {
      port: config.PORT,
      environment: config.NODE_ENV,
      url: `http://localhost:${config.PORT}`,
    });
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — starting graceful shutdown`);

    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server', { error: err });
        process.exit(1);
      }

      try {
        await emailWorker.close();
        await reminderWorker.close();
        await aiWorker.close();
        await prisma.$disconnect();
        logger.info('All connections closed');
      } catch (closeErr) {
        logger.error('Error during shutdown cleanup', { error: closeErr });
      }

      logger.info('Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 15_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    void shutdown('unhandledRejection');
  });
}

bootstrap();
