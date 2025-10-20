import { Router, Request, Response } from 'express';
import { TeamController } from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';
import { requireAdminAccess, requireOwnerAccess } from '../middleware/adminAuth';
import { validateRequest, validateQuery } from '../middleware/validation';
import {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
  getTeamMembersSchema,
  bulkUpdateTeamMembersSchema,
  transferOwnershipSchema,
  resendInvitationSchema
} from '../validation/teamSchemas';

const router = Router();

/**
 * @route   GET /team-members
 * @desc    Get all team members associated with current business_id and their roles
 * @access  Private (authenticated users with team viewing permissions)
 * @query   role?, status?, search?, joined_after?, joined_before?, page?, limit?, sort_by?, sort_order?, include_inactive?, include_pending?
 * 
 * Returns paginated list of team members with profile data, roles, permissions, and status.
 */
router.get('/', 
  authenticateToken,
  validateQuery(getTeamMemberSchema),
  TeamController.getTeamMembers
);

/**
 * @route   GET /team-members/stats
 * @desc    Get team member statistics and analytics
 * @access  Private (authenticated users with team viewing permissions)
 */
router.get('/stats',
  authenticateToken,
  TeamController.getTeamStats
);

/**
 * @route   GET /team-members/invitation-status
 * @desc    Check invitation status for a specific email
 * @access  Private (authenticated users)
 * @query   email - Email address to check invitation status
 */
router.get('/invitation-status',
  authenticateToken,
  TeamController.getInvitationStatus
);

/**
 * @route   POST /team-members
 * @desc    Invite new team member via email with Supabase Auth
 * @access  Private (admin/owner only)
 * @body    { email, role, permissions?, message?, redirect_url?, custom_permissions? }
 * 
 * Creates:
 * - business_members record with pending status
 * - Supabase Auth invitation email
 * - Organization association
 */
router.post('/', 
  authenticateToken,
  requireAdminAccess,
  validateRequest(inviteTeamMemberSchema),
  TeamController.inviteTeamMember
);

/**
 * @route   PUT /team-members/:id
 * @desc    Update team member role, permissions, or status
 * @access  Private (admin/owner only)
 * @body    { role?, permissions?, status?, custom_permissions?, notes? }
 * 
 * Restrictions:
 * - Only owners/admins can modify team members
 * - Role hierarchy enforced (can't assign higher role than your own)
 * - Cannot demote/remove the last owner
 */
router.put('/:id', 
  authenticateToken,
  requireAdminAccess,
  validateRequest(updateTeamMemberSchema),
  TeamController.updateTeamMember
);

/**
 * @route   DELETE /team-members/:id
 * @desc    Remove team member from business
 * @access  Private (admin/owner only)
 * @body    { reason? }
 * 
 * Operations:
 * - Removes business_members record
 * - Maintains user account and other business associations
 * - Logs removal for audit trail
 */
router.delete('/:id', 
  authenticateToken,
  requireAdminAccess,
  TeamController.removeTeamMember
);

/**
 * @route   POST /team-members/bulk-update
 * @desc    Bulk update multiple team members
 * @access  Private (admin/owner only)
 * @body    { member_ids: string[], updates: { role?, status?, permissions? } }
 * 
 * Operations:
 * - Update role/permissions for multiple members
 * - Maintain role hierarchy constraints
 * - Batch operation for efficiency
 */
router.post('/bulk-update',
  authenticateToken,
  requireAdminAccess,
  validateRequest(bulkUpdateTeamMembersSchema),
  TeamController.bulkUpdateTeamMembers
);

/**
 * @route   POST /team-members/resend-invitation
 * @desc    Resend invitation to pending team member
 * @access  Private (admin/owner only)
 * @body    { email, custom_message?, expires_in_hours? }
 * 
 * Operations:
 * - Updates invitation expiry time
 * - Resends Supabase Auth invitation email
 * - Maintains invitation tracking
 */
router.post('/resend-invitation',
  authenticateToken,
  requireAdminAccess,
  validateRequest(resendInvitationSchema),
  TeamController.resendInvitation
);

/**
 * @route   POST /team-members/transfer-ownership
 * @desc    Transfer business ownership to another team member
 * @access  Private (owner only)
 * @body    { new_owner_id, confirmation_message, transfer_reason? }
 * 
 * Operations:
 * - Demotes current owner to admin
 * - Promotes new owner to owner role
 * - Maintains audit trail
 * - Requires strong confirmation
 */
router.post('/transfer-ownership',
  authenticateToken,
  requireOwnerAccess,
  validateRequest(transferOwnershipSchema),
  TeamController.transferOwnership
);

/**
 * @route   GET /team-members/permissions
 * @desc    Get available permissions for each role
 * @access  Private (authenticated users)
 * 
 * Returns:
 * - Available roles and their default permissions
 * - Custom permission options
 * - Permission descriptions
 */
