// src/middlewares/loggerMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// src/middleware/loggerMiddleware.ts (enhanced)

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();  // high resolution time

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000) + (nanoseconds / 1e6);

    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(2)}ms`, {
      ip: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,  // careful in prod
    });

    // Alert if too slow
    if (durationMs > 5000) {
      logger.warn(`SLOW REQUEST DETECTED: ${req.method} ${req.originalUrl} took ${durationMs.toFixed(2)}ms`);
    }
  });

  next();
};