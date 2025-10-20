# Team Management API

Advanced team management system with role-based access control, Supabase Auth integration, invitation management, and comprehensive business user administration. Features hierarchical permissions, audit trails, and automated email invitations.

## 🚀 Features

### Team Management Core
- **Role-Based Access Control**: Owner, Admin, Manager, Staff, Viewer hierarchy
- **User Invitations**: Email invitations via Supabase Auth with custom messages
- **Permission Management**: Granular permissions per role with custom overrides
- **Team Statistics**: Member analytics, role distribution, invitation tracking

### Security & Authorization
- **Row Level Security**: Business isolation with RLS policies
- **Role Hierarchy**: Prevents privilege escalation and unauthorized access
- **Admin/Owner Protection**: Only authorized users can modify team members
- **Audit Logging**: Complete action tracking for compliance

### Supabase Integration
- **Email Invitations**: Automated Supabase Auth invitation emails
- **User Management**: Create new accounts and link existing users
- **Auth Webhooks**: Real-time invitation status updates
- **Custom Redirects**: Business-specific invitation flows

---

## 👥 Team Management Endpoints

### Authentication
```http
Authorization: Bearer <your-supabase-jwt-token>
```

---

## 📋 Team Member Operations

### **1. Get All Team Members**

**GET /api/team-members**

Retrieves all users associated with the current business_id and their roles with comprehensive filtering.

#### Request
```http
GET /api/team-members?role=admin&status=active&search=john&page=1&limit=20&sort_by=joined_at&sort_order=desc&include_inactive=false&include_pending=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `role` (optional): Filter by team role (`owner`, `admin`, `manager`, `staff`, `viewer`)
- `status` (optional): Filter by status (`active`, `pending`, `suspended`, `inactive`)
- `search` (optional): Search by full name or email
- `joined_after` (optional): ISO date string for membership start filter
- `joined_before` (optional): ISO date string for membership end filter
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)
- `sort_by` (optional): Sort field (`joined_at`, `role`, `email`, `last_login_at`)
- `sort_order` (optional): Sort direction (`asc`, `desc`)
- `include_inactive` (optional): Include inactive members (`true`, `false`)
- `include_pending` (optional): Include pending invitations (`true`, `false`)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "business-member-uuid",
        "user_id": "user-uuid",
        "business_id": "business-uuid",
        "role": "admin",
        "permissions": [
          "business_settings",
          "team_management",
          "user_invitations",
          "role_assignments",
          "all_data_access",
          "financial_data",
          "reports_export"
        ],
        "joined_at": "2024-01-15T10:30:00Z",
        "invited_by": "owner-uuid",
        "status": "active",
        "full_name": "John Smith",
        "email": "john.smith@example.com",
        "avatar_url": "https://example.com/avatar.jpg",
        "phone_number": "+15551234567",
        "title": "Operations Manager",
        "last_login_at": "2024-02-14T09:15:00Z",
        "email_verified": true,
        "invitation_sent_at": "2024-01-15TIME",
        "invitation_accepted_at": "2024-01-16T08:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_accounts": 3,
      "per_page": 20,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

---

### **2. Invite Team Member**

**POST /api/team-members**

Invites a new user to join the business by creating organization_members and business_members records and sending an invitation email via Supabase Auth.

#### Request
```http
POST /api/team-members
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "new.member@example.com",
  "role": "manager",
  "permissions": [
    "customer_management",
    "appointment_management",
    "service_management",
    "basic_reports"
  ],
  "message": "Welcome to our team! Looking forward to working with you.",
  "redirect_url": "https://app.example.com/accept-invitation"
}
```

**Request Body Fields:**
- `email` (required): Email address to invite (valid email format)
- `role` (required): Team role (`owner`, `admin`, `manager`, `staff`, `viewer`)
- `permissions` (optional): Custom permissions array (max 20)
- `message` (optional): Custom invitation message (max 500 chars)
- `redirect_url` (optional): Custom redirect URL for invitation acceptance
- `custom_permissions` (optional): Additional custom permissions (max 10)

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Team member invitation sent successfully",
  "data": {
    "invitation": {
      "id": "business-member-uuid",
      "user_id": "new-user-uuid",
      "business_id": "business-uuid",
      "role": "manager",
      "permissions": [
        "customer_management",
        "appointment_management",
        "service_management",
        "basic_reports",
        "team_viewing",
        "communications"
      ],
      "status": "pending",
      "invitation_sent_at": "2024-02-14T14:30:00Z",
      "invitation_expires_at": "2024-02-17T14:30:00Z",
      "invited_by": "current-user-uuid"
    },
    "email_sent": true,
    "invited_email": "new.member@example.com",
    "role": "manager",
    "expires_at": "2024-02-17T14:30:00Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid email format or role
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Only owners/admins can invite team members
- `409 Conflict`: User already exists or is already a member

---

### **3. Update Team Member**

**PUT /api/team-members/:id**

Updates a team member's role, permissions, or status.

#### Request
```http
PUT /api/team-members/member-uuid
Content-Type: application/json
Authorization: Bearer <token>

