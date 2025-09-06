import { Request, Response, NextFunction } from 'express';
import {MyLogger} from '@/utils/new-logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let action = 'Global Error Handler'
  let { statusCode = 500, message } = err;

  // Log error for debugging
  MyLogger.error(action, err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced record not found';
  }

  MyLogger.warn(action, { 
    finalStatusCode: statusCode, 
    finalMessage: message,
    url: req.url,
    method: req.method
  });

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  let action = 'Create Error'
  try {
    MyLogger.info(action, { message, statusCode })
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    MyLogger.success(action, { message, statusCode })
    return error;
  } catch (err: any) {
    MyLogger.error(action, err, { message, statusCode })
    throw err;
  }
};
