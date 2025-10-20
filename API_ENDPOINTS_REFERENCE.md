# API Endpoints Reference

This document outlines the comprehensive API endpoints supported by the multi-tenant database schema.

## Authentication Endpoints

### User Authentication (Supabase Auth)
```typescript
// POST /auth/v1/signup
{
  email: string,
  password: string,
  options: {
    data: {
      full_name?: string
    }
  }
}

// POST /auth/v1/token?grant_type=password
{
  email: string,
  password: string
}

// POST /auth/v1/logout
```

### Session Management
```typescript
// GET /auth/v1/user
// Returns: { user: User | null }

// PUT /auth/v1/user
// Returns: Updated user profile
```

## Organization Management

### Organizations
```typescript
// GET /rest/v1/organizations
// Returns: Organizations user has access to
SELECT * FROM organizations 
WHERE id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid()
);

// POST /rest/v1/organizations
// Business creation flow
{
  name: string,
  slug: string,
  plan_type: 'free' | 'starter' | 'professional' | 'enterprise'
}

// PUT /rest/v1/organizations?id=eq.{org_id}
// Owner/Admin only
{
  name?: string,
  domain?: string,
  settings?: object
}
```

### Organization Members
```typescript
// GET /rest/v1/organization_members?organization_id=eq.{org_id}
SELECT * FROM organization_members 
WHERE organization_id = $1;

// POST /rest/v1/organization_members
// Invite user to organization
{
  organization_id: string,
  user_email: string,
  role: 'member' | 'admin' | 'owner'
}

// DELETE for member removal
// PUT for role updates
```

## Business Management

### Businesses
```typescript
// GET /rest/v1/businesses
// Returns businesses in user's organizations
SELECT * FROM businesses 
WHERE organization_id IN (
  SELECT organization_id FROM organization_members 
  WHERE user_id = auth.uid()
);

// POST /rest/v1/businesses
// Create new business
{
  organization_id: string,
  name: string,
  slug: string,
  industry?: string,
  phone_number?: string,
  website?: string
}

// PUT /rest/v1/businesses?id=eq.{business_id}
// Business admin only
{
  name?: string,
  description?: string,
  industry?: string,
  phone_number?: string,
  settings?: object
}
```

### Business Members
```typescript
// GET /rest/v1/business_members?business_id=eq.{business_id}
SELECT * FROM business_members 
WHERE business_id = $1;

// POST /rest/v1/business_members
// Add user to business
{
  business_id: string,
  user_id: string,
  role: 'owner' | 'admin' | 'staff' | 'viewer'
}
```

## Customer Management

### Customer CRUD
```typescript
// GET /rest/v1/customers?business_id=eq.{business_id}
// Query params: select, order, limit, offset
SELECT * FROM customers 
WHERE business_id = $1;

// GET /rest/v1/customer_summary?business_id=eq.{business_id}
// Enhanced customer data with aggregates
SELECT * FROM customer_summary 
WHERE business_id = $1;

// POST /rest/v1/customers
{
  business_id: string,
  first_name: string,
  last_name: string,
  email?: string,
  phone: string,
  address?: object,
  preferences?: object
}

// PUT /rest/v1/customers?id=eq.{customer_id}
// Staff+ permission required

// DELETE /rest/v1/customers?id=eq.{customer_id}
// Admin+ permission required
```

### Customer Search & Filtering
```typescript
// Search by name
// GET /rest/v1/customers?business_id=eq.{business_id}&or=(first_name.ilike.%{term}%,last_name.ilike.%{term}%,phone.ilike.%{term}%)

// Filter by status
// GET /rest/v1/customers?business_id=eq.{business_id}&status=eq.active

// Filter by interaction date
// GET /rest/v1/customers?business_id=eq.{business_id}&last_interaction_at=gte.{date}
```

## Service Management

### Services/Products
```typescript
// GET /rest/v1/services?business_id=eq.{business_id}
// Returns business catalog
SELECT * FROM services 
WHERE business_id = $1 
ORDER BY name;

// POST /rest/v1/services
{
  business_id: string,
  name: string,
  description?: string,
  category?: string,
  duration: number, // minutes
  price: number,
  currency?: string,
  is_active?: boolean
}

// PUT/DELETE with business access controls
```

## Call Management