{
  "role": "staff",
  "permissions": [
    "customer_read",
    "appointment_read",
    "service_read",
    "basic_reports"
  ],
  "status": "active",
  "notes": "Promoted to staff role with expanded permissions"
}
```

**Request Body Fields:**
- `role` (optional): New team role
- `permissions` (optional): Updated permissions array
- `status` (optional): Member status (`active`, `pending`, `suspended`, `in active`)
- `custom_permissions` (optional): Additional custom permissions
- `notes` (optional): Update notes (max 500 chars)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Team member updated successfully",
  "data": {
    "id": "member-uuid",
    "user_id": "user-uuid",
    "business_id": "business-uuid",
    "role": "staff",
    "permissions": [
      "member_read",
      "appointment_read",
      "service_read",
      "basic_reports"
    ],
    "joined_at": "2024-01-15T10:30:00Z",
    "status": "active",
    "full_name": "John Smith",
    "email": "john.smith@example.com",
    "updated_at": "2024-02-14T15:45:00Z"
  }
}
```

#### Error Responses
- `403 Forbidden`: Insufficient permissions to assign this role
- `404 Not Found`: Team member not found
- `400 Bad Request`: Invalid role or status

---

### **4. Remove Team Member**

**DELETE /api/team-members/:id**

Removes a team member from the business while maintaining their user account and other business associations.

#### Request
```http
DELETE /api/team-members/member-uuid
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "No longer employed"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Team member removed successfully"
}
```

#### Error Responses
- `403 Forbidden`: Insufficient permissions to remove this team member
- `404 Not Found`: Team member not found

---

## 🔑 Permission & Role Management

### **5. Get Current User Role**

**GET /api/team-members/my-role**

Get current user's role and permissions for this business.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "business_id": "business-uuid",
    "role": "admin",
    "permissions": [
      "business_settings",
      "team_management",
      "user_invitations",
      "role_assignments",
      "all_data_access",
      "financial_data",
      "reports_export"
    ],
    "default_permissions": [
      "business_settings",
      "team_management",
      "user_invitations",
      "role_assignments",
      "all_data_access",
      "financial_data",
      "reports_export"
    ],
    "status": "active",
    "joined_at": "2024-01-15T10:30:00Z",
    "capability_level": {
      "can_invite_members": true,
      "can_modify_roles": true,
      "can_remove_members": true,
      "can_transfer_ownership": false
    }
  }
}
```

### **6. Get Available Permissions**

**GET /api/team-members/permissions**

Get available permissions for each role.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "roles": ["owner", "admin", "manager", "staff", "viewer"],
    "permissions": {
      "owner": [
        "business_settings",
        "team_management",
        "user_invitation",
        "role_assignments",
        "all_data_access",
        "financial_data",
        "delete_business",
        "subscription_management"
      ],
      "admin": [
        "business_settings",
        "team_management", 
        "user_invitations",
        "role_assignments",
        "all_data_access",
        "financial_data",
        "reports_export"
      ],
      "manager": [
        "customer_management",
        "appointment_management",
        "service_management",
        "team_viewing",
        "basic_reports",
        "communications"
      ],
      ],
      "staff": [
        "customer_read",
        "appointment_read",
        "appointment_update",
        "service_read",
        "basic_reports"
      ],
      "viewer": [
        "customer_read",
        "appointment_read",
        "service_read",
        "basic_reports"
      ]
    },
    "role_hierarchy": {
      "owner": 5,
      "admin": 4,
      "manager": 3,
      "staff": 2,
      "viewer": 1
    },
    "available_actions": [
      "invite_member",
      "update_role",
      "update_permissions",
      "suspend_member",
      "remove_member",
      "transfer_ownership",
      "view_members",
      "export_members"
    ]
  }
}
```

---

## 📊 Team Analytics & Administration

### **7. Get Team Statistics**

**GET /api/team-members/stats**

Get comprehensive team member statistics and analytics.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "total_members": 15,
    "active_members": 14,
    "pending_invitations": 1,
    "role_distribution": {
      "owner": 1,
      "admin": 2,
      "manager": 4,
      "staff": 6,
      "viewer": 2
    },
    "recent_joiners": [
      {
        "id": "member-uuid",
        "full_name": "Jane Doe",
        "email": "jane.doe@example.com",
        "role": "staff",
        "joined_at": "2024-02-10T10:30:00Z"
      }
    ]
  }
}
```

### **8. Bulk Update Team Members**

**POST /api/team-members/bulk-update**

Update multiple team members at once with role and permission changes.

#### Request
```http
POST /api/team-members/bulk-update
Content-Type: application/json
Authorization: Bearer <token>

