import http from 'http';
import createApp from './app';
import { connectDB } from './config/db';
import { getRedisClient, closeRedis } from './config/redis';
import logger from './utils/logger';
import { env } from './config/env';
import mongoose from 'mongoose';
import { setupDailyFetchCron } from './cron/dailyFetch';
import { loadStations } from './services/stationLoader.service';
import { loadRainfall } from './services/rainfallLoader.service';

const app = createApp();          // ✅ FIX
const server = http.createServer(app);

const startServer = async () => {
  try {
    await loadStations(); // Preload stations into memory
    await loadRainfall(); // Preload rainfall into memory

    if (!env.isTest) {
      await connectDB();

      // Redis is optional — failure won't crash the server
      try {
        await getRedisClient();
        logger.info('DB + Redis connected');
      } catch {
        logger.warn('Redis unavailable — starting without cache layer');
        logger.info('DB connected (Redis skipped)');
      }

      if (env.isProd) {
        setupDailyFetchCron();
      }
    } else {
      logger.info('TEST MODE → DB / Redis / Cron skipped');
    }

    server.listen(env.PORT, () => {
      logger.info(`Server running → http://localhost:${env.PORT}`);
    });
  } catch (err: any) {
    console.error('CRITICAL SERVER CRASH:', err);
    logger.error('Server startup failed', { error: err.message });
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down...`);
  server.close();

  if (!env.isTest) {
    await closeRedis().catch(() => { });
    await mongoose.connection.close().catch(() => { });
  }

  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

startServer();
