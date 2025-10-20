import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createRequestLogger } from '../config/logger';
import { AuthenticatedRequest } from './auth';

const prisma = new PrismaClient();

export function tenancy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const logger = createRequestLogger(req);
  
  if (!req.orgId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Organization ID required',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  // Attach orgId to Prisma context for automatic filtering
  req.prisma = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Skip tenancy for certain models and operations
          const skipTenancy = [
            'User',
            'Organization',
            'Membership',
            'Subscription',
            'CalendarConnection',
          ].includes(model);

          if (skipTenancy || operation === 'create') {
            return query(args);
          }

          // Add orgId filter to all queries
          if (args.where) {
            args.where.orgId = req.orgId;
          } else {
            args.where = { orgId: req.orgId };
          }

          return query(args);
        },
      },
    },
  });

  logger.debug('Tenancy middleware applied', { orgId: req.orgId });
  next();
}

// Helper function to ensure orgId is included in create operations
export function ensureOrgId<T extends Record<string, any>>(data: T, orgId: string): T & { orgId: string } {
  return {
    ...data,
    orgId,
  };
}

// Helper function to validate orgId in request body
export function validateOrgId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.body.orgId && req.body.orgId !== req.orgId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Organization ID mismatch',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }

  // Ensure orgId is set correctly
  req.body.orgId = req.orgId;
  next();
}