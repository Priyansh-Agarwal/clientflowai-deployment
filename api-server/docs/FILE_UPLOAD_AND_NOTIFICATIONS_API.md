# File Upload and Notifications API

Comprehensive file upload system with Supabase Storage integration and real-time notification management with automatic database insertion triggers for business events.

## 🚀 Features

### File Upload System
- **Supabase Storage Integration**: Secure file storage with business isolation
- **File Validation**: MIME type validation, file size limits, security checks
- **Organized Storage**: Files stored under `business_id` folders
- **Public URLs**: Instant access via generated public URLs
- **Signed URLs**: Secure time-limited download links for sensitive files

### Notification System
- **Real-time Notifications**: Automatic notifications for business events
- **Database Triggers**: Auto-insert notifications for appointments, reviews
- **Read Status Tracking**: Timestamp-based read/unread status
- **Priority Levels**: Low, normal, high, urgent priority handling
- **Bulk Operations**: Mark multiple notifications as read/unread

---

## 📁 File Upload Endpoints

### Authentication
```http
Authorization: Bearer <your-supabase-jwt-token>
```

### **1. Upload File**

**POST /api/upload/files**

Uploads a file to Supabase Storage under organized `business_id/business/` folder.

#### Request
```http
POST /api/upload/files
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: [FILE] (required) - File to upload
- description: "Customer invoice for January" (optional)
- folder: "invoices" (optional, default: "general")
- tags: ["invoice", "january", "customer"] (optional, JSON array)
- category: "business_documents" (optional)
- confidential: "true" (optional, default: "false")
```

#### Supported File Types
```javascript
// Images
'image/jpeg', 'image/png', 'image/gif', 'image/webp'

// Documents  
'application/pdf', 'text/plain', 'application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Spreadsheets
'application/vnd.ms-excel',
'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'text/csv'

// Archives
'application/zip', 'application/x-zip-compressed'
```

#### File Size Limits
- Images: 5MB
- Documents: 10MB
- Spreadsheets: 10MB
- Archives: 50MB
- Default: 10MB

#### Response (201 Created)
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file_id": "uploaded-file-uuid",
    "file_name": "customer_invoice_january.pdf",
    "file_path": "business-uuid/1234567890_customer_invoice_january.pdf",
    "file_size_bytes": 245760,
    "file_size_mb": 0.24,
    "file_type": "pdf",
    "mime_type": "application/pdf",
    "public_url": "https://supabase.com/storage/...",
    "notification_id": "notification-uuid",
    "upload_url": "/api/upload/files/uploaded-file-uuid",
    "download_url": "https://supabase.com/storage/..."
  },
  "metadata": {
    "uploaded_at": "2024-02-14T15:30:00Z",
    "uploaded_by": "user-uuid",
    "business_id": "business-uuid"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid file type, file size exceeded, validation failed
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Storage upload failed

---

### **2. Get Uploaded Files**

**GET /api/upload/files**

Retrieve uploaded files with filtering, pagination, and search.

#### Request
```http
GET /api/upload/files?folder=invoices&fileType=pdf&search=customer&page=1&limit=20&sortBy=created_at&sortOrder=desc
Authorization: Bearer <token>
```

#### Query Parameters
- `folder` (optional): Filter by folder name
- `fileType` (optional): Filter by file type (`image`, `document`, `spreadsheet`, `archive`, `other`)
- `category` (optional): Filter by category
- `search` (optional): Search by filename
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)
- `sortBy` (optional): Sort field (`created_at`, `file_name`, `file_size_bytes`)
- `sortOrder` (optional): Sort direction (`asc`, `desc`)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file-uuid",
        "business_id": "business-uuid",
        "user_id": "user-uuid",
        "file_name": "customer_invoice_january.pdf",
        "file_path": "business-uuid/1234567890_customer_invoice_january.pdf",
        "file_size_bytes": 245760,
        "file_type": "pdf",
        "mime_type": "application/pdf",
        "storage_bucket": "business-files",
        "public_url": "https://supabase.com/storage/...",
        "metadata": {
          "description": "Customer invoice for January",
          "folder": "invoices",
          "tags": ["invoice", "january", "customer"],
          "category": "business_documents",
          "confidential": false,
          "safe_filename": "1234567890_customer_invoice_january.pdf",
          "file_icon": "📄",
          "upload_source": "web_upload"
        },
        "created_at": "2024-02-14T15:30:00Z",
        "updated_at": "2024-02-14T15:30:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 1,
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_count": 15,
      "per_page": 20,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

---

### **3. Get Specific File**

**GET /api/upload/files/:id**

Get detailed information about a specific uploaded file.

