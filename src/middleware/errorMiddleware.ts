import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Specific Error Handlers
  if (err.name === 'ValidationError') statusCode = 400; // Mongoose Validation Error
  if (err.code === 11000) {                          // Mongoose Duplicate Key Error
    statusCode = 400;
    message = 'Duplicate field value entered';
  }
  if (err.name === 'JsonWebTokenError') statusCode = 401; // Invalid Token
  if (err.name === 'TokenExpiredError') statusCode = 401; // Expired Token

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
    stack: err.stack,
    ip: req.ip,
    path: req.path
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.isDev && { stack: err.stack }),
  });
};


export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
};