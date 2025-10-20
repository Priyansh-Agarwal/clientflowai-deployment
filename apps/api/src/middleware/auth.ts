import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { createRequestLogger } from '../config/logger';

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuthenticatedRequest extends Request {
  userId?: string;
  orgId?: string;
  user?: any;
  org?: any;
}

export interface AuthContext {
  userId: string;
  orgId: string;
  user: any;
  org: any;
}

export async function auth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const logger = createRequestLogger(req);
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    const token = authHeader.substring(7);
    let userId: string;
    let orgId: string | undefined;

    // Try Supabase token first
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        throw new Error('Invalid Supabase token');
      }
      userId = user.id;
    } catch (supabaseError) {
      // Fallback to JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = decoded.userId;
        orgId = decoded.orgId;
      } catch (jwtError) {
        logger.warn('Invalid token provided', { error: jwtError });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }
    }

    // Get user and organization info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    // If orgId not provided in token, use first organization
    if (!orgId && user.memberships.length > 0) {
      orgId = user.memberships[0].orgId;
    }

    if (!orgId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No organization found for user',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    // Verify user has access to this organization
    const membership = user.memberships.find(m => m.orgId === orgId);
    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User does not have access to this organization',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    // Attach to request
    req.userId = userId;
    req.orgId = orgId;
    req.user = user;
    req.org = membership.org;

    logger.debug('User authenticated', {
      userId,
      orgId,
      userEmail: user.email,
      orgName: membership.org.name,
    });

    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without auth
  }

  return auth(req, res, next);
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const logger = createRequestLogger(req);
    
    if (!req.userId || !req.orgId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    // Get user's role in the organization
    const membership = req.user?.memberships?.find(m => m.orgId === req.orgId);
    if (!membership || !roles.includes(membership.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.userId,
        orgId: req.orgId,
        requiredRoles: roles,
        userRole: membership?.role,
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`,
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    next();
  };
}

export function getAuthContext(req: AuthenticatedRequest): AuthContext {
  if (!req.userId || !req.orgId || !req.user || !req.org) {
    throw new Error('Authentication context not available');
  }

  return {
    userId: req.userId,
    orgId: req.orgId,
    user: req.user,
    org: req.org,
  };
}