# Webhook Integration API

Comprehensive webhook endpoints for external integrations with signature verification, Supabase updates, and comprehensive audit logging for business-critical external service integrations.

## 🚀 **Features**

### **✅ Advanced Webhook Security**
- **Signature Verification**: HMAC-SHA1/256 signature verification for all external services
- **Replay Attack Protection**: Timestamp-based validation to prevent replay attacks
- **Rate Limiting**: Built-in rate limiting for webhook abuse prevention
- **IP Whitelisting**: Optional IP address filtering for service-specific access

### **✅ External Service Integration**
- **Twilio**: Call status updates (answered, completed, failed, busy, no-answer)
- **Google Calendar**: Real-time calendar event synchronization
- **SMS Providers**: Delivery status updates and message tracking
- **Review Platforms**: Google/Yelp/Facebook review ingestion

### **✅ Supabase Data Mapping**
- **Automatic Business ID Resolution**: Maps external data to internal business records
- **Real-time Updates**: Updates Supabase tables instantly from webhook events
- **Notification Triggers**: Automatic notification creation for significant events
- **Audit Trail**: Complete webhook processing logs with error tracking

---

## 🪝 **Webhook Endpoints**

---

### **1. Twilio Webhook Integration**

**POST /api/webhooks/twilio**

Receives call status updates from Twilio and updates call records in Supabase accordingly.

#### **Request Headers**
```http
X-Twilio-Signature: <hmac-sha1-signature>
Content-Type: application/x-www-form-urlencoded
```

#### **Signature Verification**
```javascript
// Twilio signature verification
const isValid = WebhookSignatureVerifier.verifyTwilioSignature(
  webhookPayload,
  signatureHeader,
  TWILIO_AUTH_TOKEN,
  webhookUrl
);
```

#### **Sample Twilio Webhook Payload**
```http
POST /api/webhooks/twilio
Content-Type: application/x-www-form-urlencoded
X-Twilio-Signature: RDNBOG3dEGtLZjbQEQGgY3SxP6E=

CallSid=CA1234567890abcdef&
CallStatus=completed&
CallDirection=inbound&
From=%2B1234567890&
To=%2B0987654321&
CallDuration=120&
RecordingUrl=https%3A//api.twilio.com/recording.mp3&
TranscriptionText=Hello%20this%20is%20a%20sample%20call&
AccountSid=ACxxxxx&
ApiVersion=2010-04-01
```

#### **Supabase Updates**
- **Calls Table**: Updates call status, duration, recording URL, transcript
- **Business Resolution**: Maps phone numbers to business accounts
- **Notifications**: Creates notifications for call completion/failures

#### **Response (200 OK)**
```json
{
  "success": true,
  "message": "Call record updated successfully",
  "callUpdated": true
}
```

#### **Supported Call Statuses**
- `ringing` → `ringing`
- `initiated` → `initiated`
- `answered` → `completed`
- `completed` → `completed`
- `busy` → `busy`
- `failed` → `failed`
- `no-answer` → `no_answer`

---

### **2. Google Calendar Integration**

**POST /api/webhooks/google-calendar**

Listens for calendar events from Google Calendar and synchronizes to appointment records in Supabase.

#### **Request Headers**
```http
X-Goog-Signature: <hmac-sha256-signature>
X-Goog-Timestamp: <unix-timestamp>
Content-Type: application/json
```

#### **Signature Verification**
```javascript
// Google Calendar webhook verification
const isValid = WebhookSignatureVerifier.verifyGoogleSignature(
  webhookPayload,
  signatureHeader,
  GOOGLE_CALENDAR_WEBHOOK_SECRET,
  timestampHeader
);
```

#### **Sample Google Calendar Webhook**
```http
POST /api/webhooks/google-calendar
Content-Type: application/json
X-Goog-Signature: d8xZv1kIhGv2PpS3Jx1lCxJzA8Y=
X-Goog-Timestamp: 1707234567

{
  "id": "event123@google.com",
  "summary": "Client Meeting with John Smith",
  "description": "Quarterly business review",
  "start": {
    "dateTime": "2024-02-15T14:00:00Z",
    "timeZone": "UTC"
  },
  "end": {
    "dateTime": "2024-02-15T15:00:00Z", 
    "timeZone": "UTC"
  },
  "attendees": [
    {
      "email": "john.smith@example.com",
      "displayName": "John Smith"
    }
  ],
  "status": "confirmed",
  "creator": {
    "email": "business@example.com",
    "displayName": "Business Owner"
  },
  "updated": "2024-02-14T16:30:00Z"
}
```

#### **Supabase Updates**
- **Appointments Table**: Creates/updates appointments from calendar events
- **Customer Extraction**: Extracts customer info from event attendees/organizer
- **Status Mapping**: Maps calendar status to appointment status
- **Sync Notifications**: Creates notifications for calendar synchronization

#### **Response (200 OK)**
```json
{
  "success": true,
  "message": "Calendar event synced to appointment successfully",
  "appointmentSynced": true
}
```