#### Request
```http
GET /api/upload/files/file-uuid
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "business_id": "business-uuid",
    "user_id": "user-uuid", 
    "file_name": "customer_invoice_january.pdf",
    "file_path": "business-uuid/1234567890_customer_invoice_january.pdf",
    "file_size_bytes": 245760,
    "file_type": "document",
    "mime_type": "application/pdf",
    "storage_bucket": "business-files",
    "public_url": "https://supabase.com/storage/...",
    "notification_id": "notification-uuid",
    "metadata": {
      "description": "Customer invoice for January",
      "folder": "invoices",
      "tags": ["invoice", "january", "customer"],
      "category": "business_documents",
      "confidential": false
    },
    "created_at": "2024-02-14T15:30:00Z",
    "updated_at": "2024-02-14T15:30:00Z"
  }
}
```

---

### **4. Download File**

**GET /api/upload/files/:id/download**

Get a time-limited signed URL for secure file download.

#### Request
```http
GET /api/upload/files/file-uuid/download?expires_in=7200
Authorization: Bearer <token>
```

#### Query Parameters
- `expires_in` (optional): URL expiration in seconds (default: 3600/1 hour)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "download_url": "https://supabase.com/storage/...?signed-url",
    "expires_in": 7200,
    "expires_at": "2024-02-14T17:30:00Z",
    "file_id": "file-uuid"
  }
}
```

---

### **5. Delete File**

**DELETE /api/upload/files/:id**

Remove file from both Supabase Storage and database.

#### Request
```http
DELETE /api/upload/files/file-uuid
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### **6. File Upload Statistics**

**GET /api/upload/files/stats**

Get comprehensive file upload statistics for the business.

#### Request
```http
GET /api/upload/files/stats?timeframe=30d
Authorization: Bearer <token>
```

#### Query Parameters
- `timeframe` (optional): Period for statistics (`24h`, `7d`, `30d`, `90d`, `all`)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "total_files": 125,
    "total_size_mb": 67.4,
    "files_by_type": {
      "pdf": 45,
      "image": 38,
      "document": 42
    },
    "recent_uploads": [
      {
        "file_name": "customer_invoice_january.pdf",
        "file_size_mb": 0.24,
        "created_at": "2024-02-14T15:30:00Z"
      }
    ],
    "timeframe": "30d",
    "generated_at": "2024-02-14T16:00:00Z"
  }
}
```

---

## 🔔 Notification Endpoints

### **1. Get Notifications**

**GET /api/notifications**

Retrieve unread notifications for authenticated user, sorted by created_at.

#### Request
```http
GET /api/notifications?page=1&limit=20&sort_by=created_at&sort_order=desc&include_read=false
Authorization: Bearer <token>
```

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 50)
- `sort_by` (optional): Sort field (`created_at`, `priority`, `read_at`, `expires_at`)
- `sort_order` (optional): Sort direction (`asc`, `desc`)
- `include_read` (optional): Include read notifications (`true`, `false`, default: `true`)
- `include_expired` (optional): Include expired notifications (`true`, `false`, default: `false`)
- `type` (optional): Filter by notification type
- `priority` (optional): Filter by priority (`low`, `normal`, `high`, `urgent`)
- `read_status` (optional): Filter by read status (`unread`, `read`, `archived`, `expired`)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "id": "notification-uuid",
        "business_id": "business-uuid",
        "user_id": "user-uuid",
        "type": "appointment_confirmed",
        "title": "Appointment Confirmed",
        "message": "Appointment for John Smith has been confirmed for Mon Feb 15, 2024 at 2:00 PM",
        "data": {
          "appointment_id": "appointment-uuid",
          "customer_name": "John Smith",
          "customer_phone": "+15551234567",
          "service_name": "Haircut",
          "scheduled_at": "2024-02-15T14:00:00Z",
          "status": "confirmed"
        },
        "action_url": "/appointments/appointment-uuid",
        "action_label": "View Appointment",
        "priority": "normal",
        "read_at": null,
        "expires_at": "2024-02-21T00:00:00Z",
        "created_at": "2024-02-14T15:30:00Z",
        "updated_at": "2024-02-14T15:30:00Z"
      },
      {
        "id": "notification-uuid-2",
        "business_id": "business-uuid",
        "user_id": "user-uuid",
        "type": "review_submitted",
        "title": "New Review Received",
        "message": "A new 5-star review was submitted by Jane Doe.",
        "data": {
          "review_id": "review-uuid",
          "rating": 5,
          "reviewer_name": "Jane Doe",
          "platform": "google",
          "comment": "Excellent service!"
        },
        "action_url": "/reviews/review-uuid",
        "action_label": "View Review",
        "priority": "normal",
        "read_at": null,
        "created_at": "2024-02-14T14:15:00Z",
        "updated_at": "2024-02-14T14:15:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 45,
      "per_page": 20,
      "has_next": true,
      "has_prev": false
    },
    "unread_count": 12
  },
  "metadata": {
    "business_id": "business-uuid",
    "user_id": "user-uuid"
  }
}
```

