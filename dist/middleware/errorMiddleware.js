"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = exports.AppError = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const env_1 = require("../config/env");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof AppError ? err.message : 'Internal Server Error';
    logger_1.default.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
        error: err.stack,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(env_1.env.isDev && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, res, next) => {
    next(new AppError(`Not Found - ${req.originalUrl}`, 404));
};
exports.notFound = notFound;
//# sourceMappingURL=errorMiddleware.js.map