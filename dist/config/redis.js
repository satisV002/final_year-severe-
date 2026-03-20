"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedis = exports.getRedisClient = void 0;
const redis_1 = require("redis");
const env_1 = require("./env");
const logger_1 = __importDefault(require("../utils/logger"));
let redisClient = null;
const getRedisClient = async () => {
    if (redisClient?.isOpen)
        return redisClient;
    redisClient = (0, redis_1.createClient)({
        url: env_1.env.REDIS_URL,
        socket: {
            reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
            connectTimeout: 10000,
        },
    });
    redisClient.on('error', (err) => logger_1.default.error('Redis error', { error: err.message }));
    redisClient.on('connect', () => logger_1.default.info('Redis connected successfully'));
    redisClient.on('reconnecting', () => logger_1.default.warn('Redis reconnecting...'));
    try {
        await redisClient.connect();
        await redisClient.ping(); // Verify connection
        logger_1.default.info('Redis PING successful');
    }
    catch (err) {
        logger_1.default.warn('Redis connection failed — continuing without Redis cache', { error: err.message });
        redisClient = null; // reset so we don't return a broken client
        return null; // graceful degradation: callers will fall back
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
const closeRedis = async () => {
    if (redisClient?.isOpen) {
        await redisClient.quit().catch((e) => logger_1.default.error('Redis quit error', { e }));
        redisClient = null;
        logger_1.default.info('Redis connection closed');
    }
};
exports.closeRedis = closeRedis;
//# sourceMappingURL=redis.js.map