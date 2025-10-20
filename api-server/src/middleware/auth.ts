import { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../config/supabase';
import { CustomError } from '../utils/errors';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        phone?: string;
        business_id?: string;
        business_role?: string;
        organization_id?: string;
      };
      businessId?: string;
      userId?: string;
      clientInfo?: {
        isMobile: boolean;
        isApp: boolean;
        userAgent: string;
        ip: string;
      };
      requestId?: string;
    }
  }
}

/**
 * Authentication middleware that verifies JWT tokens and extracts user information
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Missing or invalid authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    
    if (error || !user) {
      throw new CustomError('Invalid or expired token', 401);
    }

    // Get user profile and business information
    const { data: businessInfo, error: businessError } = await supabaseAuth
      .from('business_members')
      .select(`
        business_id,
        role,
        businesses!inner (
          id,
          organization_id,
          name,
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('businesses.status', 'active')
      .single();

    if (businessError || !businessInfo) {
      throw new CustomError('User not associated with any active business', 403);
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      email: user.email,
      phone: businessInfo.businesses.phone,
      business_id: businessInfo.business_id,
      business_role: businessInfo.role,
      organization_id: businessInfo.businesses.organization_id,
    };

    req.businessId = businessInfo.business_id;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        error: error.message,
        details: error.details,
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    
    if (error || !user) {
      return next(); // Continue without authentication
    }

    // Get user business information if available
    try {
      const { data: businessInfo } = await supabaseAuth
        .from('business_members')
        .select(`
          business_id,
          role,
          businesses!inner (
            id,
            organization_id,
            name,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('businesses.status', 'active')
        .single();

      if (businessInfo) {
        req.user = {
          id: user.id,
          email: user.email,
          business_id: businessInfo.business_id,
          business_role: businessInfo.role,
          organization_id: businessInfo.businesses.organization_id,
        };
        req.businessId = businessInfo.business_id;
        req.userId = user.id;
      }
    } catch (profileError) {
      // User exists but no business association - continue without business info
      req.user = {
        id: user.id,
        email: user.email,
      };
      req.userId = user.id;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without authentication on error
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.business_role) {
        throw new CustomError('Authentication required', 401);
      }

      if (!allowedRoles.includes(req.user.business_role)) {
        throw new CustomError(
          'Insufficient permissions',
          403,
          `Required role: ${allowedRoles.join(' or ')}, User role: ${req.user.business_role}`
        );
      }

      next();
    } catch (error) {
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({
          error: error.message,
          details: error.details,
        });
      }

      console.error('Role check error:', error);
      res.status(500).json({
        error: 'Authorization failed',
        message: 'Internal server error during authorization check',
      });
    }
  };
};

/**
 * Requires admin or owner role
 */
export const requireAdminAccess = requireRole(['admin', 'owner']);

/**
 * Requires owner role only
 */
export const requireOwnerAccess = requireRole(['owner']);

/**
 * Requires manager role or higher
 */
export const requireManagerAccess = requireRole(['owner', 'admin', 'manager']);

/**
 * Middleware to check if user owns the resource or is admin/owner
 */
export const requireOwnerOrAdmin = (resourceOwnerField: string = 'created_by') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new CustomError('Authentication required', 401);
      }

      // Admin/owner can always access
      if (req.user.business_role === 'admin' || req.user.business_role === 'owner') {
        return next();
      }

      // Check if user is the owner of the specific resource
      // This would typically involve a database check for the specific resource
      // For now, this is a placeholder that should be implemented per route
      next();
    } catch (error) {
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({
          error: error.message,
          details: error.details,
        });
      }

      console.error('Owner or admin check error:', error);
      res.status(500).json({
        error: 'Authorization failed',
        message: 'Internal server error during ownership check',
      });
    }
  };
};

/**
 * Middleware to validate business access
 */
export const validateBusinessAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.businessId) {
      throw new CustomError('Business context required', 400);
    }

    // Verify business exists and is active
    const { data: business, error } = await supabaseAuth
      .from('businesses')
      .select('id, status, subscription_status')
      .eq('id', req.businessId)
      .single();

    if (error || !business) {
      throw new CustomError('Business not found', 404);
    }

    if (business.status !== 'active') {
      throw new CustomError('Business is not active', 403);
    }

    if (business.subscription_status !== 'active') {
      throw new CustomError('Business subscription is not active', 403);
    }

    next();
  } catch (error) {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        error: error.message,
        details: error.details,
      });
    }

    console.error('Business validation error:', error);
    res.status(500).json({
      error: 'Business validation failed',
      message: 'Internal server error during business validation',
    });
  }
};

/**
 * Webhook authentication middleware (for external services)
 */
export const authenticateWebhook = (source: string, requiredHeaders: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check required headers are present
      for (const header of requiredHeaders) {
        if (!req.headers[header.toLowerCase()]) {
          throw new CustomError(`Missing required webhook header: ${header}`, 400);
        }
      }

      // Check IP whitelist if configured
      const allowedIPs = process.env.ALLOWED_WEBHOOK_IPS;
      if (allowedIPs && req.ip) {
        const ipRanges = allowedIPs.split(',');
        const clientIP = req.ip;
        
        // Simple IP check (in production, use a proper CIDR matching library)
        const isAllowed = ipRanges.some(range => {
          if (range.includes('/')) {
            // CIDR check would go here
            return clientIP.startsWith(range.split('/')[0].trim());
          }
          return clientIP === range.trim();
        });

        if (!isAllowed) {
          throw new CustomError('Webhook request from unauthorized IP', 403);
        }
      }

      next();
    } catch (error) {
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({
          error: error.message,
          details: error.details,
        });
      }

      console.error('Webhook authentication error:', error);
      res.status(500).json({
        error: 'Webhook authentication failed',
        message: 'Internal server error during webhook authentication',
      });
    }
  };
};

/**
 * Middleware to extract mobile client info
 */
export const detectClient = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isApp = req.headers['x-client-app'] === 'true';
  
  // Attach client info to request
  req.clientInfo = {
    isMobile,
    isApp,
    userAgent,
    ip: req.ip,
  };

  next();
};

/**
 * Rate limiting middleware specifically for authenticated users
 */
export const authRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Implement user-specific rate limiting here
    // This would typically integrate with Redis for distributed rate limiting
    next();
  };
};

// Export commonly used middleware combinations
export const authRequired = [
  authenticateToken,
  validateBusinessAccess,
];

export const adminRequired = [
  authenticateToken,
  validateBusinessAccess,
  requireAdminAccess,
];

export const ownerRequired = [
  authenticateToken,
  validateBusinessAccess,
  requireOwnerAccess,
];