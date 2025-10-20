import { Request, Response, NextFunction } from 'express';
import { CustomError, isCustomError, formatErrorResponse, ERROR_CODES } from '../utils/errors';
import { logger, logError } from '../utils/logger';
import { ZodError } from 'zod';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const statusCode = 400;
    
    logError(error, {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      validationErrors: error.errors,
    });

    return res.status(statusCode).json({
      success: false,
      error: 'Validation failed',
      code: ERROR_CODES.INVALID_INPUT,
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  // Handle custom application errors
  if (isCustomError(error)) {
    const statusCode = error.statusCode;
    
    // Only log unexpected internal errors
    if (statusCode >= 500) {
      logError(error, {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        businessId: req.businessId,
      });
    } else {
      logger.warn('Client error', {
        requestId: req.requestId,
        statusCode: error.statusCode,
        message: error.message,
        code: error.code,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        businessId: req.businessId,
      });
    }

    return res.status(statusCode).json(formatErrorResponse(error));
  }

  // Handle specific error types
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    logError(error, {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      database: 'mongodb',
    });

    return res.status(500).json({
      success: false,
      error: 'Database error',
      code: ERROR_CODES.SUPABASE_ERROR,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: ERROR_CODES.INVALID_TOKEN,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      code: ERROR_CODES.TOKEN_EXPIRED,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  if (error.name === 'SyntaxError' && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      code: ERROR_CODES.INVALID_FORMAT,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  // Handle duplicate key errors (unique constraint violations)
  if (error.code === '23505' || error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      code: ERROR_CODES.DUPLICATE_ENTRY,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  // Handle foreign key violation errors
  if (error.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced resource does not exist',
      code: ERROR_CODES.BUSINESS_NOT_FOUND,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }

  // Handle rate limiting errors
  if (error.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Please slow down your requests',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      ...(error.retryAfter && { retryAfter: error.retryAfter }),
    });
  }

  // Log unexpected errors
  logError(error, {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    businessId: req.businessId,
    isOperational: false,
  });

  // Default server error response
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : error.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    error: message,
    code: statusCode >= 500 ? ERROR_CODES.INTERNAL_SERVER_ERROR : 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    ...(process.env.NODE_ENV !== 'production' && { 
      details: error.details,
      stack: error.stack 
    }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    suggestions: [
      'Check the API documentation at /api',
      'Verify the HTTP method (GET, POST, PUT, DELETE)',
      'Confirm the endpoint URL'
    ],
  });
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 

// Graceful shutdown signal handler
export const gracefulShutdown = (server: any) => {
  return (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err: any) => {
      if (err) {
        logger.error('Error during graceful shutdown', { error: err.message });
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    // Force exit after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown timeout reached');
      process.exit(1);
    }, 30000);
  };
};

export default { errorHandler, notFoundHandler, asyncHandler, gracefulShutdown };