import { Redis } from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from './logger.js';

const redisClient = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redisClient.on('connect', () => logger.info('Redis connection established'));
redisClient.on('error', (err) => logger.error('Redis connection error', { error: err }));

export default redisClient;
