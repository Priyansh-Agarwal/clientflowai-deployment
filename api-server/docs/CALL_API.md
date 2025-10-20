# Call Management API

Complete REST API for managing voice calls with Supabase Storage integration, Twilio webhook handling, and comprehensive call analytics. Features audio file upload verification, call logging, transcript management, and real-time webhook processing.

## 🎯 Features

- **Call Logging**: Create and manage call records with comprehensive metadata
- **Recording Management**: Upload and store call recordings in Supabase Storage with verification
- **Twilio Integration**: Webhook handlers for automated call status updates and recording processing
- **Transcript Management**: Store and update call transcripts with speaker segmentation
- **Call Analytics**: Statistics and reporting for call performance and quality metrics
- **Phone Number Validation**: Automatic formatting and validation of phone numbers
- **Business Isolation**: Row Level Security ensures data privacy between businesses
- **File Security**: Twilio signature verification for upload authenticity
- **Audio Processing**: Automatic metadata extraction from audio files

---

## 📋 Call Management Endpoints

### Authentication
All endpoints require a Bearer token except for Twilio webhooks:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🚀 Core Call Operations

### **1. Create Call Record**
```http
POST /api/calls
Content-Type: application/json
Authorization: Bearer <token>

{
  "customer_id": "uuid-of-existing-customer", // Optional
  "caller_phone": "+15551234567",             // Optional
  "caller_name": "John Doe",                  // Optional
  "twilio_call_sid": "CA1234567890abcdef...", // Optional (Twilio Call SID)
  "twilio_account_sid": "AG1234567890abcdef...", // Optional (Twilio Account SID)
  "phone_number": "+15559876543",             // Required (business phone)
  "direction": "inbound",                     // Required (inbound/outbound)
  "status": "completed",                      // Required (initiated, ringing, answered, completed, etc.)
  "started_at": "2024-01-15T10:00:00Z",       // Required
  "ended_at": "2024-01-15T10:05:30Z",        // Optional
  "duration": 330,                            // Optional (seconds)
  "outcome": "completed",                     // Optional (completed, missed, voicemail, busy, etc.)
  "quality": {                                // Optional
    "jitter": 0.05,
    "packet_loss": 0.001,
    "mos_score": 4.2,
    "rtt": 45,
    "codec": "OPUS",
    "network_info": {
      "network_type": "wifi",
      "carrier": "Verizon",
      "signal_strength": -65
    }
  },
  "transcript": {                             // Optional
    "segments": [
      {
        "speaker": "customer",
        "start_time": 0,
        "end_time": 5,
        "text": "Hello, I need help with my account",
        "confidence": 0.95
      },
      {
        "speaker": "agent",
        "start_time": 5,
        "end_time": 8,
        "text": "Hi! How can I help you today?",
        "confidence": 0.98
      }
    ],
    "duration": 330,
    "language": "en",
    "provider": "assembly-ai"
  },
  "metadata": {                               // Optional
    "tags": ["support", "technicals"],
    "notes": "Customer called about billing issue",
    "campaign": "q1-2024-support",
    "source": "phone",
    "custom": {
      "department": "support",
      "priority": "high"
    }
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Call created successfully",
  "data": {
    "id": "call-uuid",
    "business_id": "business-uuid",
    "customer_id": "customer-uuid",
    "caller_phone": "+15551234567",
    "caller_name": "John Doe",
    "twilio_call_sid": "CA1234567890abcdef...",
    "phone_number": "+15559876543",
    "direction": "inbound",
    "status": "completed",
    "started_at": "2024-01-15T10:00:00Z",
    "ended_at": "2024-01-15T10:05:30Z",
    "duration": 330,
    "outcome": "completed",
    "recording_url": null,
    "created_at": "2024-01-15T10:06:00Z",
    "updated_at": "2024-01-15T10:06:00Z"
  }
}
```

