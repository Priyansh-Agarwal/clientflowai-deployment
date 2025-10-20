# Appointment Management API

Complete REST API for managing appointments with SMS notifications built with Express.js, TypeScript, Supabase, and Twilio integration.

## 🎯 Features

- **Comprehensive CRUD Operations**: Create, read, update, and cancel appointments
- **SMS Notifications**: Automated Twilio SMS notifications for status changes
- **Conflict Detection**: Prevents double-booking with conflict checking
- **Business Hours Validation**: Ensures appointments are within business hours
- **Authentication & Row Level Security**: JWT auth with multi-tenant data isolation
- **Advanced Filtering**: Search by customer, service, date range, and status
- **Pagination Support**: Efficient handling of large appointment lists
- **Payment Integration**: Track payment status and methods

---

## 📋 Appointment Endpoints

### Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🚀 Appointment Operations

### **1. Create Appointment**
```http
POST /api/appointments
Content-Type: application/json
Authorization: Bearer <token>

{
  "customer_id": "uuid-of-existing-customer", // Optional
  "customer_name": "John Doe",               // Required
  "customer_phone": "+1234567890",          // Required
  "customer_email": "john@example.com",     // Optional
  "customer_notes": "Prefers morning appointments",
  "service_id": "uuid-of-service",          // Optional
  "service_name": "Haircut",               // Required
  "scheduled_at": "2024-01-15T10:00:00Z",  // Required
  "duration": 60,                          // Optional, default 60 minutes
  "total_price": 50.00,                    // Optional
  "payment_method": "card",                // Optional
  "notes": "First-time customer",
  "internal_notes": "Staff notes",
  "metadata": {
    "source": "website",
    "preferences": {
      "reminder_sms": true,
      "reminder_email": true,
      "confirmation_sms": true,
      "language": "en",
      "timezone": "America/New_York"
    }
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "id": "appointment-uuid",
    "business_id": "business-uuid",
    "customer_id": "customer-uuid",
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "service_name": "Haircut",
    "scheduled_at": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z",
    "duration": 60,
    "status": "pending",
    "total_price": 50.00,
    "payment_status": null,
    "created_at": "2024-01-01T...",
    "updated_at": "2024-01-01T..."
  }
}
```

### **2. Get Appointments (With Filtering)**
```http
GET /api/appointments?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z&status=confirmed&customer_search=John&page=1&limit=20&sort_by=scheduled_at&sort_order=asc
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date` - Filter appointments from this date
- `end_date` - Filter appointments until this date  
- `status` - Filter by status (pending, confirmed, completed, cancelled, no_show)
- `customer_id` - Filter by specific customer
- `customer_search` - Search in customer name or phone
- `service_id` - Filter by service
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort_by` - Sort field (scheduled_at, created_at, customer_name, service_name, status)
- `sort_order` - asc or desc (default: asc)
- `payment_status` - Filter by payment status
- `include_cancelled` - Include cancelled appointments (default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "appointment-uuid",
        "business_id": "business-uuid",
        "customer_name": "John Doe",
        "service_name": "Haircut",
        "scheduled_at": "2024-01-15T10:00:00Z",
        "status": "confirmed",
        "duration": 60,
        "total_price": 50.00
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

### **3. Get Single Appointment**
```http
GET /api/appointments/{appointment-id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "appointment-uuid",
    "business_id": "business-uuid",
    "customer_id": "customer-uuid",
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "service_name": "Haircut",
    "scheduled_at": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z",
    "duration": 60,
    "status": "confirmed",
    "total_price": 50.00,
    "payment_status": "paid",
    "notes": "First-time customer",
    "created_at": "2024-01-01T...",
    "updated_at": "2024-01-01T..."
  }
}
```

### **4. Update Appointment**
```http
PUT /api/appointments/{appointment-id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "customer_name": "Jane Doe",
  "scheduled_at": "2024-01-15T14:00:00Z",
  "duration": 90,
  "service_name": "Haircut & Color",
  "total_price": 120.00,
  "notes": "Updated appointment details"
}
```

**Notes:**
- If `scheduled_at` or `duration` changes, SMS rescheduled notification is sent
- Conflict checking ensures no double-booking
- End time is automatically recalculated

### **5. Update Appointment Status (With SMS Notifications)**
```http
PUT /api/appointments/{appointment-id}/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "confirmed",
  "cancellation_reason": null,
  "notes": "Status updated"
}
```

**Status Options:**
- `pending` - Initial status when appointment is created
- `confirmed` - Appointment confirmed (sends confirmation SMS)
- `completed` - Appointment completed
- `cancelled` - Appointment cancelled (sends cancellation SMS)
- `no_show` - Customer didn't show up

**Special Field:**
- `cancellation_reason` - Required when status = 'cancelled'
- `cancellation_fee` - Optional fee charged for cancellation

---

## 📱 SMS Notifications

### **Automatic SMS Triggers:**

1. **Appointment Confirmation** (`status: confirmed`)
   - Sent when appointment is confirmed
   - Includes date, time, service, and duration

2. **Reschedule Notification** (PUT with new `scheduled_at`)
   - Sent when appointment time is changed
   - Shows old and new appointment details

3. **Cancellation Notification** (`status: cancelled`)
   - Sent when appointment is cancelled
   - Includes cancellation reason if provided

### **SMS Configuration**
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

### **SMS Example Messages:**

**Confirmation:**
```
Your appointment has been confirmed!

