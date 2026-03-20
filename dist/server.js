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
const app = (0, app_1.default)(); // ✅ FIX
const server = http_1.default.createServer(app);
const startServer = async () => {
    try {
        await (0, stationLoader_service_1.loadStations)(); // Preload stations into memory
        await (0, rainfallLoader_service_1.loadRainfall)(); // Preload rainfall into memory
        if (!env_1.env.isTest) {
            await (0, db_1.connectDB)();
            // Redis is optional — failure won't crash the server
            try {
                await (0, redis_1.getRedisClient)();
                logger_1.default.info('DB + Redis connected');
            }
            catch {
                logger_1.default.warn('Redis unavailable — starting without cache layer');
                logger_1.default.info('DB connected (Redis skipped)');
            }
            if (env_1.env.isProd) {
                (0, dailyFetch_1.setupDailyFetchCron)();
            }
        }
        else {
            logger_1.default.info('TEST MODE → DB / Redis / Cron skipped');
        }
        server.listen(env_1.env.PORT, () => {
            logger_1.default.info(`Server running → http://localhost:${env_1.env.PORT}`);
        });
    }
    catch (err) {
        console.error('CRITICAL SERVER CRASH:', err);
        logger_1.default.error('Server startup failed', { error: err.message });
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
process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});
startServer();
//# sourceMappingURL=server.js.map