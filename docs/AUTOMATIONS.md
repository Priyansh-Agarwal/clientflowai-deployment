# ClientFlow API Automation Endpoints

This document describes the automation API endpoints that integrate with n8n workflows for ClientFlow CRM.

## Base URL

All endpoints are prefixed with `/api/` and require organization context via `x-org-id` header or `orgId` query parameter.

## Authentication

Include the organization ID in requests:
- Header: `x-org-id: your-org-uuid`
- Query param: `?orgId=your-org-uuid`

## Endpoints

### Messages

#### POST /api/messages/outbound

Send outbound SMS or email messages.

**Request Body:**
```json
{
  "orgId": "00000000-0000-0000-0000-000000000000",
  "channel": "sms|email",
  "to_addr": "+15555550123",
  "body": "Your appointment is confirmed for tomorrow at 2 PM"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Sandbox Mode:**
If Twilio/SendGrid credentials are not configured, returns:
```json
{
  "sandbox": true,
  "note": "TWILIO_FROM not set"
}
```

**Example:**
```bash
curl -X POST "https://api.clientflow.ai/api/messages/outbound?orgId=00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "00000000-0000-0000-0000-000000000000",
    "channel": "sms",
    "to_addr": "+15555550123",
    "body": "Your appointment is confirmed"
  }'
```

### Automations

#### POST /api/automations/sms_inbound

Process inbound SMS messages (webhook endpoint for Twilio).

**Request Body:**
```json
{
  "From": "+15555550123",
  "To": "+15555551234",
  "Body": "I need to reschedule my appointment",
  "MessageSid": "SM1234567890abcdef"
}
```

**Response:**
```json
{
  "ok": true
}
```

#### POST /api/automations/email_inbound

Process inbound email messages (webhook endpoint for SendGrid).

**Request Body:**
```json
{
  "from": "customer@example.com",
  "to": "appointments@clientflow.ai",
  "subject": "Reschedule Request",
  "text": "I need to reschedule my appointment"
}
```

**Response:**
```json
{
  "ok": true
}
```

#### POST /api/automations/run

Trigger automation workflows programmatically.

**Request Body:**
```json
{
  "type": "reminder|nurture|dunning|booking|review|sla",
  "orgId": "00000000-0000-0000-0000-000000000000",
  "payload": {
    "contact_id": "contact_123",
    "appointment_id": "appt_456"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "queued": "reminder"
}
```

**Example:**
```bash
curl -X POST "https://api.clientflow.ai/api/automations/run?orgId=00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "reminder",
    "orgId": "00000000-0000-0000-0000-000000000000",
    "payload": {
      "appointment_id": "appt_123",
      "reminder_type": "24h"
    }
  }'
```

### Appointments

#### GET /api/appointments

Retrieve appointments for automation workflows.

**Query Parameters:**
- `window`: `next_24h` - Get appointments in next 24 hours
- `status`: `completed` - Get completed appointments
- `within`: `1d` - Time window for completed appointments

**Examples:**

Get appointments in next 24 hours:
```bash
curl "https://api.clientflow.ai/api/appointments?orgId=00000000-0000-0000-0000-000000000000&window=next_24h"
```

Get completed appointments in last day:
```bash
curl "https://api.clientflow.ai/api/appointments?orgId=00000000-0000-0000-0000-000000000000&status=completed&within=1d"
```

**Response:**
```json
{
  "data": [
    {
      "id": "appt1",
      "starts_at": "2024-01-15T14:00:00Z",
      "reminder_offset_minutes": 60,
      "contact": {
        "phone": "+15555550123"
      }
    }
  ]
}
```

### SLA Monitoring

#### GET /api/sla/unanswered

Get conversations that have exceeded SLA response time.

**Query Parameters:**
- `minutes`: Number of minutes to consider as SLA violation (default: 5)

**Example:**
```bash
curl "https://api.clientflow.ai/api/sla/unanswered?orgId=00000000-0000-0000-0000-000000000000&minutes=5"
```

**Response:**
```json
{
  "data": [
    {
      "id": "conv_123",
      "waiting_minutes": 6,
      "on_call_phone": "+15555550100"
    }
  ]
}
```

## Health & Readiness

### GET /api/health

Basic health check endpoint.

**Response:**
```json
{
  "ok": true,
  "service": "api",
  "time": "2024-01-15T10:30:00Z"
}
```

### GET /api/ready

Readiness check that verifies Redis connectivity.

**Response (Ready):**
```json
{
  "ok": true
}
```

**Response (Not Ready):**
```json
{
  "ok": false
}
```

## Error Handling

All endpoints return standardized error responses:

**Validation Error (400):**
```json
{
  "type": "about:blank",
  "title": "Validation Error",
  "detail": "Invalid request body",
  "status": 400
}
```

**Authentication Error (401):**
```json
{
  "error": "Missing org"
}
```

**Service Unavailable (503):**
```json
{
  "ok": false
}
```

## Rate Limiting

- Default rate limit: 100 requests per minute per organization
- Burst allowance: 200 requests per minute
- Headers included in responses:
  - `X-RateLimit-Limit`: Request limit per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

## Webhook Security

For webhook endpoints, verify signatures when possible:

- **Twilio**: Verify using `TWILIO_SIGNING_SECRET`
- **Stripe**: Verify using `STRIPE_WEBHOOK_SECRET`
- **SendGrid**: Verify using SendGrid's signature validation

## Testing

Use the provided smoke test to verify all endpoints:

```bash
# Install dependencies
pnpm install

# Run smoke test
pnpm run smoke
```

This will test:
- Health endpoint
- Outbound messaging (sandbox mode)
- All automation endpoints

## Environment Variables

Required environment variables for full functionality:

```bash
# API Configuration
NODE_ENV=production
PORT=4000
API_BASE_URL=https://api.clientflow.ai/api

# Database & Cache
DATABASE_URL=postgres://user:pass@localhost:5432/clientflow
REDIS_URL=redis://localhost:6379

# Communication Providers
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM=+15555551234
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM=noreply@clientflow.ai

# Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AI Services
OPENAI_API_KEY=sk-your_openai_key

# Monitoring
SENTRY_DSN=https://your_sentry_dsn
POSTHOG_KEY=your_posthog_key
```

## Support

For technical support or questions about these endpoints:
- Check API logs for detailed error information
- Verify environment variables are correctly set
- Test endpoints using the smoke test script
- Contact ClientFlow support team