---

### **2. Mark Notification as Read**

**PUT /api/notifications/:id/read**

Mark notification as read by setting read_at timestamp.

#### Request
```http
PUT /api/notifications/notification-uuid/read
Content-Type: application/json
Authorization: Bearer <token>

{
  "action_taken": "clicked_action",
  "action_data": {
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  }
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Notification marked as read successfully",
  "data": {
    "notification_id": "notification-uuid",
    "read_at": "2024-02-14T16:45:00Z",
    "action_taken": "clicked_action",
    "action_data": {
      "user_agent": "Mozilla/5.0...",
      "ip_address": "192.168.1.1"
    }
  }
}
```

---

### **3. Bulk Notification Actions**

**POST /api/notifications/bulk-action**

Perform bulk operations on multiple notifications.

#### Request
```http
POST /api/notifications/bulk-action
Content-Type: application/json
Authorization: Bearer <token>

{
  "notification_ids": [
    "notification-uuid-1",
    "notification-uuid-2", 
    "notification-uuid-3"
  ],
  "action": "mark_read",
  "action_data": {
    "bulk_action_reason": "batch_read"
  }
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Bulk action completed successfully",
  "data": {
    "action": "mark_read",
    "notification_ids": [
      "notification-uuid-1",
      "notification-uuid-2",
      "notification-uuid-3"
    ],
    "affected_count": 3,
    "processed_at": "2024-02-14T16:50:00Z"
  }
}
```

---

### **4. Notification Statistics**

**GET /api/notifications/stats**

Get comprehensive notification statistics and analytics.

#### Request
```http
GET /api/notifications/stats?timeframe=7d
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Notification statistics retrieved successfully",
  "data": {
    "total_notifications": 48,
    "unread_count": 12,
    "read_count": 36,
    "notifications_by_type": {
      "appointment_confirmed": 15,
      "review_submitted": 8,
      "appointment_cancelled": 3,
      "file_uploaded": 22
    },
    "timeframe": "7d",
    "generated_at": "2024-02-14T17:00:00Z"
  },
  "metadata": {
    "business_id": "business-uuid",
    "user_id": "user-uuid"
  }
}
```

---

### **5. Unread Count**

**GET /api/notifications/unread-count**

Get total count of unread notifications for updating UI badges.

#### Request
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "unread_count": 12,
    "user_id": "user-uuid",
    "business_id": "business-uuid",
    "fetched_at": "2024-02-14T17:05:00Z"
  }
}
```

---

## 🔧 Automatic Notification Triggers

The system automatically creates notifications for these events:

### **Appointment Events**
```sql
-- Triggers run automatically on appointment table INSERT/UPDATE
-- appointment_confirmed → when status changes to 'confirmed'
-- appointment_cancelled → when status changes to 'cancelled'  
-- appointment_completed → when status changes to 'completed'
```

### **Review Events**
```sql
-- Triggers run automatically on review table INSERT
-- review_submitted → when new review is inserted
-- Priority based on rating (rating ≤ 2 = 'high' priority)
```

### **Team Events**
- User invitations sent via Supabase Auth
- Permission changes
- Ownership transfers

### **File Events**
- Successful file uploads
- Large file warnings
- Storage quota approaching

---

## 🛠️ Implementation Details

### **File Storage Structure**
```
supabase-storage/business-files/
├── business-uuid-1/
│   ├── invoices/
│   ├── contracts/
│   └── profiles/
└── business-uuid-2/
    ├── photos/
    └── documents/
```

### **Notification Types**
```typescript
type NotificationType = 
  | 'appointment_confirmed'
  | 'appointment_cancelled' 
  | 'appointment_completed'
  | 'review_submitted'
  | 'review_response'
  | 'team_invitation'
  | 'file_uploaded'
  | 'payment_received'
  | 'system_alert'
  | 'general';
```

### **Priority Levels**
- **Low**: File uploads, general announcements
- **Normal**: Appointment confirmages, reviews, team events
- **High**: Appointment cancellations, negative reviews
- **Urgent**: System alerts, security issues

---

This comprehensive file upload and notification system provides **secure file handling** with **Supabase Storage** and **real-time notification management** with automatic database triggers for business events, exactly as requested. The system ensures **business isolation** while providing **extensive file organization** and **notification tracking** capabilities.
