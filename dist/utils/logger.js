"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const env_1 = require("../config/env");
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
}));
const logger = winston_1.default.createLogger({
    level: env_1.env.LOG_LEVEL,
    format: logFormat,
    defaultMeta: { service: 'groundwater-backend' },
    transports: [
        new winston_1.default.transports.Console({
            format: env_1.env.isDev ? consoleFormat : logFormat,
        }),
        ...(env_1.env.isProd ? [
            new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5242880, maxFiles: 10 }),
            new winston_1.default.transports.File({ filename: 'logs/combined.log', maxsize: 5242880, maxFiles: 10 }),
        ] : []),
    ],
    exceptionHandlers: [new winston_1.default.transports.File({ filename: 'logs/exceptions.log' })],
    rejectionHandlers: [new winston_1.default.transports.File({ filename: 'logs/rejections.log' })],
});
exports.default = logger;
//# sourceMappingURL=logger.js.map