📅 January 15, 2024 at 10:00 AM
📍 Haircut
💰 Duration: 60 minutes

Reply STOP to unsubscribe.
```

**Reschedule:**
```
Your appointment has been rescheduled.

📅 New time: January 15, 2024 at 2:00 PM
📍 Service: Haircut

Please reply if you need to make changes.
```

**Cancellation:**
```
Your appointment scheduled for January 15, 2024 at 10:00 AM has been cancelled.

Reason: Emergency closure

Please call us to reschedule. We're sorry for any inconvenience.
```

---

## 🔒 Security & Validation

### **Validations:**
- UUID format validation for appointment IDs
- Future date validation for scheduled appointments
- Business hours validation (configurable)
- Duplicate appointment prevention
- Phone number format validation
- Email format validation

### **Business Logic:**
- Duration: 15-480 minutes (15 min - 8 hours)
- Prices: $0 - $10,000
- Status transitions are validated
- Automatic end time calculation
- Business ID filtering (RLS)

### **Error Responses:**

**Conflict (409):**
```json
{
  "error": "Conflict",
  "message": "Another appointment is already scheduled at this time"
}
```

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "details": {
    "customer_name": ["Customer name is required"],
    "scheduled_at": ["Appointment must be scheduled for a future time"]
  }
}
```

**Not Found (404):**
```json
{
  "error": "Not found",
  "message": "Appointment not found"
}
```

---

## 🧪 Example Usage

### **Complete Appointment Lifecycle:**

1. **Create Appointment**
```javascript
const createResponse = await fetch('/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    customer_name: 'John Doe',
    customer_phone: '+1234567890',
    service_name: 'Haircut',
    scheduled_at: '2024-01-15T10:00:00Z',
    duration: 60,
    total_price: 50.00
  })
});

const appointment = await createResponse.json();
console.log('Created:', appointment.data);
```

2. **Update Status to Confirmed**
```javascript
const statusResponse = await fetch(`/api/appointments/${appointmentId}/status`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    status: 'confirmed'
  })
});
// This triggers SMS confirmation notification
```

3. **Reschedule Appointment**
```javascript
const rescheduleResponse = await fetch(`/api/appointments/${appointmentId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    scheduled_at: '2024-01-15T14:00:00Z'
  })
});
// This triggers SMS reschedule notification
```

4. **Cancel Appointment**
```javascript
const cancelResponse = await fetch(`/api/appointments/${appointmentId}/status`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    status: 'cancelled',
    cancellation_reason: 'Customer request'
  })
});
// This triggers SMS cancellation notification
```

### **Advanced Filtering Examples:**

```javascript
// Get today's confirmed appointments
const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
const todayEnd = new Date().toISOString().split('T')[0] + 'T23:59:59Z';

const filtered = await fetch(`/api/appointments?start_date=${todayStart}&end_date=${todayEnd}&status=confirmed`, {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// Search for appointments by customer name
const searchQuery = 'John';
const searchResults = await fetch(`/api/appointments?customer_search=${searchQuery}`, {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// Get cancelled appointments with reasons
const cancelled = await fetch('/api/appointments?status=cancelled&include_cancelled=true', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});
```

---

## 🔧 Business Logic

### **Appointment Status Flow:**
```
pending → [confirmed, cancelled]
confirmed → [completed, cancelled] 
completed → (final state)
cancelled → [confirmed] (rebooking)
no_show → (final state)
```

### **Automatic Calculations:**
- **End Time**: `scheduled_at + duration`
- **Status Updates**: Automatic field updates based on status
- **Conflict Detection**: Prevents overlapping appointments
- **SMS Triggers**: Based on status changes and schedule updates

### **Data Relationships:**
- **Customer Link**: Links to customers table via `customer_id`
- **Business Isolation**: All appointments filtered by `business_id`
- **Service Catalog**: Links to services table via `service_id`

---

This appointment API provides comprehensive management capabilities with automated SMS notifications, ensuring excellent customer communication and appointment tracking for your business.
