import { Request, Response } from 'express';
import { TeamService } from '../services/teamService';
import {
  InviteTeamMemberInput,
  UpdateTeamMemberInput,
  GetTeamMembersQuery,
  BulkUpdateTeamMembers,
  TransferOwnershipInput,
  ResendInvitationInput,
  TeamRoleType
} from '../validation/teamSchemas';

export class TeamController {
  /**
   * GET /team-members - Get all team members for the business
   */
  static async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const query: GetTeamMembersQuery = req.query;

      // Validate pagination limits
      const limit = Math.min(query.limit || 20, 50);
      const page = Math.max(query.page || 1, 1);

      const result = await TeamService.getTeamMembers(businessId, {
        ...query,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: {
          members: result.members,
          pagination: {
            current_page: result.page,
            total_pages: result.totalPages,
            total_count: result.total,
            per_page: limit,
            has_next: result.page < result.totalPages,
            has_prev: result.page > 1
          }
        }
      });
    } catch (error) {
      console.error('Get team members error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Database error')) {
          res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch team members'
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch team members'
      });
    }
  }

  /**
   * POST /team-members - Invite new team member via email
   */
  static async inviteTeamMember(req: Request, res: Response): Promise<void> {
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

      const invitationData: InviteTeamMemberInput = req.body;

      // Validate required fields
      if (!invitationData.email || !invitationData.role) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Email and role are required'
        });
        return;
      }

      // Check if user has permission to invite
      const canInvite = await TeamService.validateTeamAction(userId, businessId, 'invite_member');
      if (!canInvite) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Only owners and admins can invite team members'
        });
        return;
      }

      const result = await TeamService.inviteTeamMember(businessId, userId, invitationData);

      res.status(201).json({
        success: true,
        message: 'Team member invitation sent successfully',
        data: {
          invitation: result.invitation,
          email_sent: result.email_sent,
          invited_email: invitationData.email,
          role: invitationData.role,
          expires_at: result.invitation.invitation_expires_at
        }
      });
    } catch (error) {
      console.error('Invite team member error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already a member')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
        if (error.message.includes('send email invitation')) {
          res.status(500).json({
            error: 'Email service error',
            message: 'Failed to send invitation email'
          });
          return;
        }
        if (error.message.includes('Validation failed')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to invite team member'
      });
    }
  }

  /**
   * PUT /team-members/:id - Update team member role/permissions
   */
  static async updateTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;
      const { id: memberId } = req.params;

      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(memberId)) {
        res.status(400).json({
          error: 'Invalid team member ID',
          message: 'Team member ID must be a valid UUID'
        });
        return;
      }

      const updateData: UpdateTeamMemberInput = req.body;

      // Check permissions
      const canUpdate = await TeamService.validateTeamAction(userId, businessId, 'update_role');
      if (!canUpdate) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Only owners and admins can update team members'
        });
        return;
      }

      // Get current user's role for validation
      const memberResult = await TeamService.getTeamMembers(businessId, {
        page: 1,
        limit: 1,
        search: userId // This would need adjustment for user_id search
      });

      // For now, we'll assume the updater is an admin/owner (middleware should validate this)
      const updaterRole: TeamRoleType = 'admin'; // This should come from middleware

      const updatedMember = await TeamService.updateTeamMember(memberId, businessId, updaterRole, updateData);

      res.status(200).json({
        success: true,
        message: 'Team member updated successfully',
        data: updatedMember
      });
    } catch (error) {
      console.error('Update team member error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Team member not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Insufficient permissions')) {
          res.status(403).json({
            error: 'Access denied',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Validation failed')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update team member'
      });
    }
  }

  /**
   * DELETE /team-members/:id - Remove team member from business
   */
  static async removeTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;
      const { id: memberId } = req.params;
      const reason = req.body?.reason || 'No reason provided';

      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(memberId)) {
        res.status(400).json({
          error: 'Invalid team member ID',
          message: 'Team member ID must be a valid UUID'
        });
        return;
      }

      // Check permissions
      const canRemove = await TeamService.validateTeamAction(userId, businessId, 'remove_member');
      if (!canRemove) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Only owners and admins can remove team members'
        });
        return;
      }

      // Get current user's role (assuming admin/owner from middleware)
      const removerRole: TeamRoleType = 'admin'; // This should come from middleware

      await TeamService.removeTeamMember(memberId, businessId, removerRole, reason);

      res.status(200).json({
        success: true,
        message: 'Team member removed successfully'
      });
    } catch (error) {
      console.error('Remove team member error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Team member not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Insufficient permissions')) {
          res.status(403).json({
            error: 'Access denied',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to remove team member'
      });
    }
  }

  /**
   * GET /team-members/stats - Get team member statistics
   */
  static async getTeamStats(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;

      const stats = await TeamService.getTeamMemberStats(businessId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get team stats error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch team statistics'
      });
    }
  }

  /**
   * POST /team-members/bulk-update - Bulk update team members
   */
  static async bulkUpdateTeamMembers(req: Request, res: Response): Promise<void> {
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

      const bulkData: BulkUpdateTeamMembers = req.body;

      if (!bulkData.member_ids || bulkData.member_ids.length === 0) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'member_ids array is required and cannot be empty'
        });
        return;
      }

      // Check permissions
      const canBulkUpdate = await TeamService.validateTeamAction(userId, businessId, 'update_role');
      if (!canBulkUpdate) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Only owners and admins can perform bulk updates'
        });
        return;
      }

      const updaterRole: TeamRoleType = 'admin'; // From middleware
      const result = await TeamService.bulkUpdateTeamMembers(businessId, updaterRole, bulkData);

      res.status(200).json({
        success: true,
        message: `Successfully updated ${result.updated_count} team members`,
        data: { updated_count: result.updated_count }
      });
    } catch (error) {
      console.error('Bulk update team members error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Insufficient permissions')) {
          res.status(403).json({
            error: 'Access denied',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to bulk update team members'
      });
    }
  }

  /**
   * POST /team-members/transfer-ownership - Transfer business ownership
   */
  static async transferOwnership(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const currentOwnerId = req.user?.id;

      if (!currentOwnerId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      const transferData: TransferOwnershipInput = req.body;

      // Validate required fields
      if (!transferData.new_owner_id || !transferData.confirmation_message) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'new_owner_id and confirmation_message are required'
        });
        return;
      }

      // Check that user is currently owner
      const canTransfer = await TeamService.validateTeamAction(currentOwnerId, businessId, 'transfer_ownership');
      if (!canTransfer) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Only the current owner can transfer ownership'
        });
        return;
      }

      await TeamService.transferOwnership(businessId, currentOwnerId, transferData);

      res.status(200).json({
        success: true,
        message: 'Business ownership transferred successfully',
        data: {
          new_owner_id: transferData.new_owner_id,
          transferred_at: new Date().toISOString(),
          confirmation: transferData.confirmation_message
        }
      });
    } catch (error) {
      console.error('Transfer ownership error:', error);

      if (error instanceof Error) {
        if (error.message.includes('must be an existing team member')) {
          res.status(400).json({
            error: 'Validation failed',
            message: error.message
          });
          return;
        }
        if (error.message.includes('transfer ownership')) {
          res.status(500).json({
            error: 'Transfer failed',
            message: 'Failed to complete ownership transfer'
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to transfer ownership'
      });
    }
  }

  /**
   * POST /team-members/resend-invitation - Resend invitation to pending member
   */
  static async resendInvitation(req: Request, res: Response): Promise<void> {
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

      const invitationData: ResendInvitationInput = req.body;

      if (!invitationData.email) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Email is required'
        });
        return;
      }

      // Check permissions
      const canResend = await TeamService.validateTeamAction(userId, businessId, 'invite_member');
      if (!canResend) {
        res.status(403).json({
          error: 'Access denied',
          message: 'Only owners and admins can resend invitations'
        });
        return;
      }

      const result = await TeamService.resendInvitation(businessId, invitationData);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email_resent: invitationData.email,
          expires_in_hours: invitationData.expires_in_hours || 72
        }
      });
    } catch (error) {
      console.error('Resend invitation error:', error);

      if (error instanceof Error) {
        if (error.message.includes('No pending member found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('resend invitation email')) {
          res.status(500).json({
            error: 'Email service error',
            message: 'Failed to resend invitation email'
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to resend invitation'
      });
    }
  }

  /**
   * GET /team-members/invitation-status - Check invitation status for an email
   */
  static async getInvitationStatus(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const email = req.query.email as string;

      if (!email) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Email query parameter is required'
        });
        return;
      }

      const status = await TeamService.getInvitationStatus(email, businessId);

      res.status(200).json({
        success: true,
        data: {
          email,
          business_id: businessId,
          status: status.status,
          expires_at: status.expires_at,
          invited_at: status.invited_at
        }
      });
    } catch (error) {
      console.error('Get invitation status error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check invitation status'
      });
    }
  }
}
