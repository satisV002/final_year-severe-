// src/app.ts
import express, { Express } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import logger from './utils/logger';
import { notFound, errorHandler } from './middleware/errorMiddleware';
import { requestLogger } from './middleware/loggerMiddleware';
import groundwaterRouter from './routes/groundwater';
import authRouter from './routes/auth';
import liveDataRouter from './routes/liveData';
import devRoutes from './routes/devRoutes';
import mockDataRouter from './routes/mockData';
import proxyRouter from './routes/proxy';

const createApp = (): Express => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(cors({
    origin: env.isProd ? ['https://your-frontend-domain.com'] : true,
    credentials: true,
  }));

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
  app.use('/dev', devRoutes);                   // Dev / Self-Test endpoints

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