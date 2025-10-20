import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const field = err.path.join('.');
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(err.message);
        });

        return res.status(400).json({
          error: 'Validation failed',
          details: fieldErrors
        });
      }
      
      return res.status(400).json({
        error: 'Invalid request data'
      });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      const parsedQuery = schema.parse(req.query);
      
      // Store parsed query in req.validatedQuery for route handlers
      (req as any).validatedQuery = parsedQuery;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const field = err.path.join('.');
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(err.message);
        });

        return res.status(400).json({
          error: 'Invalid query parameters',
          details: fieldErrors
        });
      }
      
      return res.status(400).json({
        error: 'Invalid query parameters'
      });
    }
  };
}
