# Conversation Management API

Complete REST API for managing multi-channel conversations and messages built with Express.js, TypeScript, and Supabase integration. Features comprehensive threading, filtering, business isolation, and real-time message management.

## 🎯 Features

- **Multi-Channel Support**: SMS, email, WhatsApp, Facebook, Instagram, Twitter, website chat
- **Conversation Threading**: Maintain persistent conversation threads with context
- **Message Management**: Send, receive, and track messages across channels
- **Business Isolation**: Row Level Security ensures data privacy between businesses
- **Advanced Filtering**: Search and filter by channel, status, priority, customer, and more
- **Agent Assignment**: Assign conversations to specific agents for handling
- **Read Status Tracking**: Track message delivery and read receipts
- **Conversation Statistics**: Analytics and reporting for conversation management
- **Comprehensive Validation**: Zod schema validation with detailed error messages

---

## 📋 Conversation Endpoints

### Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🚀 Conversation Operations

### **1. Create Conversation**
```http
POST /api/conversations
Content-Type: application/json
Authorization: Bearer <token>

{
  "customer_id": "uuid-of-existing-customer", // Optional
  "thread_type": "customer_support",          // Required
  "channel": "sms",                          // Required
  "status": "open",                          // Optional (default: open)
  "priority": "normal",                      // Optional (default: normal)
  "assigned_to": "agent-uuid",              // Optional
  "tags": ["urgent", "billing"],           // Optional
  "participants": {
    "customer": {
      "name": "John Doe",
      "contact": "+15551234567",
      "role": "customer"
    },
    "agents": [
      {
        "id": "agent-uuid",
        "name": "Sarah Agent",
        "role": "agent"
      }
    ]
  },
  "metadata": {
    "source_url": "https://example.com/contact",
    "campaign": "spring-promotion",
    "reference_id": "ticket-123"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": "conversation-uuid",
    "business_id": "business-uuid",
    "customer_id": "customer-uuid",
    "thread_type": "customer_support",
    "channel": "sms",
    "status": "open",
    "priority": "normal",
    "unread_count": 0,
    "created_at": "2024-01-01T...",
    "updated_at": "2024-01-01T..."
  }
}
```

