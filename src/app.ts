// src/app.ts
import express, { Express } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
const cors = require('cors');

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
    env.FRONTEND_URL,                    // From .env (Production/Dev override)
    'https://final-year-client-three.vercel.app', // Explicit production URL
    'http://localhost:3000',             // Next.js default
    'http://localhost:3001',             // Alternate
    'http://localhost:3002',             // Alternate
    'http://localhost:3005',             // Alternatea
    'http://localhost:5173',             // Vite default
    'http://localhost:8080',             // Legacy/Other
  ].filter(Boolean); // Remove any undefined/null values

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, Postman etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Development convenience: allow any localhost in dev mode (optional, but safer to be explicit)
      if (env.isDev && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      callback(new Error(`CORS: Origin not allowed → ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 204,
  };

  // Apply CORS middleware
  const actualCors = typeof cors === 'function' ? cors : (cors?.default || cors);
  if (typeof actualCors === 'function') {
    app.use(actualCors(corsOptions));
  } else {
    console.warn('⚠️ cors middleware fallback used');
  }

  // Debug endpoint to check CORS config (Public for now)
  app.get('/api/v1/debug-cors', (req, res) => {
    res.json({
      allowedOrigins: ALLOWED_ORIGINS,
      currentOrigin: req.headers.origin,
      isMatch: req.headers.origin ? ALLOWED_ORIGINS.includes(req.headers.origin) : 'no origin',
      env: {
        isDev: env.isDev,
        frontendUrl: env.FRONTEND_URL
      }
    });
  });

  // Manual header fallback for extra stability
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    const isAllowed = origin && (ALLOWED_ORIGINS.includes(origin) || (env.isDev && origin.startsWith('http://localhost:')));
    
    if (origin && isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    // Handle preflight for manual fallback
    if (req.method === 'OPTIONS' && isAllowed) {
      return res.status(204).end();
    }
    
    next();
  });
  // ─────────────────────────────────────────────────────────────────────────────


  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Security middlewares
  app.use(hpp());

  // Rate limiting (global)
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: { success: false, error: 'Too many requests — try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Compression
  app.use(compression());

  // Logging
  if (env.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
  }

  // Request logging
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