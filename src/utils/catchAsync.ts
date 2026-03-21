import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an asynchronous Express route handler to catch any errors and pass them to the next() middleware.
 * This prevents unhandled promise rejections from crashing the Node.js process.
 */
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