### Call Logs
```typescript
// GET /rest/v1/calls?business_id=eq.{business_id}
// Query params: select, order, filter by outcome, date
SELECT * FROM calls 
WHERE business_id = $1 
ORDER BY created_at DESC;

// POST /rest/v1/calls
// Typically created by Twilio webhooks
{
  business_id: string,
  caller_name?: string,
  caller_phone: long,
  duration?: number,
  outcome?: 'booked' | 'no_answer' | 'follow_up' | 'not_interested' | 'wrong_number',
  transcript?: string,
  converted?: boolean,
  recording_url?: string
}

// PUT for updating calls (status, notes, follow-up)
// GET /rest/v1/calls?id=eq.{call_id} for individual call details
```

## Conversation Management

### Conversations
```typescript
// GET /rest/v1/conversations?business_id=eq.{business_id}
// Returns conversation threads
SELECT * FROM conversations 
WHERE business_id = $1 
ORDER BY last_message_at DESC;

// GET /rest/v1/conversation_threads?business_id=eq.{business_id}&status=eq.active
// Enhanced conversation view with recent activity
SELECT * FROM conversation_threads 
WHERE business_id = $1 
AND status = 'active';

// POST /rest/v1/conversations
{
  business_id: string,
  customer_name?: string,
  customer_contact: string,
  channel: 'sms' | 'email' | 'whatsapp' | 'voice',
  subject?: string,
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}
```

### Messages
```typescript
// GET /rest/v1/conversation_messages?conversation_id=eq.{conversation_id}
// Returns messages in thread
SELECT * FROM conversation_messages 
WHERE conversation_id = $1 
ORDER BY created_at ASC;

// POST /rest/v1/conversation_messages
// Send message within conversation
{
  conversation_id: string,
  sender_type: 'agent' | 'customer' | 'ai',
  sender_id?: string, // if agent
  content: string,
  direction: 'inbound' | 'outbound',
  attachments?: array
}
```

## Appointment Management

### Appointments
```typescript
// GET /rest/v1/appointments?business_id=eq.{business_id}
// Query params: or(status.eq.pending,status.eq.confirmed) for active appointments
SELECT * FROM appointments 
WHERE business_id = $1 
ORDER BY scheduled_at ASC;

// POST /rest/v1/appointments
{
  business_id: string,
  customer_name: string,
  customer_phone: string,
  customer_email?: string,
  service_name: string,
  scheduled_at: string, // ISO datetime
  duration: number, // minutes
  notes?: string,
  total_price?: number
}

// PUT for status updates (confirmed, cancelled, completed)
// DELETE for cancellations with fees
```

### Appointment Management Operations
```typescript
// Reschedule appointment
PUT /rest/v1/appointments?id=eq.{appointment_id}
{
  scheduled_at: string,
  status: 'confirmed'
}

// Cancel appointment
PUT /rest/v1/appointments?id=eq.{appointment_id}
{
  status: 'cancelled',
  cancellation_reason: string
}

// Complete appointment
PUT /rest/v1/appointments?id=eq.{appointment_id}
{
  status: 'completed',
  internal_notes: string
}
```

## Review Management

### Reviews
```typescript
// GET /rest/v1/reviews?business_id=eq.{business_id}
// Returns customer reviews
SELECT * FROM reviews 
WHERE business_id = $1 
ORDER BY created_at DESC;

// POST /rest/v1/reviews
// Create customer review
{
  business_id: string,
  appointment_id?: string,
  customer_name: string,
  customer_email?: string,
  rating: number, // 1-5
  title?: string,
  comment?: string,
  platform?: 'google' | 'facebook' | 'yelp' | 'internal'
}

// PUT for business responses to reviews (admin only)
{
  response: string
}

// GET aggregate data
// GET /rest/v1/reviews?business_id=eq.{business_id}&select=rating&rating=gte.4
```

## Analytics & Reporting

### Dashboard Metrics
```typescript
// GET /rest/v1/business_dashboard_data?business_id=eq.{business_id}
// Returns key performance indicators
SELECT * FROM business_dashboard_data 
WHERE business_id = $1;

// GET /rest/v1/performance_metrics?business_id=eq.{business_id}&metric_date=gte.{start_date}
// Historical performance data
SELECT * FROM performance_metrics 
WHERE business_id = $1 
AND metric_date >= $2 
ORDER BY metric_date DESC;
```

