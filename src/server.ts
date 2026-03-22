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

// ─── START SERVER ────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. LISTEN IMMEDIATELY (Prevent 502)
    const port = process.env.PORT || env.PORT || 7000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`\n🚀 [SYSTEM] Server listening on 0.0.0.0:${port}`);
      console.log(`🌍 [SYSTEM] Environment: ${env.NODE_ENV}`);
      console.log(`⏱️ [SYSTEM] Time: ${new Date().toISOString()}\n`);
    });

    // 2. BACKGROUND INITIALIZATION (Non-blocking)
    (async () => {
      try {
        console.log('📦 [INIT] Starting Background Data Loading...');
        
        // Load data files (Async)
        await loadStations();
        await loadRainfall();
        console.log('✅ [INIT] Datasets loaded successfully');

        if (!env.isTest) {
          console.log('🔌 [INIT] Connecting to MongoDB...');
          await connectDB();
          console.log('✅ [INIT] MongoDB connected');

          try {
            console.log('🔌 [INIT] Connecting to Redis...');
            await getRedisClient();
            console.log('✅ [INIT] Redis connected');
          } catch (err) {
            console.warn('⚠️ [INIT] Redis connection failed - proceeding without cache');
          }

          if (env.isProd) {
            setupDailyFetchCron();
            console.log('⏰ [INIT] Cron tasks scheduled');
          }
        }
        
        console.log('🎉 [INIT] ALL SERVICES INITIALIZED AND READY');
      } catch (initErr: any) {
        console.error('❌ [INIT FAILURE] Background initialization failed:', initErr);
        // We don't exit(1) here because we want the server to stay alive for diagnostics
      }
    })();

  } catch (err: any) {
    console.error('🔥 [CRITICAL] FATAL SERVER STARTUP ERROR:', err);
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

