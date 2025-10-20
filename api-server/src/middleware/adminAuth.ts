import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AdminRoleType } from '../validation/reviewServiceSchemas';

// Extend Express Request interface to include user role information
declare global {
  namespace Express {
    interface Request {
      userRole?: string;
      isAdmin?: boolean;
      isOwner?: boolean;
    }
  }
}

/**
 * Middleware to verify if user has admin/owner privileges
 */
export async function requireAdminAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.businessId || !req.user?.id) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for admin operations'
      });
      return;
    }

    // Get user's role for the business
    const { data: membership, error } = await supabase
      .from('business_members')
      .select('role, user_id')
      .eq('business_id', req.businessId)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      console.error('Admin access check error:', error);
      res.status(403).json({
        error: 'Access denied',
        message: 'Unable to verify admin privileges'
      });
      return;
    }

    if (!membership) {
      res.status(403).json({
        error: 'Access denied',
        message: 'User is not a member of this business'
      });
      return;
    }

    const allowedRoles: AdminRoleType[] = ['admin', 'owner', 'manager'];
    
    if (!allowedRoles.includes(membership.role as AdminRoleType)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Admin/owner privileges required for this operation'
      });
      return;
    }

    // Add role information to request
    req.userRole = membership.role;
    req.isAdmin = true;
    req.isOwner = membership.role === 'owner';

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({
      error: 'Authorizization error',
      message: 'Internal server error during admin verification'
    });
  }
}

/**
 * Middleware to verify if user is specifically the business owner
 */
export async function requireOwnerAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.businessId || !req.user?.id) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for owner operations'
      });
      return;
    }

    // Get user's role for the business
    const { data: membership, error } = await supabase
      .from('business_members')
      .select('role, user_id')
      .eq('business_id', req.businessId)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      console.error('Owner access check error:', error);
      res.status(403).json({
        error: 'Access denied',
        message: 'Unable to verify owner privileges'
      });
      return;
    }

    if (!membership || membership.role !== 'owner') {
      res.status(403).json({
        error: 'Access denied',
        message: 'Owner privileges required for this operation'
      });
      return;
    }

    // Add role information to request
    req.userRole = membership.role;
    req.isAdmin = true;
    req.isOwner = true;

    next();
  } catch (error) {
    console.error('Owner authorization error:', error);
    res.status(500).json({
      error: 'Authorizization error',
      message: 'Internal server error during owner verification'
    });
  }
}

/**
 * Middleware to verify if user has specific role level
 */
export function requireRoleAccess(allowedRoles: AdminRoleType[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.businessId || !req.user?.id) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
        return;
      }

      // Get user's role for the business
      const { data: membership, error } = await supabase
        .from('business_members')
        .select('role, user_id')
        .eq('business_id', req.businessId)
        .eq('user_id', req.user.id)
        .single();

      if (error) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Unable to verify user privileges'
        });
        return;
      }

      if (!membership || !allowedRoles.includes(membership.role as AdminRoleType)) {
        res.status(403).json({
          error: 'Access denied',
          message: `One of the following roles required: ${allowedRoles.join(', ')}`
        });
        return;
      }

      // Add role information to request
      req.userRole = membership.role;
      req.isAdmin = true;
      req.isOwner = membership.role === 'owner';

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        error: 'Authorizization error',
        message: 'Internal server error during role verification'
      });
    }
  };
}

/**
 * Middleware to verify business membership (any role)
 */
export async function requireBusinessMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.businessId || !req.user?.id) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    // Check if user is a member of the business
    const { data: membership, error } = await supabase
      .from('business_members')
      .select('role, user_id')
      .eq('business_id', req.businessId)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      res.status(403).json({
        error: 'Access denied',
        message: 'User is not a member of this business'
      });
      return;
    }

    if (!membership) {
      res.status(403).json({
        error: 'Access denied',
        message: 'User is not a member of this business'
      });
      return;
    }

    // Add role information to request
    req.userRole = membership.role;
    req.isAdmin = ['admin', 'owner', 'manager'].includes(membership.role);
    req.isOwner = membership.role === 'owner';

    next();
  } catch (error) {
    console.error('Business membership check error:', error);
    res.status(500).json({
      error: 'Authorizization error',
      message: 'Internal server error during membership verification'
    });
  }
}

/**
 * Utility function to check if user has minimum role level
 */
export function checkMinimumRole(userRole: string, minimumRole: AdminRoleType): boolean {
  const roleHierarchy: Record<AdminRoleType, number> = {
    'manager': 1,
    'admin': 2,
    'owner': 3
  };

  return roleHierarchy[userRole as AdminRoleType] >= roleHierarchy[minimumRole];
}

/**
 * Utility function to check if operation is allowed for current user role
 */
export function canPerformOperation(userRole: string, operation: 'create' | 'update' | 'delete' | 'respond'): boolean {
  const permissions: Record<AdminRoleType, string[]> = {
    'manager': ['create', 'update'],
    'admin': ['create', 'update', 'delete', 'respond'],
    'owner': ['create', 'update', 'delete', 'respond']
  };

  return permissions[userRole as AdminRoleType]?.includes(operation) || false;
}

/**
 * Validation helper for admin-only operations
 */
export function validateAdminOperation(req: Request, operation: string): boolean {
  if (!req.userRole) {
    return false;
  }

  return canPerformOperation(req.userRole, operation as any);
}

// Export middleware functions
export default {
  requireAdminAccess,
  requireOwnerAccess,
  requireRoleAccess,
  requireBusinessMembership,
  checkMinimumRole,
  canPerformOperation,
  validateAdminOperation
};
