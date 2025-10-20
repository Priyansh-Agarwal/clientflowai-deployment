import { z } from 'zod';

// Team roles with hierarchy
export const TeamRole = ['owner', 'admin', 'manager', 'staff', 'viewer'] as const;
export type TeamRoleType = typeof TeamRole[number];

export const TeamStatus = ['active', 'pending', 'suspended', 'inactive'] as const;
export type TeamStatusType = typeof TeamStatus[number];

// Permission definitions for each role
export const RolePermissions: Record<TeamRoleType, string[]> = {
  owner: [
    'business_settings',
    'team_management', 
    'user_invitations',
    'role_assignments',
    'all_data_access',
    'financial_data',
    'delete_business',
    'subscription_management'
  ],
  admin: [
    'business_settings',
    'team_management',
    'user_invitations', 
    'role_assignments',
    'all_data_access',
    'financial_data',
    'reports_export'
  ],
  manager: [
    'customer_management',
    'appointment_management',
    'service_management',
    'team_viewing',
    'basic_reports',
    'communications'
  ],
  staff: [
    'customer_read',
    'appointment_read',
    'appointment_update',
    'service_read',
    'basic_reports'
  ],
  viewer: [
    'customer_read',
    'appointment_read', 
    'service_read',
    'basic_reports'
  ]
};

// Invite new team member schema
export const inviteTeamMemberSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email too long'),
  
  role: z.enum(TeamRole, {
    errorMap: () => ({ message: 'Invalid role. Must be one of: owner, admin, manager, staff, viewer'})
  }),
  
  permissions: z.array(z.string().max(50))
    .optional()
    .refine(
      (permissions) => !permissions || permissions.length <= 20,
      'Too many permissions specified (max 20)'
    ),
  
  message: z.string()
    .max(500, 'Invitation message too long')
    .optional(),
  
  redirect_url: z.string()
    .url('Invalid redirect URL')
    .optional()
    .refine(
      (url) => !url || (url.includes('http') && url.length > 10),
      'Redirect URL must be a valid web URL'
    ),
  
  custom_permissions: z.array(z.string().max(100))
    .optional()
    .refine(
      (custom) => !custom || custom.length <= 10,
      'Too many custom permissions (max 10)'
    )
});

// Update team member schema
export const updateTeamMemberSchema = z.object({
  role: z.enum(TeamRole, {
    errorMap: () => ({ message: 'Invalid role' })
  }).optional(),
  
  permissions: z.array(z.string().max(50))
    .optional()
    .refine(
      (permissions) => !permissions || permissions.length <= 20,
      'Too many permissions specified'
    ),
  
  status: z.enum(TeamStatus, {
    errorMap: () => ({ message: 'Invalid status. Must be one of: active, pending, suspended, inactive' })
  }).optional(),
  
  custom_permissions: z.array(z.string().max(100))
    .optional(),
  
  notes: z.string()
    .max(500, 'Notes too long')
    .optional()
});

// Get team members query schema
export const getTeamMembersSchema = z.object({
  role: z.enum(TeamRole).optional(),
  status: z.enum(TeamStatus).optional(),
  
  // Search functionality
  search: z.string()
    .max(100, 'Search term too long')
    .optional(),
  
  // Date filters
  joined_after: z.string()
    .datetime('Invalid date format')
    .optional(),
  
  joined_before: z.string()
    .datetime('Invalid date format')
    .optional(),
  
  // Pagination
  page: z.string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .default('1')
    .optional(),
  
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(Number)
    .pipe(z.number().min(1).max(50))
    .default('20')
    .optional(),
  
  // Sorting
  sort_by: z.enum(['joined_at', 'role', 'email', 'last_login_at'])
    .optional()
    .default('joined_at'),
  
  sort_order: z.enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  
  // Additional filters
  include_inactive: z.string()
    .transform(val => val === 'true')
    .optional(),
  
  include_pending: z.string()
    .transform(val => val === 'true')
    .optional()
});

// Bulk operations schema
export const bulkUpdateTeamMembersSchema = z.object({
  member_ids: z.array(z.string().uuid('Invalid member ID format'))
    .min(1, 'At least one member ID is required')
    .max(50, 'Too many member IDs (max 50)'),
  
  updates: z.object({
    role: z.enum(TeamRole).optional(),
    status: z.enum(TeamStatus).optional(),
    permissions: z.array(z.string()).optional()
  })
});

// Team member transfer ownership schema
export const transferOwnershipSchema = z.object({
  new_owner_id: z.string()
    .uuid('Invalid user ID format'),
  
  confirmation_message: z.string()
    .min(10, 'Confirmation message must be at least 10 characters')
    .max(200, 'Confirmation message too long'),
  
  transfer_reason: z.string()
    .max(100, 'Transfer reason too long')
    .optional()
});

// Resend invitation schema
export const resendInvitationSchema = z.object({
  email: z.string()
    .email('Invalid email format'),
  
  custom_message: z.string()
    .max(300, 'Message too long')
    .optional(),
  
  expires_in_hours: z.number()
    .min(1, 'Must be at least 1 hour')
    .max(168, 'Cannot expire beyond 1 week')
    .default(72)
});

// Permission validation schema
export const validatePermissionsSchema = z.object({
  role: z.enum(TeamRole),
  requested_permissions: z.array(z.string()),
  
  allow_custom: z.boolean()
    .optional()
    .default(false),
  
  custom_permissions: z.array(z.string().max(100))
    .optional()
});

