import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient.
 * In development, reuses the instance across hot-reloads to prevent
 * exhausting the connection pool.
 */
const prismaInstance: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (config.NODE_ENV !== 'production') {
  global.__prisma = prismaInstance;
}

/** Named export for direct use */
export const prisma = prismaInstance;

/** Default export */
export default prismaInstance;
