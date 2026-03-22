"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const redis_1 = require("./config/redis");
const logger_1 = __importDefault(require("./utils/logger"));
const env_1 = require("./config/env");
const mongoose_1 = __importDefault(require("mongoose"));
const dailyFetch_1 = require("./cron/dailyFetch");
const stationLoader_service_1 = require("./services/stationLoader.service");
const rainfallLoader_service_1 = require("./services/rainfallLoader.service");
// ── Global Error Listeners (Add FIRST to catch everything)
process.on("uncaughtException", (err) => {
    console.error("🚨 UNCAUGHT EXCEPTION:", err);
    logger_1.default.error("Uncaught Exception", { error: err.message, stack: err.stack });
    // Don't exit immediately in dev, but in prod we might need to
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("🚨 UNHANDLED REJECTION at:", promise, "reason:", reason);
    logger_1.default.error("Unhandled Rejection", { reason });
});
const app = (0, app_1.default)();
const server = http_1.default.createServer(app);
// ── Server-level Error Handling (e.g. EADDRINUSE)
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${env_1.env.PORT} is already in use. Please kill the process or use a different port.`);
    }
    else {
        console.error('❌ Server error:', err);
    }
    process.exit(1);
});
const startServer = async () => {
    try {
        // 1. Listen IMMEDIATELY so Railway/Load Balancers don't 502 during startup
        server.listen(env_1.env.PORT, () => {
            logger_1.default.info(`Server listening on ${env_1.env.PORT} (PID: ${process.pid})`);
            console.log(`🚀 Server started on port ${env_1.env.PORT}. Initializing services...`);
        });
        // 2. Background initialization
        console.log('📦 Loading memory-heavy datasets...');
        await (0, stationLoader_service_1.loadStations)();
        await (0, rainfallLoader_service_1.loadRainfall)();
        if (!env_1.env.isTest) {
            console.log('🔌 Connecting to databases...');
            await (0, db_1.connectDB)();
            try {
                await (0, redis_1.getRedisClient)();
                logger_1.default.info('DB + Redis connected');
            }
            catch {
                logger_1.default.warn('Redis unavailable — starting without cache layer');
            }
            if (env_1.env.isProd) {
                (0, dailyFetch_1.setupDailyFetchCron)();
            }
        }
        console.log(`✅ Initialization complete. Ready for traffic.`);
    }
    catch (err) {
        console.error('🔥 CRITICAL STARTUP ERROR:', err);
        process.exit(1);
    }
};
const shutdown = async (signal) => {
    logger_1.default.info(`${signal} received — shutting down...`);
    server.close();
    if (!env_1.env.isTest) {
        await (0, redis_1.closeRedis)().catch(() => { });
        await mongoose_1.default.connection.close().catch(() => { });
    }
    process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
startServer();
//# sourceMappingURL=server.js.map