// Security and audit schemas
export const auditTeamActionSchema = z.object({
  action: z.enum([
    'invite_member',
    'update_role', 
    'update_permissions',
    'suspend_member',
    'remove_member',
    'transfer_ownership'
  ]),
  
  target_user_id: z.string().uuid().optional(),
  target_email: z.string().email().optional(),
  
  old_values: z.record(z.any()).optional(),
  new_values: z.record(z.any()).optional(),
  
  ip_address: z.string().ip().optional(),
  user_agent: z.string().max(500).optional(),
  
  notes: z.string().max(200).optional()
}).refine(
  (data) => data.target_user_id || data.target_email,
  'Either target_user_id or target_email must be provided'
);

// Type exports
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type GetTeamMembersQuery = z.infer<typeof getTeamMembersSchema>;
export type BulkUpdateTeamMembers = z.infer<typeof bulkUpdateTeamMembersSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type ResendInvitationInput = z.infer<typeof resendInvitationSchema>;
export type ValidatePermissionsInput = z.infer<typeof validatePermissionsSchema>;
export type AuditTeamAction = z.infer<typeof auditTeamActionSchema>;

// Utility functions
export function getDefaultPermissions(role: TeamRoleType): string[] {
  return RolePermissions[role] || [];
}

export function validateRoleAccess(
  userRole: TeamRoleType,
  targetRole: TeamRoleType,
  action: 'assign' | 'update' | 'remove'
): boolean {
  const roleHierarchy: Record<TeamRoleType, number> = {
    'owner': 5,
    'admin': 4,
    'manager': 3,
    'staff': 2,
    'viewer': 1
  };

  const userLevel = roleHierarchy[userRole];
  const targetLevel = roleHierarchy[targetRole];

  switch (action) {
    case 'assign':
      return userLevel >= targetLevel;
    case 'update':
      return userLevel > targetLevel;
    case 'remove':
      return userLevel > targetLevel;
    default:
      return false;
  }
}

export function filterPermissionsByRole(
  requestedPermissions: string[],
  role: TeamRoleType,
  allowCustom: boolean = false
): { valid: string[]; invalid: string[]; custom: string[] } {
  const rolePermissions = getDefaultPermissions(role);
  
  const valid: string[] = [];
  const invalid: string[] = [];
  const custom: string[] = [];

  requestedPermissions.forEach(permission => {
    if (rolePermissions.includes(permission)) {
      valid.push(permission);
    } else if (allowCustom) {
      custom.push(permission);
    } else {
      invalid.push(permission);
    }
  });

  return { valid, invalid, custom };
}

export function canPerformTeamAction(
  action: string,
  userRole: TeamRoleType
): boolean {
  const actions = {
    'invite_member': ['owner', 'admin'],
    'update_role': ['owner', 'admin'],
    'update_permissions': ['owner', 'admin'],
    'suspend_member': ['owner', 'admin'],
    'remove_member': ['owner', 'admin'],
    'transfer_ownership': ['owner'],
    'view_members': ['owner', 'admin', 'manager'],
    'export_members': ['owner', 'admin']
  };

  return actions[action as keyof typeof actions]?.includes(userRole) || false;
}

export function formatTeamMemberDisplay(member: any): string {
  const name = member.full_name || 'Unknown User';
  const email = member.email || 'No email';
  const role = member.role?.charAt(0).toUpperCase() + member.role?.slice(1) || 'No role';
  
  return `${name} (${email}) - ${role}`;
}

export function calculateTeamPermissions(
  baseRole: TeamRoleType,
  additionalPermissions: string[] = []
): string[] {
  const basePermissions = getDefaultPermissions(baseRole);
  const allPermissions = new Set([...basePermissions, ...additionalPermissions]);
  
  return Array.from(allPermissions);
}

export function sanitizeTeamAction(action: string): string {
  const sanitizedAction = action.toLowerCase().replace(/[^a-z_]/g, '');
  
  const validActions = [
    'invite_member',
    'update_role', 
    'update_permissions',
    'suspend_member',
    'remove_member',
    'transfer_ownership'
  ];

  return validActions.includes(sanitizedAction) ? sanitizedAction : 'unknown_action';
}

export function generateInvitationToken(email: string, businessId: string): string {
  const timestamp = Date.now().toString();
  const randomBytes = Math.random().toString(36).substring(2);
  
  return btoa(`${email}:${businessId}:${timestamp}:${randomBytes}`);
}

export function formatRoleDisplay(role: TeamRoleType): string {
  const roleDisplayMap: Record<TeamRoleType, string> = {
    'owner': 'Business Owner',
    'admin': 'Administrator', 
    'manager': 'Manager',
    'staff': 'Staff Member',
    'viewer': 'Viewer'
  };

  return roleDisplayMap[role] || role;
}

// Team member invitation duration utilities
export function calculateInvitationExpiry(hours: number): Date {
  const now = new Date();
  return new Date(now.getTime() + (hours * 60 * 60 * 1000));
}

export function isInvitationExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt);
}

export function getInvitationStatus(
  invitationSentAt: string | null,
  invitationAcceptedAt: string | null,
  expiresAt: string | null
): 'pending' | 'accepted' | 'expired' | 'none' {
  if (!invitationSentAt) return 'none';
  if (invitationAcceptedAt) return 'accepted';
  if (expiresAt && isInvitationExpired(expiresAt)) return 'expired';
  return 'pending';
}