### Daily Metrics
```typescript
// GET /rest/v1/daily_metrics?business_id=eq.{business_id}&date=gte.{date}
// Aggregated daily performance
SELECT * FROM daily_metrics 
WHERE business_id = $1 
AND date >= $2 
ORDER BY date DESC;

// Calculate metrics for date range
POST /rest/v1/rpc/generate_daily_metrics_for_period
{
  business_uuid: string,
  start_date: string,
  end_date: string
}
```

## AI Automation

### AI Scripts
```typescript
// GET /rest/v1/ai_scripts?business_id=eq.{business_id}&is_active=eq.true
// Returns active AI scripts
SELECT * FROM ai_scripts 
WHERE business_id = $1 
AND is_active = true;

// POST /rest/v1/ai_scripts
{
  business_id: string,
  name: string,
  description?: string,
  script_type: 'conversation' | 'phone_call' | 'email',
  content: string,
  personality?: string,
  voice_settings?: object,
  objection_handling?: object
}

// PUT for script updates and activation
PUT /rest/v1/ai_scripts?id=eq.{script_id}
{
  is_active: boolean,
  content?: string,
  personality?: string
}
```

### Conversation AI
```typescript
// POST /functions/v1/ai-copilot
// Real-time AI chat endpoint
{
  messages: [
    { role: "user", content: "string" },
    { role: "assistant", content: "string" }
  ]
}
// Returns: Server-sent events stream
```

## Notifications

### User Notifications
```typescript
// GET /rest/v1/notifications?user_id=eq.{user_id}&read=eq.false
// Returns unread notifications
SELECT * FROM notifications 
WHERE user_id = $1 
AND (read = false OR read IS NULL) 
ORDER BY created_at DESC;

// POST /rest/v1/notifications
// Create notification
{
  business_id: string,
  user_id?: string, // null for global notifications
  type: 'call_booking' | 'appointment_reminder' | 'review_request',
  title: string,
  message: string,
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

// PUT for marking as read
PUT /rest/v1/notifications?id=eq.{notification_id}
{
  read: true,
  read_at: "now()"
}
```

## File Upload & Storage

### File Storage (Supabase Storage)
```typescript
// Upload call recordings
POST /storage/v1/object/recordings/{business_id}/{filename}
Content-Type: audio/*

// Upload customer attachments
POST /storage/v1/object/conversations/{conversation_id}/{filename}

// Generate signed URLs for secure access
POST /storage/v1/object/sign/{bucket}/{path}

// Get file metadata
GET /storage/v1/object/info/{bucket}/{path}
```

## Advanced Query Operations

### Complex Filtering & Search
```typescript
// Multi-table joins via views
// Customer with recent interactions
GET /rest/v1/customer_summary?business_id=eq.{business_id}&total_calls=gte.3

// Conversations requiring follow-up
GET /rest/v1/conversation_threads?business_id=eq.{business_id}&needs_followup=eq.true

// Appointments requiring confirmation
GET /rest/v1/appointments?business_id=eq.{business_id}&status=eq.pending&scheduled_at=lte.{tomorrow}
```

### Data Aggregation
```typescript
// Custom metrics calculation
GET /rest/v1/calls?business_id=eq.{business_id}&select=duration,outcome,converted&created_at=gte.{month_ago}
// Calculate conversion rates client-side

// Performance trends
GET /rest/v1/performance_metrics?business_id=eq.{business_id}&metric_type=eq.conversion_rate&metric_date=gte.{start_date}
```

## Error Handling

### Standard Error Responses
```typescript
// Auth errors
{
  error: "authentication_failed",
  message: "Invalid credentials"
}

// Permission errors  
{
  error: "permission_denied",
  message: "Insufficient permissions for this operation"
}

// Validation errors
{
  error: "validation_failed",
  details: {
    field: "phone",
    message: "Invalid phone number format"
  }
}

// Rate limiting
{
  error: "rate_limit_exceeded",
  retry_after: 60
}
```

## Webhook Endpoints

### External Service Integration
```typescript
// Twilio call completion webhook
POST /webhooks/twilio/call-complete
{
  CallSid: string,
  CallStatus: string,
  Duration: number,
  RecordingUrl?: string,
  BusinessId: string // custom parameter
}

// Calendar sync webhook
POST /webhooks/calendar/appointment-update
{
  AppointmentId: string,
  Status: string,
  UpdatedAt: string
}
```

---

This comprehensive API reference covers all major operations supported by the multi-tenant database schema, providing complete CRUD functionality with proper security controls and business logic automation.
