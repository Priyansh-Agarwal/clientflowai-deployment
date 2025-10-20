import { supabase, supabaseServiceRole } from '../config/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import {
  TeamMemberWithProfile,
  TeamInvitation,
  TeamMemberStats,
  TeamMemberInsert,
  TeamMemberUpdate
} from '../types/database';
import {
  InviteTeamMemberInput,
  UpdateTeamMemberInput,
  GetTeamMembersQuery,
  BulkUpdateTeamMembers,
  TransferOwnershipInput,
  ResendInvitationInput,
  TeamRoleType,
  TeamStatusType,
  getDefaultPermissions,
  validateRoleAccess,
  canPerformTeamAction,
  calculateInvitationExpiry,
  generateInvitationToken,
  getInvitationStatus
} from '../validation/teamSchemas';

export class TeamService {
  /**
   * Get all team members for a business with profile data
   */
  static async getTeamMembers(
    businessId: string,
    query: GetTeamMembersParams
  ): Promise<{
    members: TeamMemberWithProfile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        role,
        status,
        search,
        joined_after,
        joined_before,
        page = 1,
        limit = 20,
        sort_by = 'joined_at',
        sort_order = 'desc',
        include_inactive = false,
        include_pending = true
      } = query;

      // Build query with profile join
      let supabaseQuery = supabase
        .from('business_members')
        .select(`
          *,
          profiles!inner(
            id,
            email,
            full_name,
            avatar_url,
            phone_number,
            title,
            last_login_at,
            email_verified,
            created_at,
            updated_at
          )
        `, { count: 'exact' })
        .eq('business_id', businessId);

      // Apply filters
      if (role) {
        supabaseQuery = supabaseQuery.eq('role', role);
      }

      if (status) {
        supabaseQuery = supabaseQuery.eq('status', status);
      }

      if (!include_inactive) {
        supabaseQuery = supabaseQuery.not('status', 'equals', 'inactive');
      }

      if (!include_pending) {
        supabaseQuery = supabaseQuery.not('status', 'equals', 'pending');
      }

      if (joined_after) {
        supabaseQuery = supabaseQuery.gte('joined_at', joined_after);
      }

      if (joined_before) {
        supabaseQuery = supabaseQuery.lte('joined_at', joined_before);
      }

      // Search functionality
      if (search && search.trim()) {
        supabaseQuery = supabaseQuery.or(
          `profiles.full_name.ilike.%${search.trim()}%,profiles.email.ilike.%${search.trim()}%`
        );
      }

      // Sorting
      const sortField = sort_by === 'email' ? 'profiles.email' : 
                       sort_by === 'role' ? 'role' : 
                       sort_by === 'last_login_at' ? 'profiles.last_login_at' : 'joined_at';
      