### **2. Get Conversations (With Filtering)**
```http
GET /api/conversations?customer_id=customer-uuid&channel=sms&status=open&priority=high&assigned_to=agent-uuid&start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z&search=billing&tags=urgent,refund&page=1&limit=20&sort_by=last_message_at&sort_order=desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `customer_id` - Filter by specific customer
- `channel` - Filter by channel (sms, email, whatsapp, facebook, etc.)
- `status` - Filter by status (open, active, waiting, closed, spam, pending)
- `priority` - Filter by priority (low, normal, high, urgent)
- `assigned_to` - Filter by assigned agent
- `thread_type` - Filter by type (customer_support, sales_inquiry, etc.)
- `start_date` / `end_date` - Date range filtering
- `search` - Search in last message preview
- `tags` - Comma-separated tags to filter by
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort_by` - Sort field (created_at, last_message_at, priority, status)
- `sort_order` - asc or desc (default: desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conversation-uuid",
        "business_id": "business-uuid",
        "customer_id": "customer-uuid",
        "thread_type": "customer_support",
        "channel": "sms",
        "status": "open",
        "priority": "high",
        "unread_count": 3,
        "last_message_at": "2024-01-15T10:00:00Z",
        "last_message_preview": "I need help with my billing...",
        "assigned_to": "agent-uuid",
        "tags": ["urgent", "billing"]
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 95,
      "per_page": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### **3. Get Single Conversation**
```http
GET /api/conversations/{conversation-id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "conversation-uuid",
    "business_id": "business-uuid",
    "customer_id": "customer-uuid",
    "thread_type": "customer_support",
    "channel": "sms",
    "status": "open",
    "priority": "high",
    "unread_count": 3,
    "participants": {
      "customer": { "name": "John Doe", "contact": "+15551234567" },
      "agents": [{ "id": "agent-uuid", "name": "Sarah Agent" }]
    },
    "metadata": { "source_url": "https://example.com", "campaign": "spring-promotion" },
    "created_at": "2024-01-01T...",
    "updated_at": "2024-01-15T..."
  }
}
```

### **4. Get Conversation Messages**
```http
GET /api/conversations/{conversation-id}/messages?sender_type=customer&direction=inbound&page=1&limit=50&sort_by=created_at&sort_order=asc
Authorization: Bearer <token>
```

**Query Parameters:**
- `sender_type` - Filter by sender (customer, agent, system, bot)
- `message_type` - Filter by type (text, image, document, voice, etc.)
- `direction` - Filter by direction (inbound, outbound)
- `status` - Messages status (sending, sent, delivered, read, failed)
- `start_date` / `end_date` - Filter by date range
- `search` - Search in message body
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 200)
- `sort_by` - Sort field (created_at, status)
- `sort_order` - asc or desc (default: asc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "business_id": "business-uuid",
        "conversation_id": "conversation-uuid",
        "sender_type": "customer",
        "sender_name": "John Doe",
        "sender_contact": "+15551234567",
        "body": "I need help with my billing issue",
        "direction": "inbound",
        "status": "delivered",
        "message_type": "text",
        "read_at": null,
        "created_at": "2024-01-15T10:00:00Z",
        "metadata": { "delivery_report": { "provider": "twilio" } }
      },
      {
        "id": "message-uuid-2",
        "sender_type": "agent",
        "sender_name": "Sarah Agent",
        "body": "Hi John! I'd be happy to help with your billing issue.",
        "direction": "outbound",
        "status": "sent",
        "read_at": "2024-01-15T10:05:00Z"
      }
    ],
    "pagination": { /* pagination metadata */ }
  }
}
```

### **5. Send Message to Conversation**
```http
POST /api/conversations/{conversation-id}/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "sender_type": "agent",                  // Required
  "sender_name": "Sarah Agent",           // Optional
  "body": "Hi John! How can I help you?", // Required
  "direction": "outbound",                // Required
  "message_type":<｜Assistant｜>### **5. Send Message to Conversation**
```http
POST /api/conversations/{conversation-id}/messages
Content-Type: application/json
Authorization: Bearer <token>

{
  "sender_type": "agent",                  // Required
  "sender_name": "Sarah Agent",           // Optional
  "body": "Hi John! How can I help you?", // Required
  "direction": "outbound",                // Required
  "message_type": "text",                 // Optional (default: text)
  "status": "sent",                       // Optional (default: sent)
  "attachments": [                        // Optional
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "filename": "billing-chart.jpg",
      "size": 1024000,
      "mime_type": "image/jpeg"
    }
  ],
  "metadata": {
    "automation": {
      "trigger": "customer_message_received",
      "action_taken": "auto_response_sent"
    }
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Message created successfully",
  "data": {
    "id": "message-uuid",
    "conversation_id": "conversation-uuid",
    "sender_type": "agent":, 
    "sender_name": "Sarah Agent",
    "body": "Hi John! How can I help you?",
    "direction": "outbound",
    "status": "sent",
    "message_type": "text",
    "created_at": "2024-01-15T10:05:00Z"
  }
}
```

### **6. Update Conversation**
```http
PUT /api/conversations/{conversation-id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "active",
  "priority": "high",
  "assigned_to": "agent-uuid",
  "tags": ["urgent", "escalated"],
  "metadata": {
    "campaign": "updated-promotion",
    "notes": "Customer escalated due to billing complexity"
  }
}
```

