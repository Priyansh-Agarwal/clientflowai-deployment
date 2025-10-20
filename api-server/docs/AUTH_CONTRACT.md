# ClientFlow AI Suite - Authentication Contract

## Overview

The ClientFlow AI Suite API uses a **multi-tenant, organization-based authentication system** with JWT tokens for secure access. This document outlines the complete authentication and authorization model.

## Authentication Methods

### 1. Organization ID Authentication (Primary)

**Required for all API requests**

- **Header**: `x-org-id: <organization-id>`
- **Query Parameter**: `?orgId=<organization-id>`
- **Priority**: Header takes precedence over query parameter

```bash
# Using header (recommended)
curl -H "x-org-id: org-123" https://api.clientflow.ai/api/customers

# Using query parameter
curl "https://api.clientflow.ai/api/customers?orgId=org-123"
```

### 2. JWT Token Authentication (For n8n and External Services)

**For programmatic access and webhook authentication**

- **Header**: `Authorization: Bearer <jwt-token>`
- **Scope**: Limited to specific organization and operations
- **Expiration**: 1 hour (configurable)

```bash
# Using JWT token
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://api.clientflow.ai/api/automations/run
```

## JWT Token Management

### Token Generation

**Endpoint**: `POST /auth/token`

**Request Body**:
```json
{
  "organization_id": "org-123",
  "service_name": "n8n-workflow",
  "permissions": ["automations:run", "messages:send"],
  "expires_in": 3600
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2024-01-01T01:00:00.000Z",
  "organization_id": "org-123",
  "permissions": ["automations:run", "messages:send"]
}
```

### Token Validation

**Endpoint**: `GET /auth/validate`

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "valid": true,
  "organization_id": "org-123",
  "permissions": ["automations:run", "messages:send"],
  "expires_at": "2024-01-01T01:00:00.000Z"
}
```

### Token Revocation

**Endpoint**: `POST /auth/revoke`

**Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Permission System

### Available Permissions

| Permission | Description | Endpoints |
|------------|-------------|-----------|
| `customers:read` | Read customer data | `GET /api/customers` |
| `customers:write` | Create/update customers | `POST /api/customers` |
| `businesses:read` | Read business data | `GET /api/businesses` |
| `messages:send` | Send outbound messages | `POST /api/messages/outbound` |
| `automations:run` | Trigger automations | `POST /api/automations/run` |
| `appointments:read` | Read appointments | `GET /api/appointments` |
| `sla:read` | Read SLA violations | `GET /api/sla/unanswered` |

### Role-Based Access

| Role | Permissions |
|------|-------------|
| `viewer` | `customers:read`, `businesses:read`, `appointments:read` |
| `staff` | All viewer permissions + `customers:write`, `messages:send` |
| `admin` | All staff permissions + `automations:run`, `sla:read` |
| `owner` | All permissions |

## Security Features

### Rate Limiting

- **Per IP**: 100 requests per 15 minutes
- **Per Organization**: 1000 requests per 15 minutes
- **Per Token**: 500 requests per 15 minutes

### Token Security

- **Algorithm**: HS256
- **Secret**: Rotated every 24 hours
- **Issuer**: `clientflow-ai-suite`
- **Audience**: `api.clientflow.ai`

### Request Validation

1. **Organization ID**: Must be valid UUID format
2. **JWT Token**: Must be valid and not expired
3. **Permissions**: Must have required permissions for endpoint
4. **Rate Limits**: Must not exceed rate limits

## Error Responses

### Missing Organization ID

```json
{
  "success": false,
  "error": "Missing organization ID",
  "message": "x-org-id header or orgId query parameter required",
  "code": "MISSING_ORG_ID"
}
```

### Invalid JWT Token

```json
{
  "success": false,
  "error": "Invalid token",
  "message": "JWT token is invalid or expired",
  "code": "INVALID_TOKEN"
}
```

### Insufficient Permissions

```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "Token does not have required permission: customers:write",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### Rate Limit Exceeded

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests for this organization",
  "retryAfter": 900,
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## Implementation Examples

### n8n Workflow Authentication

```javascript
// Get token for n8n workflow
const tokenResponse = await fetch('https://api.clientflow.ai/auth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-org-id': 'org-123'
  },
  body: JSON.stringify({
    organization_id: 'org-123',
    service_name: 'n8n-workflow',
    permissions: ['automations:run', 'messages:send'],
    expires_in: 3600
  })
});

const { token } = await tokenResponse.json();

// Use token in subsequent requests
const automationResponse = await fetch('https://api.clientflow.ai/api/automations/run', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'customer_welcome',
    payload: { customer_id: 'customer-123' }
  })
});
```

### Frontend Authentication

```javascript
// Frontend uses organization ID directly
const customersResponse = await fetch('https://api.clientflow.ai/api/customers', {
  headers: {
    'x-org-id': currentUser.organizationId,
    'Content-Type': 'application/json'
  }
});
```

### Webhook Authentication

```javascript
// Webhooks can use either method
// Option 1: Organization ID
const webhookResponse = await fetch('https://api.clientflow.ai/api/automations/sms_inbound?orgId=org-123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(webhookData)
});

// Option 2: JWT Token
const webhookResponse = await fetch('https://api.clientflow.ai/api/automations/sms_inbound', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${webhookToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(webhookData)
});
```

## Migration Guide

### From Basic Auth to JWT

1. **Update API calls** to include organization ID
2. **Implement token management** for external services
3. **Update webhook configurations** with proper authentication
4. **Test all integrations** with new auth system

### Backward Compatibility

- **Organization ID**: Still required for all requests
- **JWT Tokens**: Optional for enhanced security
- **Legacy endpoints**: Continue to work with organization ID only

## Best Practices

### Token Management

1. **Store tokens securely** (environment variables, secure storage)
2. **Implement token refresh** before expiration
3. **Rotate tokens regularly** for security
4. **Monitor token usage** for anomalies

### Organization ID

1. **Use headers** instead of query parameters when possible
2. **Validate organization ID** on client side
3. **Implement organization switching** in UI
4. **Log organization access** for audit trails

### Security

1. **Use HTTPS** for all API calls
2. **Implement request signing** for critical operations
3. **Monitor for suspicious activity**
4. **Regular security audits**

## Support

For authentication issues or questions:

- **Documentation**: https://docs.clientflow.ai/auth
- **Support**: hello@clientflow.ai
- **Status Page**: https://status.clientflow.ai
