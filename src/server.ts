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

// ── Global Error Listeners (Add FIRST to catch everything)
process.on("uncaughtException", (err) => {
  console.error("🚨 UNCAUGHT EXCEPTION:", err);
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  // Don't exit immediately in dev, but in prod we might need to
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 UNHANDLED REJECTION at:", promise, "reason:", reason);
  logger.error("Unhandled Rejection", { reason });
});

const app = createApp();
const server = http.createServer(app);

// ── Server-level Error Handling (e.g. EADDRINUSE)
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${env.PORT} is already in use. Please kill the process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1. Listen IMMEDIATELY so Railway/Load Balancers don't 502 during startup
    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server listening on 0.0.0.0:${env.PORT} (PID: ${process.pid})`);
      console.log(`🚀 Server started on port ${env.PORT}. Initializing services...`);
    });

    // 2. Background initialization
    console.log('📦 Skipping memory-heavy datasets for debugging...');
    // await loadStations(); 
    // await loadRainfall(); 

    if (!env.isTest) {
      console.log('🔌 Connecting to databases...');
      await connectDB();

      try {
        await getRedisClient();
        logger.info('DB + Redis connected');
      } catch {
        logger.warn('Redis unavailable — starting without cache layer');
      }

      if (env.isProd) {
        setupDailyFetchCron();
      }
    }

    console.log(`✅ Initialization complete. Ready for traffic.`);
  } catch (err: any) {
    console.error('🔥 CRITICAL STARTUP ERROR:', err);
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

startServer();

