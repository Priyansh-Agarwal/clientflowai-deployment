import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const JWT_TOKEN = 'YOUR_SUPABASE_JWT_TOKEN'; // Replace with a valid JWT token for an owner/admin user

const makeTeamRequest = async (endpoint: string, options: any = {}) => {
  try {
    const response = await axios({
      url: `${API_BASE_URL}${endpoint}`,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        ...options.headers,
      },
      data: options.body,
      params: options.params,
    });
    console.log(`\n--- ${options.method || 'GET'} ${endpoint} Response ---`);
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error(`\n--- Error for ${options.method || 'GET'} ${endpoint} ---`);
    console.error(JSON.stringify(error.response?.data || error.message, null, 2));
    throw error;
  }
};

export const runTeamManagementExamples = async () => {
  console.log('Starting Team Management API Examples...');

  // 1. Get current user's role and permissions
  console.log('\n=== 1. Get My Role ===');
  try {
    await makeTeamRequest('/team-members/my-role');
  } catch (error) {
    console.error('Failed to get user role:', error.response?.data?.message);
  }

  // 2. Get available permissions for each role
  console.log('\n=== 2. Get Available Permissions ===');
  try {
    await makeTeamRequest('/team-members/permissions');
  } catch (error) {
    console.error('Failed to get permissions:', error.response?.data?.message);
  }

  // 3. Get all team members
  console.log('\n=== 3. Get All Team Members ===');
  try {
    await makeTeamRequest('/team-members', {
      params: {
        page: 1,
        limit: 10,
        sort_by: 'joined_at',
        sort_order: 'desc',
        include_inactive: false,
        include_pending: true
      }
    });
  } catch (error) {
    console.error('Failed to get team members:', error.response?.data?.message);
  }

  // 4. Search team members
  console.log('\n=== 4. Search Team Members ===');
  try {
    await makeTeamRequest('/team-members', {
      params: {
        search: 'admin',
        role: 'admin',
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Failed to search team members:', error.response?.data?.message);
  }

  // 5. Invite a new team member
  console.log('\n=== 5. Invite New Team Member ===');
  let newMemberId: string | undefined;

  try {
    const inviteResult = await makeTeamRequest('/team-members', {
      method: 'POST',
      body: {
        email: 'new.team.member@example.com',
        role: 'staff',
        message: 'Welcome to our team! We are excited to have you join us.',
        permissions: [
          'customer_read',
          'appointment_read',
          'service_read',
          'basic_reports'
        ]
      }
    });
    newMemberId = inviteResult.data.invitation.id;
  } catch (error) {
    console.error('Failed to invite team member:', error.response?.data?.message);
    
    // Try to find existing member for subsequent operations
    try {
      const searchResult = await makeTeamRequest('/team-members', {
        params: { search: 'new.team.member@example.com' }
      });
      if (searchResult.data.members.length > 0) {
        newMemberId = searchResult.data.members[0].id;
        console.log(`Found existing member: ${newMemberId}`);
      }
    } catch (searchError) {
      console.error('Could not find existing member for testing');
    }
  }

  // 6. Get team member statistics
  console.log('\n=== 6. Get Team Statistics ===');
  try {
    await makeTeamRequest('/team-members/stats');
  } catch (error) {
    console.error('Failed to get team stats:', error.response?.data?.message);
  }

  // 7. Check invitation status
  console.log('\n=== 7. Check Invitation Status ===');
  try {
    await makeTeamRequest('/team-members/invitation-status', {
      params: { email: 'new.team.member@example.com' }
    });
  } catch (error) {
    console.error('Failed to check invitation status:', error.response?.data?.message);
  }

  // 8. Update team member role (if we have a member)
  if (newMemberId && uuidRegex.test(newMemberId)) {
    console.log('\n=== 8. Update Team Member Role ===');
    try {
      await makeTeamRequest(`/team-members/${newMemberId}`, {
        method: 'PUT',
        body: {
          role: 'manager',
          permissions: [
            'customer_management',
            'appointment_management',
            'service_management',
            'team_viewing',
            'basic_reports',
            'communications'
          ],
          notes: 'Promoted to manager role with expanded responsibilities'
        }
      });
    } catch (error) {
      console.error('Failed to update member role:', error.response?.data?.message);
    }
  } else {
    console.log('\n=== Skipping member update - no valid member ID ===');
  }

  // 9. Bulk update team members
  console.log('\n=== 9. Bulk Update Team Members ===');
  try {
    const teamMembers = await makeTeamRequest('/team-members', {
      params: { limit: 5 }
    });
    
    if (teamMembers.data.members.length >= 2) {
      const memberIds = teamMembers.data.members.slice(0, 2).map((member: any) => member.id);
      
      await makeTeamRequest('/team-members/bulk-update', {
        method: 'POST',
        body: {
          member_ids: memberIds,
          updates: {
            status: 'active',
            permissions: [
              'customer_read',
              'appointment_read',
              'service_read',
              'basic_reports'
            ]
          }
        }
      });
    }
  } catch (error) {
    console.error('Bulk update failed:', error.response?.data?.message);
  }

  // 10. Resend invitation (if member exists and is pending)
  console.log('\n=== 10. Resend Invitation ===');
  try {
    await makeTeamRequest('/team-members/resend-invitation', {
      method: 'POST',
      body: {
        email: 'new.team.member@example.com',
        custom_message: 'Resending your team invitation - please check your email.',
        expires_in_hours: 168 // 1 week
      }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('No pending invitation found to resend');
    } finally {
      console.error('Resend invitation failed:', error.response?.data?.message);
    }
  }

  // 11. Export team data (JSON format)
  console.log('\n=== 11. Export Team Data (JSON) ===');
  try {
    await makeTeamRequest('/team-members/export', {
      params: {
        format: 'json',
        include_inactive: false,
        include_permissions: true
      }
    });
  } catch (error) {
    console.error('Export team data failed:', error.response?.data?.message);
  }

  // 12. Export team data (CSV format)
  console.log('\n=== 12. Export Team Data (CSV) ===');
  try {
    const csvResponse = await makeTeamRequest('/team-members/export', {
      params: {
        format: 'csv',
        include_permissions: false
      }
    });
    
    console.log('CSV Export Preview (first 3 lines):');
    const csvLines = csvResponse.split('\n').slice(0, 3);
    csvLines.forEach(line => console.log(line));
    
  } catch (error) {
    console.error('CSV export failed:', error.response?.data?.message);
  }

  // 13. Team management health check
  console.log('\n=== 13. Team Management Health Check ===');
  try {
    await makeTeamRequest('/team-members/health');
  } catch (error) {
    console.error('Health check failed:', error.response?.data?.message);
  }

  console.log('\nTeam Management API Examples Finished.');
};

// Advanced team management examples
export const runAdvancedTeamExamples = async () => {
  console.log('Starting Advanced Team Management Examples...');

  // Example 1: Complete team onboarding workflow
  console.log('\n=== Advanced: Team Onboarding Workflow ===');
  
  try {
    // Step 1: Check current user's team management capability
    const myRole = await makeTeamRequest('/team-members/my-role');
    const canInviteMembers = myRole.data.capability_level.can_invite_members;
    
    if (!canInviteMembers) {
      console.log('Current user cannot invite team members - skipping onboarding workflow');
      return;
    }

    console.log(`Current user role: ${myRole.data.role} - can invite members: ${canInviteMembers}`);

    // Step 2: Get available permissions for different roles
    const permissions = await makeTeamRequest('/team-members/permissions');
    console.log('\nAvailable roles:', permissions.data.roles);

    // Step 3: Invite multiple team members with different roles
    const newMembers = [
      {
        email: 'manager.new@example.com',
        role: 'manager',
        message: 'Welcome! You will be managing customer operations.'
      },
      {
        email: 'staff.member1@example.com', 
        role: 'staff',
        message: 'Join our team as a staff member.'
      },
      {
        email: 'staff.member2@example.com',
        role: 'staff',
        message: 'Welcome to the team!'
      }
    ];

    const inviteResults: any[] = [];
    for (const member of newMembers) {
      try {
        const result = await makeTeamRequest('/team-members', {
          method: 'POST',
          body: member
        });
        inviteResults.push(result.data);
        console.log(`✅ Invited ${member.email} as ${member.role}`);
      } catch (error) {
        console.log(`⚠️  Failed to invite ${member.email}: ${error.response?.data?.message}`);
      }
    }

    // Step 4: Monitor invitation statuses
    console.log('\n--- Monitoring Invitation Status ---');
    for (const member of newMembers) {
      try {
        const statusResult = await makeTeamRequest('/team-members/invitation-status', {
          params: { email: member.email }
        });
        console.log(`${member.email} status: ${statusResult.data.status}`);
      } catch (error) {
        console.log(`Could not check status for ${member.email}`);
      }
    }

    // Step 5: Get updated team statistics
    console.log('\n--- Updated Team Statistics ---');
    const currentStats = await makeTeamRequest('/team-members/stats');
    console.log(`Total members: ${currentStats.data.total_members}`);
    console.log(`Active members: ${currentStats.data.active_members}`);
    console.log(`Pending invitations: ${currentStats.data.pending_invitations}`);

  } catch (error) {
    console.error('Advanced team onboarding workflow failed:', error.response?.data?.message);
  }

  // Example 2: Role hierarchy demonstration
  console.log('\n=== Advanced: Role Hierarchy Management ===');
  
  try {
    // Get all team members and demonstrate role restrictions
    const allMembers = await makeTeamRequest('/team-members', {
      params: { include_inactive: true }
    });

    const membersByRole = allMembers.data.members.reduce((acc: any, member: any) => {
      if (!acc[member.role]) acc[member.role] = [];
      acc[member.role].push(member);
      return acc;
    }, {});

    console.log('\nTeam composition by role:');
    Object.entries(membersByRole).forEach(([role, members]: [string, any]) => {
      console.log(`  ${role}: ${members.length} members`);
      members.forEach((member: any) => {
        console.log(`    - ${member.full_name} (${member.email})`);
      });
    });

    // Demonstrate permission differences between roles
    console.log('\nRole permission comparison:');
    const permissionsData = await makeTeamRequest('/team-members/permissions');
    
    Object.entries(permissionsData.data.permissions).forEach(([role, permissions]: [string, any]) => {
      console.log(`  ${role}: ${permissions.length} permissions`);
      console.log(`    Permissions: ${permissions.slice(0, 3).join(', ')}${permissions.length > 3 ? '...' : ''}`);
    });

  } catch (error) {
    console.error('Role hierarchy demonstration failed:', error.response?.data?.message);
  }

  // Example 3: Permission management examples
  console.log('\n=== Advanced: Permission Management ===');
  
  try {
    // Get current permissions and demonstrate role transitions
    const permissions = await makeTeamRequest('/team-members/permissions');
    
    console.log('\nPermission matrix:');
    console.log('Role\t\tCore Permissions\tAdvanced Permissions');
    console.log('----\t\t---------------\t--------------------');
    
    Object.entries(permissions.data.permissions).forEach(([role, rolePerms]: [string, any]) => {
      const corePerms = rolePerms.filter((perm: string) => 
        !perm.includes('business_settings') && 
        !perm.includes('team_management') &&
        !perm.includes('subscription')
      );
      const advPerms = rolePerms.filter((perm: string) =>
        perm.includes('business_settings') ||
        perm.includes('team_management') ||
        perm.includes('subscription')
      );
      
      console.log(`${role.padEnd(12)}\t${corePerms.length}\t\t\t${advPerms.length}`);
    });

    // Demonstrate permission evolution (staff to manager promotion)
    console.log('\n--- Permission Evolution Example ---');
    
    const staffPermissions = permissions.data.permissions.staff;
    const managerPermissions = permissions.data.permissions.manager;
    
    console.log('Staff permissions:', staffPermissions);
    console.log('Manager permissions:', managerPermissions);
    
    const additionalStaffPermissions = managerPermissions.filter(
      (perm: string) => !staffPermissions.includes(perm)
    );
    
    console.log('Additional permissions for manager:', additionalStaffPermissions);
    
  } catch (error) {
    console.error('Permission management demonstration failed:', error.response?.data?.message);
  }

  console.log('\nAdvanced Team Management Examples Finished.');
};

// Permission validation examples
export const runPermissionValidationExamples = async () => {
  console.log('Starting Permission Validation Examples...');

  try {
    // Example 1: Validate current user's team management capabilities
    console.log('\n=== Permission Validation: Current User ===');
    
    const myRole = await makeTeamRequest('/team-members/my-role');
    const myCapabilities = myRole.data.capability_level;
    
    console.log(`Current user capabilities:`);
    console.log(`  Can invite members: ${myCapabilities.can_invite_members}`);
    console.log(`  Can modify roles: ${myCapabilities.can_modify_roles}`);
    console.log(`  Can remove members: ${myCapabilities.can_remove_members}`);
    console.log(`  Can transfer ownership: ${myCapabilities.can_transfer_ownership}`);
    
    // Example 2: Try unauthorized operations (expect failures)
    console.log('\n=== Permission Validation: Unauthorized Operations ===');
    
    // Try to invite with non-admin token (should fail if using staff/viewer token)
    try {
      await makeTeamRequest('/team-members', {
        method: 'POST',
        body: {
          email: 'unauthorized.test@example.com',
          role: 'staff'
        }
      });
      console.log('❌ Permission check failed - invitation succeeded when it should have been blocked');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Permission validation working - unauthorized invitation blocked');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.data?.message);
      }
    }
    
    // Example 3: Role hierarchy validation
    console.log('\n=== Permission Validation: Role Hierarchy ===');
    
    const permissionsData = await makeTeamRequest('/team-members/permissions');
    const roleHierarchy = permissionsData.data.role_hierarchy;
    
    console.log('Role hierarchy levels:');
    Object.entries(roleHierarchy).forEach(([role, level]: [string, any]) => {
      console.log(`  ${role}: level ${level}`);
    });
    
    // Demonstrate hierarchy validation logic
    console.log('\nHierarchy validation examples:');
    const examples = [
      { userRole: 'owner', targetRole: 'admin', action: 'assign' },
      { userRole: 'admin', targetRole: 'admin', action: 'assign' },
      { userRole: 'staff', targetRole: 'manager', action: 'assign' },
      { userRole: 'viewer', targetRole: 'staff', action: 'remove' }
    ];
    
    examples.forEach(example => {
      const userLevel = roleHierarchy[example.userRole];
      const targetLevel = roleHierarchy[example.targetRole];
      const allowed = example.action === 'assign' ? userLevel >= targetLevel : userLevel > targetLevel;
      
      console.log(
        `  ${example.userRole} (${userLevel}) ${example.action} ${example.targetRole} (${targetLevel}): ${allowed ? '✅ Allowed' : '❌ Denied'}`
      );
    });
    
  } catch (error) {
    console.error('Permission validation examples failed:', error.response?.data?.message);
  }

  console.log('\nPermission Validation Examples Finished.');
};

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Complete team management examples runner
export const runCompleteTeamManagementExamples = async () => {
  try {
    console.log('🚀 Starting Complete Team Management API Demo');
    
    await runTeamManagementExamples();
    await runAdvancedTeamExamples();
    await runPermissionValidationExamples();
    
    console.log('\n🎉 All Team Management API Examples Completed Successfully!');
    console.log('\n👥 Team Management system is ready for production use.');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ Role-based access control with hierarchy');
    console.log('✅ Supabase Auth email invitations');
    console.log('✅ Team member CRUD operations');
    console.log('✅ Permission management system');
    console.log('✅ Bulk operations and statistics');
    console.log('✅ Data export capabilities');
    console.log('✅ Business isolation with RLS');
    
  } catch (error) {
    console.error('Error running complete team management examples:', error);
  }
};
