"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
// src/middleware/loggerMiddleware.ts (enhanced)
const requestLogger = (req, res, next) => {
    const start = process.hrtime(); // high resolution time
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const durationMs = (seconds * 1000) + (nanoseconds / 1e6);
        logger_1.default.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(2)}ms`, {
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined, // careful in prod
        });
        // Alert if too slow
        if (durationMs > 5000) {
            logger_1.default.warn(`SLOW REQUEST DETECTED: ${req.method} ${req.originalUrl} took ${durationMs.toFixed(2)}ms`);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=loggerMiddleware.js.map