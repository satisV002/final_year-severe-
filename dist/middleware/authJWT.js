"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorMiddleware_1 = require("./errorMiddleware");
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../utils/logger"));
const authJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new errorMiddleware_1.AppError('Authorization token required', 401));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    }
    catch (err) {
        logger_1.default.warn('JWT verification failed', { error: err.message });
        next(new errorMiddleware_1.AppError('Invalid or expired token', 401));
    }
};
exports.authJWT = authJWT;
//# sourceMappingURL=authJWT.js.map