import { createClient } from 'redis';
import { env } from './env';
import logger from '../utils/logger';

let redisClient: ReturnType<typeof createClient> | null = null;

export const getRedisClient = async () => {
  if (redisClient?.isOpen) return redisClient;

  redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
      connectTimeout: 10000,
    },
  });

  redisClient.on('error', (err) => logger.error('Redis error', { error: err.message }));
  redisClient.on('connect', () => logger.info('Redis connected successfully'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  try {
    await redisClient.connect();
    await redisClient.ping(); // Verify connection
    logger.info('Redis PING successful');
  } catch (err: any) {
    logger.warn('Redis connection failed — continuing without Redis cache', { error: err.message });
    redisClient = null;   // reset so we don't return a broken client
    return null as any;   // graceful degradation: callers will fall back
  }

  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit().catch((e) => logger.error('Redis quit error', { e }));
    redisClient = null;
    logger.info('Redis connection closed');
  }
};