### **2. Update Call Record**
```http
PUT /api/calls/{call-id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "duration": 360,
  "outcome": "completed",
  "status": "completed",
  "transcript": {
    "segments": [
      // Updated transcript segments
    ],
    "duration": 360,
    "language": "en"
  },
  "metadata": {
    "notes": "Updated transcript with agent response",
    "transcription_status": "completed"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Call updated successfully",
  "data": {
    // Updated call object
  }
}
```

### **3. Upload Call Recording**
```http
POST /api/calls/{call-id}/recording
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- recording: [audio file] (required)
- call_sid: "CA1234567890abcdef..." (required for Twilio verification)
- account_sid: "AG1234567890abcdef..." (required for Twilio verification)
- duration: "330" (optional, seconds)
- channels: "1" (optional, 1=mono, 2=stereo)
- sample_rate: "8000" (optional)
- audio_format: "audio/wav" (optional)
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Recording uploaded successfully",
  "data": {
    "call_id": "call-uuid",
    "recording_url": "https://supabase-url/storage/v1/object/public/call-recordings/business-uuid/calls/call_uuid_timestamp.wav",
    "recording_path": "business-uuid/calls/call_uuid_timestamp.wav",
    "file_metadata": {
      "duration": 330,
      "channels": 1,
      "sample_rate": 8000,
      "bit_rate": 64000
    }
  }
}
```

### **4. Get Call Details**
```http
GET /api/calls/{call-id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "call-uuid",
    "business_id": "business-uuid",
    "customer_id": "customer-uuid-uuid",
    "caller_phone": "+15551234567",
    "caller_name": "John Doe",
    "phone_number": "+15559876543",
    "direction": "inbound",
    "status": "completed",
    "started_at": "2024-01-15T10:00:00Z",
    "ended_at": "2024-01-15T10:05:30Z",
    "duration": 330,
    "outcome": "completed",
    "recording_url": "https://...",
    "transcript": {
      "segments": [...]
    },
    "quality": {...},
    "created_at": "2024-01-15T10:06:00Z",
    "updated_at": "2024-01-15T10:06:00Z"
  }
}
```

---

## 🔍 Advanced Call Operations

### **5. Get Calls with Filtering**
```http
GET /api/calls?customer_id=customer-uuid&direction=inbound&status=completed&outcome=completed&start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z&min_duration=60&max_duration=600&has_recording=true&search=555&page=1&limit=20&sort_by=started_at&sort_order=desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `customer_id` - Filter by specific customer
- `direction` - Filter by direction (inbound, outbound)
- `status` - Filter by status (initiated, ringing, answered, completed, failed, etc.)
- `outcome` - Filter by outcome (completed, missed, voicemail, busy, etc.)
- `twilio_call_sid` - Filter by Twilio Call SID
- `start_date` / `end_date` - Date range filtering
- `min_duration` / `max_duration` - Duration filtering (seconds)
- `search` - Search in phone numbers or caller names
- `has_recording` - Filter calls with/without recordings
- `has_transcript` - Filter calls with/without transcripts
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort_by` - Sort field (started_at, duration, created_at)
- `sort_order` - asc or desc (default: desc)
- `tags` - Comma-separated tags to filter by

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "call-uuid",
        "customer_id": "customer-uuid",
        "caller_phone": "+15551234567",
        "phone_number": "+15559876543",
        "direction": "inbound",
        "status": "completed",
        "duration": 330,
        "recording_url": "https://...",
        "has_transcript": true
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

### **6. Update Call Transcript**
```http
PUT /api/calls/{call-id}/transcript
Content-Type: application/json
Authorization: Bearer <token>

{
  "transcript": {
    "segments": [
      {
        "speaker": "customer",
        "start_time": 0,
        "end_time": 3.5,
        "text": "Hello, I'm calling about my recent bill",
        "confidence": 0.95
      },
      {
        "speaker": "agent",
        "start_time": 3.5,
        "end_time": 7.2,
        "text": "Good morning! I can help you with that. What seems to be the issue?",
        "confidence": 0.98
      }
    ],
    "duration": 330,
    "language": "en",
    "provider": "assembly-ai"
  },
  "transcription_url": "https://ai-provider.com/transcripts/uuid"
}
```

