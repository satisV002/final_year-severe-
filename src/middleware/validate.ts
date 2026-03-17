// src/middlewares/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorMiddleware';

export const validateQueryParams = (req: Request, res: Response, next: NextFunction) => {
  const { state, district, village, pinCode, fromDate, toDate } = req.query;

  // State is required
  if (!state || typeof state !== 'string' || state.trim().length < 2) {
    return next(new AppError('Valid state name is required', 400));
  }

  // Optional fields validation
  if (district && typeof district !== 'string') {
    return next(new AppError('District must be a string', 400));
  }

  if (village && typeof village !== 'string') {
    return next(new AppError('Village must be a string', 400));
  }

  if (pinCode && !/^\d{6}$/.test(pinCode as string)) {
    return next(new AppError('PIN code must be exactly 6 digits', 400));
  }

  // Date validation
  if (fromDate) {
    const from = new Date(fromDate as string);
    if (isNaN(from.getTime())) {
      return next(new AppError('Invalid fromDate format (use YYYY-MM-DD)', 400));
    }
  }

  if (toDate) {
    const to = new Date(toDate as string);
    if (isNaN(to.getTime())) {
      return next(new AppError('Invalid toDate format (use YYYY-MM-DD)', 400));
    }
  }

  next();
};