### **7. Assign Conversation to Agent**
```http
PUT /api/conversations/{conversation-id}/assign
Content-Type: application/json
Authorization: Bearer <token>

{
  "agent_id": "agent-uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation assigned successfully",
  "data": {
    "id": "conversation-uuid",
    "assigned_to": "agent-uuid",
    "status": "active",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### **8. Mark Messages as Read**
```http
PUT /api/conversations/{conversation-id}/read
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Messages marked as read successfully"
}
```

### **9. Get Conversation Statistics**
```http
GET /api/conversations/stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalConversations": 1247,
    "openConversations": 23,
    "totalMessages": 15689,
    "averageResponseTime": 4.2, // minutes
    "channelBreakdown": {
      "sms": 850,
      "email": 234,
      "whatsapp": 123,
      "facebook": 40
    }
  }
}
```

### **10. Close Conversation**
```http
DELETE /api/conversations/{conversation-id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation closed successfully"
}
```

---

## 🔒 Security & Business Isolation

### **Row Level Security**
All conversation and message operations are automatically filtered by `business_id`:
- Users can only access conversations from their own business
- Database-level security enforced by Supabase RLS policies
- Complete tenant isolation with no cross-business data leakage

### **Validation**
- UUID format validation for all ID parameters
- Message body sanitization (HTML/script tag removal)
- Attachment validation with size and type limits
- Comprehensive Zod schema validation with detailed error messages

### **Business Logic**
- Automatic conversation preview generation from message text
- Priority calculation based on activity and unread count
- Unread count tracking and automatic updates
- Message status and delivery tracking
- Real-time conversation metadata updates

---

## 🧪 Example Usage

### **Complete Conversation Lifecycle:**

```javascript
// 1. Create a conversation thread
const createResponse = await fetch('/api/conversations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    customer_id: 'existing-customer-uuid',
    thread_type: 'customer_support',
    channel: 'sms',
    priority: 'urgent',
    tags: ['billing', 'urgent']
  })
});

const conversation = await createResponse.json();
console.log('Created conversation:', conversation.data);
const conversationId = conversation.data.id;

// 2. Send inbound message (from customer)
const inboundMessage = await fetch(`/api/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    sender_type: 'customer',
    sender_name: 'John Doe',
    sender_contact: '+15551234567',
    body: 'Hi, I have a billing issue I need help with.',
    direction: 'inbound',
    message_type: 'text'
  })
});

// 3. Send outbound response (from agent)
const outboundMessage = await fetch(`/api/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    sender_type: 'agent',
    sender_name: 'Sarah Agent',
    body: 'Hi John! I\'d be happy to help with your billing issue. What specific problem are you experiencing?',
    direction: 'outbound',
    message_type: 'text'
  })
});

// 4. Assign conversation to agent
const assignResponse = await fetch(`/api/conversations/${conversationId}/assign`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    agent_id: 'agent-uuid'
  })
});

// 5. Mark messages as read when agent views them
await fetch(`/api/conversations/${conversationId}/read`, {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// 6. Get all messages for the conversation
const messagesResponse = await fetch(`/api/conversations/${conversationId}/messages?sort_by=created_at&limits=50`, {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

const messages = await messagesResponse.json();
console.log('Conversation history:', messages.data.messages);
```

### **Advanced Filtering:**

```javascript
// Get urgent conversations assigned to specific agent
const urgentConversations = await fetch('/api/conversations?priority=urgent&assigned_to=agent-uuid&status=open', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// Get SMS conversations from last week with unread messages
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const smsUnread = await fetch(`/api/conversations?channel=sms&start_date=${weekAgo}&unread_count=1`, {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// Search conversations by content
const searchResults = await fetch('/api/conversations?search=billing&limit=20', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// Get conversations by tags
const taggedConversations = await fetch('/api/conversations?tags=urgent,refund&sort_by=last_message_at', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});
```

### **Error Handling:**

```javascript
try {
  // Try to access conversation from different business
  const response = await fetch('/api/conversations/other-business-conversation-id', {
    headers: { 'Authorization': 'Bearer limited-jwt-token' }
  });

  if (!response.ok) {
    const error = await response.json();
    console.log('Access denied:', error.message); // "Conversation not found"
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

---

## 📊 Conversation Statistics & Analytics

### **Key Metrics:**
- Total conversations per time period
- Channel breakdown (SMS, email, WhatsApp, etc.)
- Response time averages
- Agent assignment distribution
- Status distribution (open, active, closed)
- Priority distribution
- Message volume trends

### **Business Insights:**
- Peak conversation hours
- Most active channels
- Customer satisfaction trends
- Agent performance metrics
- Conversation resolution times

---

This conversation API provides comprehensive multi-channel communication management with enterprise-level security, scalability, and real-time capabilities perfect for customer support teams and communication management systems.