### **7. Get Call Recording**
```http
GET /api/calls/{call-id}/recording
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "call_id": "call-uuid",
    "has_recording": true,
    "recording_url": "https://...",
    "duration": 330,
    "uploaded_at": "2024-01-15T10:06:00Z"
  }
}
```

### **8. Get Call Statistics**
```http
GET /api/calls/stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalCalls": 1247,
    "answeredCalls": 986,
    "missedCalls": 198,
    "totalDuration": 156789, // seconds
    "averageDuration": 159.2, // seconds
    "callOutcomeBreakdown": {
      "completed": 986,
      "missed": 142,
      "busy": 56,
      "voicemail": 35,
      "failed": 28
    },
    "callsByDirection": {
      "inbound": 856,
      "outbound": 391
    },
    "callsByStatus": {
      "completed<｜tool▁calls▁end｜> 986,
      "ringing": 45,
      "initiated": 23,
      "failed": 28
    }
  }
}
```

---

## 🌐 Twilio Integration

### **Twilio Webhook Handlers**

The API includes two Twilio webhook endpoints for automated call processing:

#### **Call Status Webhook**
```http
POST /api/calls/webhook/twilio
Content-Type: application/x-www-form-urlencoded
X-Twilio-Signature: [Twilio signature]

Form Data:
CallSid=CA1234567890abcdef...
AccountSid=AG1234567890abcdef...
From=+15551234567
To=+15559876543
CallStatus=completed
Direction=inbound
Duration=330
StartTime=2024-01-15T10:00:00Z
EndTime=2024-01-15T10:05:30Z
business_id=your-business-uuid
```

#### **Recording Webhook**
```http
POST /api/calls/webhook/twilio/recording
Content-Type: application/x-www-form-urlencoded
X-Twilio-Signature: [Twilio signature]

Form Data:
CallSid=CA1234567890abcdef...
RecordingSid=RE1234567890abcdef...
RecordingUrl=https://api.twilio.com/2010-04-01/Accounts/.../Recordings/...
RecordingDuration=330
RecordingFormat=wav
business_id=your-business-uuid
```

### **Webhook Security**

Twilio webhooks are secured with signature verification:

1. **Signature Verification**: The `X-Twilio-Signature` header is verified against Twilio's auth token
2. **URL Validation**: Checks that the webhook comes from Twilio's verified domains
3. **Payload Integrity**: Ensures the webhook payload hasn't been tampered with

**Format:** HMAC-SHA1 signature of the full URL + POST body using the Twilio auth token.

---

## 🔒 Security Features

### **File Upload Security**
- **Twilio Verification**: Recording uploads are verified against Twilio Call SID and Account SID
- **File Type Validation**: Only audio files (WAV, MP3, OGG, WebM, FLAC) are allowed
- **Size Limits**: Maximum 100MB per recording file
- **Virus Scanning**: Optional integration with virus scanning services
- **Signed URLs**: Temporary signed URLs for private file access

### **Business Isolation**
- **Row Level Security**: All call operations filtered by authenticated user's `business_id`
- **File Access Control**: Recording access restricted to business that owns the call
- **Metadata Privacy**: Call metadata isolated by business boundaries
- **No Cross-Tenant Access**: Complete data isolation prevents data leakage

### **Data Protection**
- **Phone Number Formatting**: Automatic validation and standardization
- **Metadata Sanitization**: Input sanitization for all text fields
- **Error Information**: Detailed error messages without sensitive data exposure
- **Logging**: Audit trails for all call operations

---

## 📱 Usage Examples