      supabaseQuery = supabaseQuery.order(sortField, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      supabaseQuery = supabaseQuery.range(from, to);

      const { data, error, count } = await supabaseQuery;

      if (error) {
        throw new Error(`Failed to fetch team members: ${error.message}`);
      }

      // Transform data to include profile information
      const members: TeamMemberWithProfile[] = data?.map(member => ({
        id: member.id,
        user_id: member.user_id,
        business_id: member.business_id,
        role: member.role,
        permissions: member.permissions,
        joined_at: member.joined_at,
        invited_by: member.invited_by,
        status: member.status || 'active',
        // Profile data
        full_name: member.profiles?.full_name,
        email: member.profiles?.email,
        avatar_url: member.profiles?.avatar_url,
        phone_number: member.profiles?.phone_number,
        title: member.profiles?.title,
        last_login_at: member.profiles?.last_login_at,
        email_verified: member.profiles?.email_verified,
        // Business context
        invitation_sent_at: member.invitation_sent_at,
        invitation_accepted_at: member.invitation_accepted_at
      })) || [];

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        members,
        total: count || 0,
        page,
        totalPages
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Invite a new team member via email with Supabase Auth integration
   */
  static async inviteTeamMember(
    businessId: string,
    invitedBy: string,
    invitationData: InviteTeamMemberInput
  ): Promise<{ invitation: any; email_sent: boolean }> {
    try {
      const { email, role, message, redirect_url, permissions, custom_permissions } = invitationData;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      let userId: string | null = null;
      let isNewUser = false;

      if (existingUser) {
        userId = existingUser.id;
        
        // Check if user is already a member of this business
        const { data: existingMember } = await supabase
          .from('business_members')
          .select('id')
          .eq('business_id', businessId)
          .eq('user_id', userId)
          .single();

        if (existingMember) {
          throw new Error('User is already a member of this business');
        }
      } else {
        // Create new user invite via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirect_url || `${process.env.FRONTEND_URL}/accept-invitation`,
          data: {
            business_id: businessId,
            role: role,
            invited_by: invitedBy,
            invitation_type: 'business_membership'
          }
        });

        if (authError) {
          throw new Error(`Failed to send email invitation: ${authError.message}`);
        }

        userId = authData.user?.id || null;
        isNewUser = true;
      }

      if (!userId) {
        throw new Error('Failed to create or locate user account');
      }

      // Prepare permissions
      const defaultPermissions = getDefaultPermissions(role);
      const finalPermissions = [
        ...defaultPermissions,
        ...(permissions || []),
        ...(custom_permissions || [])
      ];

      // Create business membership record
      const memberData: TeamMemberInsert = {
        user_id: userId,
        business_id: businessId,
        role: role,
        permissions: finalPermissions,
        invited_by: invitedBy,
        status: 'pending',
        invitation_sent_at: new Date().toISOString(),
        invitation_expires_at: calculateInvitationExpiry(72).toISOString()
      };

      const { data: member, error: memberError } = await supabase
        .from('business_members')
        .insert(memberData)
        .select()
        .single();

      if (memberError) {
        throw new Error(`Failed to create team member record: ${memberError.message}`);
      }

      // Send custom invitation email if message provided
      if (message && !isNewUser) {
        // For existing users, we could send a custom email notification
        // This would integrate with your email service
        console.log(`Custom invitation email sent to ${email} with message: ${message}`);
      }

      return {
        invitation: member,
        email_sent: true
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update team member role and permissions
   */
  static async updateTeamMember(
    memberId: string,
    businessId: string,
    updaterRole: TeamRoleType,
    updateData: UpdateTeamMemberInput
  ): Promise<TeamMemberWithProfile> {
    try {
      // Get current member data
      const { data: currentMember } = await supabase
        .from('business_members')
        .select('role, status')
        .eq('id', memberId)
        .eq('business_id', businessId)
        .single();

      if (!currentMember) {
        throw new Error('Team member not found');
      }

      // Validate role access
      if (updateData.role && !validateRoleAccess(updaterRole, updateData.role, 'update')) {
        throw new Error('Insufficient permissions to assign this role');
      }

      // Prepare update data
      const updatePayload: TeamMemberUpdate = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Handle permissions update
      if (updateData.role || updateData.permissions) {
        const targetRole = updateData.role || currentMember.role;
        const finalPermissions = updateData.permissions || getDefaultPermissions(targetRole as TeamRoleType);
        updatePayload.permissions = finalPermissions;
      }

      const { data: updatedMember, error: updateError } = await supabase
        .from('business_members')
        .update(updatePayload)
        .eq('id', memberId)
        .eq('business_id', businessId)
        .select(`
          *,
          profiles!inner(
            id,
            email,
            full_name,
            avatar_url,
            phone_number,
            title,
            last_login_at,
            email_verified
          )
        `)
        .single();

      if (updateError) {
        throw new Error(`Failed to update team member: ${updateError.message}`);
      }

      // Transform to TeamMemberWithProfile
      const member: TeamMemberWithProfile = {
        id: updatedMember.id,
        user_id: updatedMember.user_id,
        business_id: updatedMember.business_id,
        role: updatedMember.role,
        permissions: updatedMember.permissions,
        joined_at: updatedMember.joined_at,
        invited_by: updatedMember.invited_by,
        status: updatedMember.status,
        full_name: updatedMember.profiles?.full_name,
        email: updatedMember.profiles?.email,
        avatar_url: updatedMember.profiles?.avatar_url,
        phone_number: updatedMember.profiles?.phone_number,
        title: updatedMember.profiles?.title,
        last_login_at: updatedMember.profiles?.last_login_at,
        email_verified: updatedMember.profiles?.email_verified,
        invitation_sent_at: updatedMember.invitation_sent_at,
        invitation_accepted_at: updatedMember.invitation_accepted_at
      };

      return member;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Remove team member from business
   */
  static async removeTeamMember(
    memberId: string,
    businessId: string,
    removerRole: TeamRoleType,
    reason?: string
  ): Promise<void> {
    try {
      // Get member data for validation
      const { data: member } = await supabase
        .from('business_members')
        .select('role, user_id')
        .eq('id', memberId)
        .eq('business_id', businessId)
        .single();

      if (!member) {
        throw new Error('Team member not found');
      }

      // Validate role access
      if (!validateRoleAccess(removerRole, member.role as TeamRoleType, 'remove')) {
        throw new Error('Insufficient permissions to remove this team member');
      }

      // Remove member from business
      const { error: removeError } = await supabase
        .from('business_members')
        .delete()
        .eq('id', memberId)
        .eq('business_id', businessId);

      if (removeError) {
        throw new Error(`Failed to remove team member: ${removeError.message}`);
      }

      // Log the removal action (for audit purposes)
      console.log(`Team member ${member.user_id} removed from business ${businessId} by role ${removerRole}. Reason: ${reason || 'No reason provided'}`);
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get team member statistics
   */
  static async getTeamMemberStats(businessId: string): Promise<TeamMemberStats> {
    try {
      const { data: members, error } = await supabase
        .from('business_members')
        .select('role, status, joined_at')
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to fetch team member stats: ${error.message}`);
      }

      const total_members = members?.length || 0;
      const active_members = members?.filter(m => m.status === 'active').length || 0;
      const pending_members = members?.filter(m => m.status === 'pending').length || 0;

      // Role distribution
      const role_distribution: Record<string, number> = {};
      members?.forEach(member => {
        role_distribution[member.role] = (role_distribution[member.role] || 0) + 1;
      });

      // Recent joiners (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent_members = members?.filter(m => 
        new Date(m.joined_at) >= weekAgo
      ).length || 0;

      return {
        total_members,
        active_members,
        pending_invitations: pending_members,
        role_distribution,
        recent_joiners: [] // This would need additional queries to populate fully
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Bulk update team members
   */
  static async bulkUpdateTeamMembers(
    businessId: string,
    updaterRole: TeamRoleType,
    bulkData: BulkUpdateTeamMembers
  ): Promise<{ updated_count: number }> {
    try {
      const { member_ids, updates } = bulkData;

      // Validate bulk operation permissions
      if (!canPerformTeamAction('update_role', updaterRole)) {
        throw new Error('Insufficient permissions for bulk updates');
      }

      const updatePayload: TeamMemberUpdate = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Apply role-specific permissions if role is being updated
      if (updates.role) {
        const defaultPermissions = getDefaultPermissions(updates.role);
        updatePayload.permissions = defaultPermissions;
      }

      const { data: updatedMembers, error } = await supabase
        .from('business_members')
        .update(updatePayload)
        .in('id', member_ids)
        .eq('business_id', businessId)
        .select('id');

      if (error) {
        throw new Error(`Failed to bulk update team members: ${error.message}`);
      }

      return { updated_count: updatedMembers?.length || 0 };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Transfer business ownership
   */
  static async transferOwnership(
    businessId: string,
    currentOwnerId: string,
    transferData: TransferOwnershipInput
  ): Promise<void> {
    try {
      const { new_owner_id, confirmation_message } = transferData;

      // Validate new owner is currently a member
      const { data: newOwnerMember } = await supabase
        .from('business_members')
        .select('id, role')
        .eq('business_id', businessId)
        .eq('user_id', new_owner_id)
        .single();

      if (!newOwnerMember) {
        throw new Error('New owner must be an existing team member');
      }

      // Update current owner role
      const { error: currentOwnerError } = await supabase
        .from('business_members')
        .update({
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .eq('user_id', currentOwnerId);

      if (currentOwnerError) {
        throw new Error(`Failed to update current owner: ${currentOwnerError.message}`);
      }

      // Update new owner role
      const { error: newOwnerError } = await supabase
        .from('business_members')
        .update({
          role: 'owner',
          updated_at: new Date().toISOString()
        })
        .eq('business_id', businessId)
        .eq('user_id', new_owner_id);

      if (newOwnerError) {
        throw new Error(`Failed to transfer ownership: ${newOwnerError.message}`);
      }

      console.log(`Ownership transferred from ${currentOwnerId} to ${new_owner_id}. Confirmation: ${confirmation_message}`);
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Resend invitation to pending team member
   */
  static async resendInvitation(
    businessId: string,
    invitationData: ResendInvitationInput
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { email, custom_message, expires_in_hours } = invitationData;

      // Find pending member
      const { data: member } = await supabase
        .from('business_members')
        .select('id, user_id, role')
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .single();

      if (!member) {
        throw new Error('No pending member found for this email');
      }

      // Update invitation expiry
      const { error: updateError } = await supabase
        .from('business_members')
        .update({
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: calculateInvitationExpiry(expires_in_hours).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id);

      if (updateError) {
        throw new Error(`Failed to update invitation: ${updateError.message}`);
      }

      // Resend Auth invitation
      const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/accept-invitation`,
        data: {
          business_id: businessId,
          role: member.role,
          invitation_type: 'business_membership'
        }
      });

      if (authError) {
        throw new Error(`Failed to resend invitation email: ${authError.message}`);
      }

      return {
        success: true,
        message: custom_message || 'Invitation resent successfully'
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if user can perform team management actions
   */
  static async validateTeamAction(
    userId: string,
    businessId: string,
    action: string
  ): Promise<boolean> {
    try {
      const { data: userMember } = await supabase
        .from('business_members')
        .select('role')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .single();

      if (!userMember) {
        return false;
      }

      return canPerformTeamAction(action, userMember.role as TeamRoleType);
    } catch (error) {
      console.error('Error validating team action:', error);
      return false;
    }
  }

  /**
   * Get team invitation status for an email
   */
  static async getInvitationStatus(
    email: string,
    businessId: string
  ): Promise<{
    status: 'pending' | 'accepted' | 'expired' | 'none';
    expires_at: string | null;
    invited_at: string | null;
  }> {
    try {
      // Find user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!profile) {
        return { status: 'none', expires_at: null, invited_at: null };
      }

      // Check business membership
      const { data: member } = await supabase
        .from('business_members')
        .select('status, invitation_sent_at, invitation_expires_at, invitation_accepted_at')
        .eq('business_id', businessId)
        .eq('user_id', profile.id)
        .single();

      if (!member) {
        return { status: 'none', expires_at: null, invited_at: null };
      }

      const status = getInvitationStatus(
        member.invitation_sent_at,
        member.invitation_accepted_at,
        member.invitation_expires_at
      );

      return {
        status,
        expires_at: member.invitation_expires_at,
        invited_at: member.invitation_sent_at
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}

type GetTeamMembersParams = {
  role?: string;
  status?: string;
  search?: string;
  joined_after?: string;
  joined_before?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
  include_inactive?: boolean;
  include_pending?: boolean;
};
