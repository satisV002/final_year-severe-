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
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    // Specific Error Handlers
    if (err.name === 'ValidationError')
        statusCode = 400; // Mongoose Validation Error
    if (err.code === 11000) { // Mongoose Duplicate Key Error
        statusCode = 400;
        message = 'Duplicate field value entered';
    }
    if (err.name === 'JsonWebTokenError')
        statusCode = 401; // Invalid Token
    if (err.name === 'TokenExpiredError')
        statusCode = 401; // Expired Token
    logger_1.default.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
        stack: err.stack,
        ip: req.ip,
        path: req.path
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