{
  "member_ids": ["member-uuid-1", "member-uuid-2", "member-uuid-3"],
  "updates": {
    "role": "staff",
    "permissions": ["customer_read", "appointment_read", "basic_reports"]
  }
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Successfully updated 3 team members",
  "data": {
    "updated_count": 3
  }
}
```

---

## 🎯 Advanced Operations

### **9. Transfer Business Ownership**

**POST /api/team-members/transfer-ownership**

Transfer business ownership to another team member (owner only).

#### Request
```http
POST /api/team-members/transfer-ownership
Content-Type: application/json
Authorization: Bearer <token>

{
  "new_owner_id": "new-owner-uuid",
  "confirmation_message": "I am transferring ownership to Jane Doe as I am retiring.",
  "transfer_reason": "Leadership transition"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Business ownership transferred successfully",
  "data": {
    "new_owner_id": "new-owner-uuid",
    "transferred_at": "2024-02-14T16:45:00Z",
    "confirmation": "I am transferring ownership to Jane Doe as I am retiring."
  }
}
```

### **10. Resend Invitation**

**POST /api/team-members/resend-invitation**

Resend invitation email to pending team member with updated expiry.

#### Request
```http
POST /api/team-members/resend-invitation
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "pending.member@example.com",
  "custom_message": "Resending your team invitation with extended expiration",
  "expires_in_hours": 168
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Invitation resent successfully",
  "data": {
    "email_resent": "pending.member@example.com",
    "expires_in_hours": 168
  }
}
```

### **11. Check Invitation Status**

**GET /api/team-members/invitation-status**

Check invitation status for a specific email address.

#### Request
```http
GET /api/team-members/invitation-status?email=new.user@example.com
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "email": "new.user@example.com",
    "business_id": "business-uuid",
    "status": "pending",
    "expires_at": "2024-02-17T14:30:00Z",
    "invited_at": "2024-02-14T14:30:00Z"
  }
}
```

### **12. Export Team Data**

**GET /api/team-members/export**

Export team member data in JSON or CSV format.

#### Request
```http
GET /api/team-members/export?format=csv&include_inactive=false&include_permissions=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `format` (optional): Export format (`json`, `csv`) - defaults to JSON
- `include_inactive` (optional): Include inactive members (`true`, `false`)
- `include_permissions` (optional): Include permission data (`true`, `false`)

#### Response (200 OK)
**CSV Export:**
```csv
Full Name,Email,Role,Status,Joined At,Last Login,Phone Number,Title,Permissions
"John Smith","john.smith@example.com","admin","active","2024-01-15T10:30:00Z","2024-02-14T09:15:00Z","+15551234567","Operations Manager","business_settings, team_management, user_invitations"
"Jane Doe","jane.doe@example.com","manager","active","2024-02-01T14:20:00Z","2024-02-14T08:30:00Z","+15559876543","Customer Success","customer_management, appointment_management, basic_reports"
```

**JSON Export:**
```json
{
  "success": true,
  "data": [
    {
      "id": "member-uuid",
      "full_name": "John Smith",
      "email": "john.smith@example.com",
      "role": "admin",
      "status": "active",
      "joined_at": "2024-01-15T10:30:00Z",
      "permissions": ["business_settings", "team_management", "user_invitations"]
    }
  ],
  "metadata": {
    "total_exported": 15,
    "exported_at": "2024-02-14T16:50:00Z",
    "format": "json",
    "include_inactive": false,
    "include_permissions": true
  }
}
```

---

## 🔒 Security Implementation

### **Role Hierarchy Enforcement**

The API enforces strict role hierarchy rules:

```javascript
const roleHierarchy = {
  'owner': 5,    // Highest level - can do everything
  'admin': 4,    // Can manage most operations except ownership transfer
  'manager': 3,  // Business operations management
  'staff': 2,    // Limited operational access  
  'viewer': 1    // Read-only access
};

// Role assignment restrictions:
// - Cannot assign a role higher than your own level
// - Cannot demote another owner unless you're transferring ownership
// - Cannot remove the last owner of a business
```

### **Row Level Security (RLS)**

All team management operations are protected by RLS policies:

```sql
-- Business Members RLS Policy
CREATE POLICY "business_members_team_isolation" ON business_members
FOR ALL
USING (business_id = get_user_business_id(auth.uid()))
WITH CHECK (business_id = get_user_business_id(auth.uid()));

-- Only owners/admins can modify team members
CREATE POLICY "business_members_admin_only" ON business_members
FOR ALL
USING (
  business_id = get_user_business_id(auth.uid()) 
  AND (
    EXISTS(SELECT 1 FROM business_members bm 
           WHERE bm.user_id = auth.uid() 
           AND bm.business_id = get_user_business_id(auth.uid())
           AND bm.role IN ('owner', 'admin'))
  )
);
```

