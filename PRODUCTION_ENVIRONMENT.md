# ClientFlow AI Suite - Production Environment Variables
# Complete CRM with AI-powered business automation

# Application Configuration
NODE_ENV=production
PORT=3000
API_URL=https://your-api-domain.com
WEBHOOK_URL=https://your-api-domain.com/webhooks
FRONTEND_URL=https://your-frontend-domain.com

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key-here

# AI Integration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Communication Services
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-whatsapp-verify-token

# Email Service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Payment Processing
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Automation Engine (n8n)
N8N_API_KEY=your-n8n-api-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_USER=admin
N8N_PASSWORD=your-secure-n8n-password

# Redis Cache
REDIS_URL=redis://your-redis-instance:6379
REDIS_PASSWORD=your-redis-password

# File Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket

# Monitoring & Analytics
SENTRY_DSN=your-sentry-dsn
POSTHOG_API_KEY=your-posthog-api-key
POSTHOG_HOST=https://app.posthog.com

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com,https://your-admin-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# File Upload Limits
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Timezone
TIMEZONE=America/New_York

# External Integrations
GOOGLE_CALENDAR_CREDENTIALS=your-google-calendar-credentials
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret
HUBSPOT_API_KEY=your-hubspot-api-key
ZAPIER_WEBHOOK_URL=your-zapier-webhook-url

# Backup Configuration
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_SCHEDULE=0 2 * * *

# Feature Flags
ENABLE_AI_COPILOT=true
ENABLE_VOICE_AGENT=true
ENABLE_AUTOMATION=true
ENABLE_ANALYTICS=true
ENABLE_INTEGRATIONS=true
