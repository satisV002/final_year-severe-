// src/app.ts
import express, { Express } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';

import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import logger from './utils/logger';
import { notFound, errorHandler } from './middleware/errorMiddleware';
import { requestLogger } from './middleware/loggerMiddleware';
import groundwaterRouter from './routes/groundwater';
import authRouter from './routes/auth';
import liveDataRouter from './routes/liveData';
import mockDataRouter from './routes/mockData';
import proxyRouter from './routes/proxy';
const createApp = (): Express => {
  const app = express();


  // ─── DIAGNOSTIC LOGS ──────────────────────────────────────────
  console.log('🧪 Middleware Diagnostics:', {
    express: typeof express,
    helmet: typeof helmet,
    compression: typeof compression,
    morgan: typeof morgan,
    cors: typeof cors,
    hpp: typeof hpp,
    rateLimit: typeof rateLimit
  });

  // Security headers
  if (typeof helmet === 'function') {
    app.use(helmet());
  } else {
    console.error('❌ helmet is not a function!', helmet);
  }


  // ─── CORS ───────────────────────────────────────────────────────────────────
  const ALLOWED_ORIGINS = [
    'https://final-year-client-three.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
  ];

  const corsOptions = {
    origin: (origin: string | undefined, callback: any) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || (env.isDev && origin.startsWith('http://localhost:'))) {
        callback(null, true);
      } else {
        callback(new Error('CORS: Origin not allowed'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 204,
  };

  // 1. CORS Middleware (Applied FIRST)
  app.use(cors(corsOptions));
  
  // 2. Handle all OPTIONS requests explicitly (Express 5 compatible syntax)
  app.options('(.*)', cors(corsOptions));

  // Request Logger for Debugging (Applied early)
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  // ─────────────────────────────────────────────────────────────────────────────


  // 3. Body parsing (Applied AFTER CORS)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Security middlewares
  app.use(hpp());

  // Rate limiting (global) - disable if 502 persists
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: { success: false, error: 'Too many requests — try again later' },
    standardHeaders: true,
  }));

  // Compression
  app.use(compression());

  // Logging
  if (env.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
  }

  // Legacy request logging
  app.use(requestLogger);

  // Routes
  app.use('/api/v1/auth', authRouter);          // Public: Signup/Login
  app.use('/api/v1', groundwaterRouter);        // Groundwater endpoints
  app.use('/api/v1', liveDataRouter);              // Live Data endpoints
  app.use('/api/v1', proxyRouter);                 // Generic Proxy endpoint
  app.use('/api/v1/mock', mockDataRouter);      // GUARANTEED MOCK DATA API 500+ Records

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // Test fast (no DB)
  app.get('/test-fast', (req, res) => {
    res.json({ message: 'This should be instant', time: new Date().toISOString() });
  });

  // 404 handler (must be after all routes)
  app.use(notFound);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;