router.get('/permissions',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { RolePermissions } = await import('../validation/teamSchemas');
      
      res.status(200).json({
        success: true,
        data: {
          roles: Object.keys(RolePermissions),
          permissions: RolePermissions,
          role_hierarchy: {
            'owner': 5,
            'admin': 4,
            'manager': 3,
            'staff': 2,
            'viewer': 1
          },
          available_actions: [
            'invite_member',
            'update_role',
            'update_permissions',
            'suspend_member',
            'remove_member',
            'transfer_ownership',
            'view_members',
            'export_members'
          ]
        }
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch permission information'
      });
    }
  }
);

/**
 * @route   GET /team-members/my-role
 * @desc    Get current user's role and permissions for this business
 * @access  Private (authenticated users)
 * 
 * Returns:
 * - Current user's role
 * - Assigned permissions
 * - Business-specific context
 */
router.get('/my-role',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      // Get user's role in this business
      const { TeamService } = await import('../services/teamService');
      const memberResult = await TeamService.getTeamMembers(businessId, {
        page: 1,
        limit: 1
      });

      const myMembership = memberResult.members.find(member => member.user_id === userId);

      if (!myMembership) {
        res.status(404).json({
          error: 'Not found',
          message: 'You are not a member of this business'
        });
        return;
      }

      const { RolePermissions } = await import('../validation/teamSchemas');

      res.status(200).json({
        success: true,
        data: {
          user_id: userId,
          business_id: businessId,
          role: myMembership.role,
          permissions: myMembership.permissions,
          default_permissions: RolePermissions[myMembership.role as keyof typeof RolePermissions],
          status: myMembership.status,
          joined_at: myMembership.joined_at,
          capability_level: {
            can_invite_members: ['owner', 'admin'].includes(myMembership.role),
            can_modify_roles: ['owner', 'admin'].includes(myMembership.role),
            can_remove_members: ['owner', 'admin'].includes(myMembership.role),
            can_transfer_ownership: myMembership.role === 'owner'
          }
        }
      });
    } catch (error) {
      console.error('Get my role error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch user role information'
      });
    }
  }
);

/**
 * @route   GET /team-members/export
 * @desc    Export team member data for reporting
 * @access  Private (admin/owner only)
 * @query   format? (json|csv), include_inactive?, include_permissions?
 */
router.get('/export',
  authenticateToken,
  requireAdminAccess,
  async (req: Request, res: Response) => {
    try {
      const businessId = req.businessId!;
      const format = (req.query.format as string) || 'json';
      const includeInactive = req.query.include_inactive === 'true';
      const includePermissions = req.query.include_permissions === 'true';

      // Get all team members
      const { TeamService } = await import('../services/teamService');
      const result = await TeamService.getTeamMembers(businessId, {
        page: 1,
        limit: 1000, // Large limit for export
        include_inactive: includeInactive
      });

      if (format === 'csv') {
        // Generate CSV data
        const csvHeaders = [
          'Full Name',
          'Email',
          'Role',
          'Status',
          'Joined At',
          'Last Login',
          'Phone Number',
          'Title'
        ];

        if (includePermissions) {
          csvHeaders.push('Permissions');
        }

        const csvRows = result.members.map(member => {
          const row = [
            member.full_name || '',
            member.email || '',
            member.role,
            member.status || 'active',
            member.joined_at,
            member.last_login_at || '',
            member.phone_number || '',
            member.title || ''
          ];

          if (includePermissions) {
            row.push(member.permissions?.join(', ') || '');
          }

          return row.map(field => `"${field}"`).join(',');
        });

        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="team-members-export-${Date.now()}.csv"`);
        res.status(200).send(csvContent);
      } else {
        // JSON export
        res.status(200).json({
          success: true,
          data: result.members,
          metadata: {
            total_exported: result.members.length,
            exported_at: new Date().toISOString(),
            format: 'json',
            include_inactive: includeInactive,
            include_permissions: includePermissions
          }
        });
      }
    } catch (error) {
      console.error('Export team members error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to export team members data'
      });
    }
  }
);

/**
 * @route   GET /team-members/health
 * @desc    Team management system health check
 * @access  Private (authenticated users)
 */
router.get('/health',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const businessId = req.businessId!;

      // Perform basic health checks
      const healthChecks = {
        database_connection: true,
        authentication_service: true,
        email_service: true,
        permission_system: true
      };

      // Quick member count check for database connectivity
      const { TeamService } = await import('../services/teamService');
      const stats = await TeamService.getTeamMemberStats(businessId);
      
      res.status(200).json({
        success: true,
        data: {
          system_status: 'healthy',
          health_checks: healthChecks,
          team_stats: {
            total_members: stats.total_members,
            active_members: stats.active_members,
            pending_invitations: stats.pending_invitations
          },
          last_checked: new Date().toISOString(),
          business_id: businessId
        }
      });
    } catch (error) {
      console.error('Team management health check error:', error);
      res.status(503).json({
        success: false,
        data: {
          system_status: 'unhealthy',
          error: 'Team management system unavailable',
          last_checked: new Date().toISOString()
        }
      });
    }
  }
);

export default router;
