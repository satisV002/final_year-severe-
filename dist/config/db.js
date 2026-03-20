"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
// src/config/db.ts
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env"); // ← FIXED: import from './env' (not 'process')
const logger_1 = __importDefault(require("../utils/logger"));
const connectDB = async () => {
    try {
        // 1. Fix: env.isProd is boolean, but make it explicit & safe
        mongoose_1.default.set('autoIndex', env_1.env.isProd === true); // or !!env.isProd
        // 2. Better debug logging in dev (with timing approximation)
        if (env_1.env.isDev) {
            mongoose_1.default.set('debug', (collectionName, method, query, doc) => {
                const start = Date.now();
                logger_1.default.debug(`Mongoose: ${collectionName}.${method}()`, { query, doc });
                // Approximate completion time (async nature)
                setImmediate(() => {
                    logger_1.default.debug(`Mongoose: ${collectionName}.${method} completed in ~${Date.now() - start}ms`);
                });
            });
        }
        // 3. Fix: env.MONGODB_URI is required → safe to use ! (non-null assertion)
        //    If you prefer runtime check → add if (!env.MONGODB_URI) throw new Error(...)
        const conn = await mongoose_1.default.connect(env_1.env.MONGODB_URI, {
            maxPoolSize: 50,
            minPoolSize: 5,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 60000,
            family: 4,
            retryWrites: true,
            w: 'majority',
            heartbeatFrequencyMS: 10000,
            connectTimeoutMS: 30000,
        });
        logger_1.default.info(`MongoDB Atlas connected → ${conn.connection.host} (state: ${conn.connection.readyState})`);
        // Connection events
        mongoose_1.default.connection.on('connected', () => logger_1.default.info('MongoDB → connected event fired'));
        mongoose_1.default.connection.on('open', () => logger_1.default.info('MongoDB → open event fired'));
        mongoose_1.default.connection.on('error', (err) => logger_1.default.error('MongoDB connection error', { error: err.message, stack: err.stack }));
        mongoose_1.default.connection.on('disconnected', () => logger_1.default.warn('MongoDB disconnected - auto-reconnect will try'));
    }
    catch (error) {
        console.error('CRITICAL MONGO CRASH:', error);
        logger_1.default.error('MongoDB connection failed', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name,
        });
        process.exit(1);
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=db.js.map