#### **Calendar Status Mapping**
- `confirmed` → `confirmed`
- `tentative` → `pending`
- `cancelled` → `cancelled`

---

### **3. SMS Provider Integration**

**POST /api/webhooks/sms-provider**

Receives delivery reports from SMS providers and updates message status in conversation messages.

#### **Request Headers**
```http
X-SMS-Signature: <custom-hmac-signature>
X-Signature: <alternative-signature-header>
Content-Type: application/json
```

#### **Signature Verification**
```javascript
// Custom SMS provider signature verification
const isValid = WebhookSignatureVerifier.verifyCustomSignature(
  webhookPayload,
  signatureHeader,
  SMS_PROVIDER_WEBHOOK_SECRET,
  'sha256'
);
```

#### **Sample SMS Provider Webhook**
```http
POST /api/webhooks/sms-provider
Content-Type: application/json
X-SMS-Signature: a1b2c3d4e5f6789012345678901234abcd

{
  "messageId": "msg_abc123def456",
  "status": "delivered",
  "deliveryStatus": "delivered",
  "timestamp": "2024-02-15T14:30:00Z",
  "phoneNumber": "+1234567890",
  "messageText": "Your appointment is confirmed for tomorrow",
  "supplierReference": "SMS-RW-789012",
  "cost": "0.025",
  "currency": "USD",
  "errorCode": null
}
```

#### **Supabase Updates**
- **Conversation Messages**: Updates delivery status, timestamps, error codes
- **Business Resolution**: Maps phone numbers to business conversations
- **Failure Notifications**: Creates alerts for delivery failures
- **Analytics**: Tracks SMS delivery success rates

#### **Response (200 OK)**
```json
{
  "success": true,
  "message": "Message status updated successfully",
  "messageUpdated": true
}
```

#### **SMS Status Mapping**
- `sent` → `sent`
- `delivered` → `delivered`
- `failed` → `failed`
- `rejected` → `failed`
- `expired` → `failed`
- `unknown` → `unknown`

---

### **4. Review Platform Integration**

**POST /api/webhooks/review-platforms**

Ingests new reviews from Google/Yelp/Facebook and inserts them into the reviews table with automatic notification triggers.

#### **Request Headers**
```http
X-Review-Signature: <platform-specific-hack-signature>
X-Signature: <alternative-signature-header>
Content-Type: application/json
```

#### **Signature Verification**
```javascript
// Review platform signature verification
const isValid = WebhookSignatureVerifier.verifyCustomSignature(
  webhookPayload,
  signatureHeader,
  REVIEW_PLATFORM_WEBHOOK_SECRET,
  'sha256'
);
```

#### **Sample Review Platform Webhook**
```http
POST /api/webhooks/review-platforms
Content-Type: application/json
X-Review-Signature: rev_google_signature_hash_123

{
  "reviewId": "rev_google_1234567890",
  "reviewerName": "Sarah Johnson",
  "reviewRating": 5,
  "reviewText": "Amazing service! The team was professional and friendly. Would definitely recommend to others.",
  "reviewDate": "2024-02-15T12:00:00Z",
  "platform": "google",
  "businessId": "business-uuid-123",
  "businessName": "Joe's Coffee Shop",
  "reviewUrl": "https://maps.google.com/review_1234567890",
  "reviewerProfileUrl": "https://plus.google.com/sarah.johnson",
  "verifiedPurchase": true,
  "language": "en",
  "sentiment": "positive"
}
```

#### **Supabase Updates**
- **Reviews Table**: Inserts new review with platform-specific metadata
- **Business Validation**: Verifies business ID exists and is valid
- **Notification Triggers**: Automatic notification creation via database triggers
- **Duplicate Prevention**: Prevents duplicate reviews from same platform/ID

#### **Response (201 Created)**
```json
{
  "success": true,
  "message": "Review created successfully",
  "reviewCreated": true
}
```

#### **Supported Review Platforms**
- `google` → Google Reviews via Google My Business API
- `yelp` → Yelp Reviews via Yelp Fusion API
- `facebook` → Facebook Reviews via Facebook Graph_API
- `tripadvisor` → TripAdvisor Reviews via TripAdvisor API
- `other` → Generic review platform integration

---

## 📊 **Webhook Management Endpoints**

---

### **Webhook Health Check**

**GET /api/webhooks/health**

Provides complete health status of webhook processing system.

#### **Request**
```http
GET /api/webhooks/health
```

