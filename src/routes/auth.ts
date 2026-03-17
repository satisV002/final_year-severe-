// src/routes/auth.ts
import express from 'express';
import Joi from 'joi';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError } from '../middleware/errorMiddleware';
import { env } from '../config/env';
import logger from '../utils/logger';

const router = express.Router();

// Validation Schemas
const signupSchema = Joi.object({
  fullname: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Full name must be at least 3 characters',
    'any.required': 'Full name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

// Validation middleware
const validate = (schema: Joi.ObjectSchema) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map(d => d.message).join(', ');
    return next(new AppError(messages, 400));
  }
  next();
};

// Signup
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  const start = Date.now();
  try {
    logger.info('Signup attempt', { email: req.body.email });

    const { fullname, email, password } = req.body;

    const existing = await User.findOne({ email });
    logger.debug('User.findOne completed', { found: !!existing, time: Date.now() - start });

    if (existing) {
      return next(new AppError('Email already registered', 400));
    }

    const user = new User({ fullname, email, password });
    await user.save();
    logger.debug('User.save completed', { userId: user._id, time: Date.now() - start });

    // FIXED: proper jwt.sign call (no spread ...)
    const token = jwt.sign(
      { id: user._id.toString() },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY || '1h' } as SignOptions
    );

    res.status(201).json({
      success: true,
      token,
      user: { fullname, email },
    });

    logger.info('Signup success', { userId: user._id, duration: Date.now() - start });
  } catch (err: any) {
    logger.error('Signup failed', {
      error: err.message,
      stack: err.stack,
      duration: Date.now() - start,
    });
    next(new AppError('Signup failed', 500));
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const start = Date.now();
  try {
    logger.info('Login attempt', { email: req.body.email });

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    logger.debug('User.findOne completed', { found: !!user, time: Date.now() - start });

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    // FIXED: proper jwt.sign call
    const token = jwt.sign(
      { id: user._id.toString() },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRY || '1h' } as SignOptions
    );

    res.json({
      success: true,
      token,
      user: { fullname: user.fullname, email: user.email },
    });

    logger.info('Login success', { userId: user._id, duration: Date.now() - start });
  } catch (err: any) {
    logger.error('Login failed', {
      error: err.message,
      stack: err.stack,
      duration: Date.now() - start,
    });
    next(new AppError('Login failed', 500));
  }
});

export default router;