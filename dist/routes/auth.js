"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const errorMiddleware_1 = require("../middleware/errorMiddleware");
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
// Validation Schemas
const signupSchema = joi_1.default.object({
    fullname: joi_1.default.string().min(3).max(50).required().messages({
        'string.min': 'Full name must be at least 3 characters',
        'any.required': 'Full name is required',
    }),
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Please enter a valid email',
        'any.required': 'Email is required',
    }),
    password: joi_1.default.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
        .required()
        .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required',
    }),
});
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(8).required(),
});
// Validation middleware
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        const messages = error.details.map(d => d.message).join(', ');
        return next(new errorMiddleware_1.AppError(messages, 400));
    }
    next();
};
// Signup
router.post('/signup', validate(signupSchema), async (req, res, next) => {
    const start = Date.now();
    try {
        logger_1.default.info('Signup attempt', { email: req.body.email });
        const { fullname, email, password } = req.body;
        const existing = await User_1.User.findOne({ email });
        logger_1.default.debug('User.findOne completed', { found: !!existing, time: Date.now() - start });
        if (existing) {
            return next(new errorMiddleware_1.AppError('Email already registered', 400));
        }
        const user = new User_1.User({ fullname, email, password });
        await user.save();
        logger_1.default.debug('User.save completed', { userId: user._id, time: Date.now() - start });
        // FIXED: proper jwt.sign call (no spread ...)
        const token = jsonwebtoken_1.default.sign({ id: user._id.toString() }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRY || '1h' });
        res.status(201).json({
            success: true,
            token,
            user: { fullname, email },
        });
        logger_1.default.info('Signup success', { userId: user._id, duration: Date.now() - start });
    }
    catch (err) {
        logger_1.default.error('Signup failed', {
            error: err.message,
            stack: err.stack,
            duration: Date.now() - start,
        });
        next(new errorMiddleware_1.AppError('Signup failed', 500));
    }
});
// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
    const start = Date.now();
    try {
        logger_1.default.info('Login attempt', { email: req.body.email });
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email }).select('+password');
        logger_1.default.debug('User.findOne completed', { found: !!user, time: Date.now() - start });
        if (!user) {
            return next(new errorMiddleware_1.AppError('Invalid email or password', 401));
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return next(new errorMiddleware_1.AppError('Invalid email or password', 401));
        }
        // FIXED: proper jwt.sign call
        const token = jsonwebtoken_1.default.sign({ id: user._id.toString() }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRY || '1h' });
        res.json({
            success: true,
            token,
            user: { fullname: user.fullname, email: user.email },
        });
        logger_1.default.info('Login success', { userId: user._id, duration: Date.now() - start });
    }
    catch (err) {
        logger_1.default.error('Login failed', {
            error: err.message,
            stack: err.stack,
            duration: Date.now() - start,
        });
        next(new errorMiddleware_1.AppError('Login failed', 500));
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map