### **Supabase Auth Integration**

Team invitations leverage Supabase Auth for secure email delivery:

```javascript
// Invitation email sent via Supabase Auth
const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${process.env.FRONTEND_URL}/accept-invitation`,
  data: {
    business_id: businessId,
    role: role,
    invited_by: invitedBy,
    invitation_type: 'business_membership'
  }
});
```

---

## 📱 Frontend Integration Examples

### **React Hook for Team Management**

```javascript
import { useState, useEffect } from 'react';

function useTeamManagement() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeamMembers = async (filters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/team-members?${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch team members');
      
      const data = await response.json();
      setTeamMembers(data.data.members);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async (inviteData) => {
    const response = await fetch('/api/team-members', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inviteData)
    });

    if (!response.ok) throw new Error('Failed to invite member');
    return response.json();
  };

  const updateMember = async (memberId, updateData) => {
    const response = await fetch(`/api/team-members/${memberId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) throw new Error('Failed to update member');
    return response.json();
  };

  const removeMember = async (memberId, reason) => {
    const response = await fetch(`/api/team-members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) throw new Error('Failed to remove member');
    return response.json();
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return {
    teamMembers,
    loading,
    error,
    fetchTeamMembers,
    inviteMember,
    updateMember,
    removeMember
  };
}

// Usage in component
function TeamManagement() {
  const {
    teamMembers,
    loading,
    inviteMember,
    updateMember,
    removeMember
  } = useTeamManagement();

  const handleInviteMember = async () => {
    try {
      await inviteMember({
        email: 'new.member@example.com',
        role: 'staff',
        message: 'Welcome to the team!'
      });
      // Refresh team members list
      fetchTeamMembers();
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  return (
    <div>
      <h2>Team Members ({teamMembers.length})</h2>
      
      {loading ? (
        <div>Loading team members...</div>
      } : (
        <div>
          {/* Team Member List */}
          {teamMembers.map(member => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onUpdate={(updates) => updateMember(member.id, updates)}
              onRemove={(reason) => removeMember(member.id, reason)}
            />
          ))}
          
          {/* Invite New Member */}
          <InviteMemberForm onSubmit={handleInviteMember} />
        </div>
      )}
    </div>
  );
}
```

### **Permission-Based UI Rendering**

```javascript
function TeamMemberActions({ member, currentUserRole }) {
  const canUpdateRole = ['owner', 'admin'].includes(currentUserRole);
  const canRemoveMember = ['owner', 'admin'].includes(currentUserRole);
  const canTransferOwnership = currentUserRole === 'owner';

  return (
    <div className="member-actions">
      {canUpdateRole && member.role !== 'owner' && (
        <RoleUpdateModal memberId={member.id} currentRole={member.role} />
      )}
      
      {canRemoveMember && member.role !== 'owner' && (
        <RemoveMemberButton memberId={member.id} />
      )}
      
      {canTransferOwnership && member.role === 'admin' && (
        <TransferOwnershipButton targetUserId={member.user_id} />
      )}
    </div>
  );
}

function InviteMemberButton({ currentUserRole }) {
  const canInviteMembers = ['owner', 'admin'].includes(currentUserRole);
  
  if (!canInviteMembers) return null;
  
  return <InviteMemberModal />;
}
```

### **Real-time Invitation Status**

```javascript
function InvitationTracker({ invitation }) {
  const [status, setStatus] = useState('pending');
  const [expiryTime, setExpiryTime] = useState(null);

  useEffect(() => {
    // Poll invitation status
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/team-members/invitation-status?email=${invitation.email}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        const data = await response.json();
        setStatus(data.data.status);
        setExpiryTime(data.data.expires_at);
      } catch (error) {
        console.error('Failed to check invitation status:', error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, [invitation.email]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'accepted': return '✅ Invitation accepted';
      case 'expired': return '❌ Invitation expired';
      case 'pending': return '⏳ Pending acceptance';
      default: return '❓ Unknown status';
    }
  };

  return (
    <div className="invitation-status">
      <span className={status}>{getStatusDisplay()}</span>
      {status === 'expired' && (
        <ResendInvitationButton email={invitation.email} />
      )}
    </div>
  );
}
```

---

This comprehensive team management API provides **enterprise-level user administration** with **Supabase Auth integration**, **role-based access control**, **automated invitations**, and **comprehensive audit trails** exactly as requested. The system ensures that **only owners/admins can modify team members** while maintaining **business isolation** through **row-level security policies** and **RBAC enforcement**.