#### **Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "system_status": "healthy",
    "webhooks_enabled": {
      "twilio": true,
      "google_calendar": true,
      "sms_provider": true,
      "review_platforms": true
    },
    "signature_verification": {
      "enabled": true,
      "algorithms_supported": ["sha1", "sha256"]
    },
    "database_connection": true,
    "last_checked": "2024-02-15T16:00:00Z",
    "version": "1.0.0"
  }
}
```

---

### **Webhook Configuration**

**GET /api/webhooks/config**

Returns webhook endpoint URLs and configuration for external service setup.

#### **Request**
```http
GET /api/webhooks/config
```

#### **Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "endpoints": {
      "twilio": {
        "url": "https://yourapi.com/api/webhooks/twilio",
        "method": "POST",
        "auth_type": "signature_verification",
        "required_headers": ["X-Twilio-Signature"],
        "signature_algorithm": "HMAC-SHA1"
      },
      "google_calendar": {
        "url": "https://yourapi.com/api/webhooks/google-calendar",
        "method": "POST", 
        "auth_type": "signature_verification",
        "required_headers": ["X-Goog-Signature", "X-Goog-Timestamp"],
        "signature_algorithm": "HMAC-SHA256"
      }
    },
    "health_check": "https://yourapi.com/api/webhooks/health",
    "version": "1.0.0"
  }
}
```

---

### **Webhook Statistics**

**GET /api/webhooks/stats**

Returns webhook processing statistics and analytics.

#### **Request**
```http
GET /api/webhooks/stats?timeframe=7d
```

#### **Query Parameters**
- `timeframe` (optional): Statistics period (`24h`, `7d`, `30d`, `90d`)

#### **Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "timeframe": "7d",
    "total_webhooks": 1247,
    "successful": 1198,
    "failed": 49,
    "success_rate": 96.07,
    "average_success_rate": 95.2,
    "by_source": {
      "twilio": {
        "total": 456,
        "successful": 447,
        "failed": 9,
        "success_rate": 98.03
      },
      "google_calendar": {
        "total": 234,
        "successful": 230,
        "failed": 4,
        "success_rate": 98.29
      }
    },
    "generated_at": "2024-02-15T16:00:00Z"
  }
}
```

---

### **Webhook Audit Logs**

**GET /api/webhooks/logs**

Retrieves webhook processing audit logs with filtering and pagination (admin access required).

#### **Request**
```http
GET /api/webhooks/logs?source=twilio&status=failed&page=1&limit=50
```

#### **Query Parameters**
- `source` (optional): Filter by webhook source
- `status` (optional): Filter by processing status (`pending`, `processing`, `completed`, `failed`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `start_date` (optional): Filter logs after this date (ISO format)
- `end_date` (optional): Filter logs before this date (ISO format)

#### **Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "webhook-uuid",
        "source": "twilio",
        "event_type": "call_status_update",
        "payload": {
          "CallSid": "CA1234567890",
          "CallStatus": "completed"
        },
        "signature": "X-Twilio-Signature: abc123...",
        "ip_address": "203.0.113.1",
        "user_agent": "TwilioProxy/1.1",
        "status": "completed",
        "processed_at": "2024-02-15T15:45:00Z",
        "retries": 0,
        "business_id": "business-uuid",
        "created_at": "2024-02-15T15:44:30Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 98,
      "per_page": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## 🔧 **Environment Configuration**

### **Required Environment Variables**
```bash
# Twilio Integration
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Google Calendar Integration  
GOOGLE_CALENDAR_WEBHOOK_SECRET=your_google_webhook_secret_here

# SMS Provider Integration
SMS_PROVIDER_WEBHOOK_SECRET=your_sms_provider_secret_here

# Review Platforms Integration
REVIEW_PLATFORM_WEBHOOK_SECRET=your_review_platform_secret_here

# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Supabase Database Setup**
Run the webhook logs migration:
```sql
-- Run migration: supabase/migrations/007_webhook_logs_table.sql
```

---

## 🛡️ **Security Implementation**

### **Signature Verification Process**
1. **Receive Webhook**: Capture raw payload and headers
2. **Validate Signature**: Verify HMAC signature against known secret
3. **Check Timestamp**: Prevent replay attacks with timestamp validation
4. **Rate Limiting**: Implement per-IP rate limiting for abuse prevention
5. **Audit Logging**: Log all webhook events for security monitoring

### **Business Data Mapping**
- **Phone Number Resolution**: Automatic business ID lookup by phone numbers
- **Email Extraction**: Extract customer emails from calendar attendees
- **Platform Mapping**: Map external IDs to internal Supabase records
- **Error Handling**: Graceful handling of invalid/malformed webhook data

### **Production Security Checklist**
- ✅ **Verify all signatures** before processing webhook data
- ✅ **Implement rate limiting** to prevent webhook abuse
- ✅ **Monitor webhook logs** for suspicious activity
- ✅ **Use HTTPS only** for all webhook endpoints
- ✅ **Regular secret rotation** for webhook signatures
- ✅ **IP whitelisting** for production webhook sources

---

This comprehensive webhook integration system provides **enterprise-level external service integration** with **signature verification**, **Supabase data mapping**, and **audit trail logging** for secure, reliable business-critical external integrations.

All webhook endpoints verify request signatures, map external events to internal IDs, and update Supabase accordingly as requested. The system handles authentication, business resolution, data validation, and comprehensive error logging while maintaining high performance and security standards.