### **Complete Call Lifecycle:**

```javascript
// 1. Create call record
const createResponse = await fetch('/api/calls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    customer_id: 'existing-customer-uuid',
    caller_phone: '+15551234567',
    caller_name: 'John Doe',
    phone_number: '+15559876543',
    direction: 'inbound',
    status: 'completed',
    started_at: '2024-01-15T10:00:00Z',
    ended_at: '2024-01-15T10:05:30Z',
    duration: 330,
    outcome: 'completed'
  })
});

const call = await createResponse.json();
console.log('Call created:', call.data);
const callId = call.data.id;

// 2. Upload recording file
const formData = new FormData();
formData.append('recording', audioFile); // File from input
formData.append('call_sid', 'CA1234567890abcdef...');
formData.append('account_sid', 'AG1234567890abcdef...');
formData.append('duration', '330');

const uploadResponse = await fetch(`/api/calls/${callId}/recording`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer your-jwt-token' },
  body: formData
});

const uploadResult = await uploadResponse.json();
console.log('Recording uploaded:', uploadResult.data);

// 3. Update call with transcript
const transcriptResponse = await fetch(`/api/calls/${callId}/transcript`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    transcript: {
      segments: [
        {
          speaker: 'customer',
          start_time: 0,
          end_time: 3.5,
          text: 'Hello, I need help with my billing',
          confidence: 0.95
        },
        {
          speaker: 'agent',
          start_time: 3.5,
          end_time: 7.2,
          text: 'Good morning! How can I help you?',
          confidence: 0.98
        }
      ],
      duration: 330,
      language: 'en',
      provider: 'assembly-ai'
    }
  })
});

// 4. Get call details with recording and transcript
const callDetails = await fetch(`/api/calls/${callId}`, {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

const details = await callDetails.json();
console.log('Complete call details:', details.data);
```

### **Advanced Filtering:**

```javascript
// Get inbound calls from last month with recordings
const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const filteredCalls = await fetch(`/api/calls?direction=inbound&start_date=${lastMonth}&has_recording=true&limit=50`, {
  headers: { 'Authorization': 'Authorization: Bearer your-jwt-token' }
});

// Search calls by phone number
const phoneSearch = await fetch('/api/calls?search=555123&page=1&limit:20', {
  headers: { 'Authorization': 'Authorization: Bearer your-jwt-token' }
});

// Get busy calls from today
const today = new Date().toISOString().split('T')[0];
const busyCallsToday = await fetch(`/api/calls?outcome=busy&start_date=${today}T00:00:00Z&end_date=${today}T23:59:59Z`, {
  headers: { 'Authorization': 'Authorization: Bearer your-jwt-token' }
});

// Get call statistics
const stats = await fetch('/api/calls/stats', {
  headers: { 'Authorization': 'Authorization: Bearer your-jwt-token' }
});

const callStats = await stats.json();
console.log('Call Analytics:', callStats.data);
```

### **Webhook Integration:**

```javascript
// Configure Twilio webhooks (Twilio Console)
// Call Status: https://your-domain.com/api/calls/webhook/twilio
// Recording URL: https://your-domain.com/api/calls/webhook/twilio/recording

// Set business context in Twilio webhook
const twilioWebhookData = {
  CallSid: 'CA1234567890abcdef...',
  AccountSid: 'AG1234567890abcdef...',
  From: '+15551234567',
  To: '+15559876543',
  CallStatus: 'completed',
  Duration: '330',
  business_id: 'your-business-id', // This allows the webhook to associate the call with your business
};

// The webhook will automatically:
// 1. Create or update call records based on Twilio data
// 2. Process recording URLs when available
// 3. Update call status in real-time
// 4. Maintain call metadata automatically
```

---

This comprehensive call API provides enterprise-level call management with automatic Twilio integration, secure file handling, and robust analytics capabilities perfect for customer support teams and call center operations.
