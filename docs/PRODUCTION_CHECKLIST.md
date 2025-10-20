# Production Deployment Checklist

This checklist ensures all services are properly configured and deployed for production use.

## 🔐 Environment Variables & Secrets

### API Service
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `REDIS_URL` - Redis connection string
- [ ] `JWT_SECRET` - Strong secret for JWT signing
- [ ] `SUPABASE_URL` - Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `SENTRY_DSN` - Sentry error tracking DSN
- [ ] `OPENAI_API_KEY` - OpenAI API key for AI features

### Stripe Integration
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (web)
- [ ] Stripe products and prices created in dashboard
- [ ] Webhook endpoint configured: `https://api.clientflow.ai/webhooks/stripe`
- [ ] Webhook events enabled: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.updated`

### Twilio Integration
- [ ] `TWILIO_ACCOUNT_SID` - Twilio account SID
- [ ] `TWILIO_AUTH_TOKEN` - Twilio auth token
- [ ] `TWILIO_PHONE_NUMBER` - Twilio phone number
- [ ] `TWILIO_WEBHOOK_URL` - Webhook URL for inbound messages
- [ ] Messaging service configured in Twilio console
- [ ] Inbound webhook URL set: `https://api.clientflow.ai/webhooks/twilio`

### SendGrid Integration
- [ ] `SENDGRID_API_KEY` - SendGrid API key
- [ ] `SENDGRID_FROM_EMAIL` - Verified sender email
- [ ] `SENDGRID_PUBLIC_KEY` - Webhook verification key
- [ ] Inbound Parse webhook configured: `https://api.clientflow.ai/webhooks/sendgrid-inbound`
- [ ] Domain authentication completed
- [ ] Sender authentication verified

### Google Calendar Integration
- [ ] `GOOGLE_SVC_ACCOUNT_JSON` - Base64 encoded service account JSON
- [ ] `GOOGLE_CLIENT_ID` - OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - OAuth client secret
- [ ] Service account created with Calendar API access
- [ ] Calendar watch channels configured for each organization
- [ ] Webhook URL set: `https://api.clientflow.ai/webhooks/gcal`

### Web Service
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL for client
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key for client
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics key
- [ ] `NEXT_PUBLIC_API_BASE_URL` - API base URL

### Worker Service
- [ ] `REDIS_URL` - Redis connection for job queues
- [ ] `OPENAI_API_KEY` - OpenAI API key for AI processing
- [ ] `SENTRY_DSN` - Sentry error tracking for worker

## 🚀 Deployment & Infrastructure

### Database
- [ ] PostgreSQL database provisioned (Supabase/Neon)
- [ ] Database migrations executed successfully
- [ ] Row Level Security (RLS) policies enabled
- [ ] Database backups configured
- [ ] Connection pooling configured

### Redis
- [ ] Redis instance provisioned (Upstash/Redis Cloud)
- [ ] Redis persistence enabled
- [ ] Memory limits configured
- [ ] Backup strategy implemented

### API Service
- [ ] API deployed to production (Render/Fly.io)
- [ ] Health check endpoint responding: `/health`
- [ ] Readiness check passing: `/ready`
- [ ] SSL certificate valid
- [ ] Custom domain configured
- [ ] Rate limiting configured
- [ ] CORS properly configured

### Web Service
- [ ] Web app deployed to Vercel
- [ ] Custom domain configured
- [ ] SSL certificate valid
- [ ] Environment variables set in Vercel
- [ ] Build successful
- [ ] Static assets optimized

### Worker Service
- [ ] Worker deployed to production
- [ ] Redis connection established
- [ ] Queue processors running
- [ ] Scheduled jobs configured
- [ ] Error handling and retries working

## 🔍 Monitoring & Observability

### Sentry
- [ ] Sentry project created
- [ ] DSN configured in all services
- [ ] Error alerts configured
- [ ] Performance monitoring enabled
- [ ] Release tracking configured

### Health Checks
- [ ] API health check monitoring: `GET /health`
- [ ] API readiness check monitoring: `GET /ready`
- [ ] Database connectivity monitoring
- [ ] Redis connectivity monitoring
- [ ] External service monitoring (Stripe, Twilio, SendGrid)

### Logging
- [ ] Structured logging configured (Pino)
- [ ] Log aggregation set up
- [ ] Log retention policy configured
- [ ] PII redaction enabled
- [ ] Log levels appropriate for production

## 🔄 CI/CD Pipeline

### GitHub Actions
- [ ] CI pipeline passing
- [ ] API auto-deploy on main branch
- [ ] Web auto-deploy on main branch
- [ ] Worker auto-deploy on main branch
- [ ] Database migrations run automatically
- [ ] Health checks run after deployment

### Security
- [ ] Secrets stored in GitHub Secrets
- [ ] No secrets in code
- [ ] Dependabot enabled
- [ ] Security scanning enabled
- [ ] CodeQL analysis passing

## 📊 Business Configuration

### Stripe Products
- [ ] Free plan product created
- [ ] Pro plan product created
- [ ] Scale plan product created
- [ ] Pricing configured correctly
- [ ] Webhook events tested
- [ ] Customer portal configured

### Organization Setup
- [ ] Default organization created
- [ ] Admin user created
- [ ] Subscription records created
- [ ] Usage limits configured
- [ ] Billing integration tested

## 🌐 Web Configuration

### Legal Pages
- [ ] Terms of Service page created and linked
- [ ] Privacy Policy page created and linked
- [ ] Data Processing Agreement (DPA) available
- [ ] Cookie policy implemented
- [ ] GDPR compliance measures in place

### SEO & Analytics
- [ ] Meta tags configured
- [ ] OpenGraph tags set
- [ ] Sitemap generated
- [ ] Robots.txt configured
- [ ] Google Analytics/PostHog tracking working
- [ ] Search console configured

## 🧪 Testing & Validation

### Smoke Tests
- [ ] API health check passes
- [ ] Contact creation works
- [ ] Deal management works
- [ ] Message sending works (sandbox mode)
- [ ] Authentication flow works
- [ ] Webhook endpoints respond

### Integration Tests
- [ ] Stripe webhook processing
- [ ] Twilio SMS sending/receiving
- [ ] SendGrid email sending/receiving
- [ ] Google Calendar sync
- [ ] Database operations
- [ ] Redis queue processing

### Performance Tests
- [ ] API response times < 200ms
- [ ] Database query performance
- [ ] Redis operation performance
- [ ] Web page load times < 3s
- [ ] Mobile responsiveness tested

## 📋 Documentation

### API Documentation
- [ ] OpenAPI spec generated
- [ ] Swagger UI accessible
- [ ] Postman collection exported
- [ ] API documentation up to date

### User Documentation
- [ ] User guide created
- [ ] FAQ section
- [ ] Support contact information
- [ ] Video tutorials (if applicable)

## 🔒 Security Checklist

### Authentication & Authorization
- [ ] JWT tokens properly signed
- [ ] Session management secure
- [ ] Password requirements enforced
- [ ] Multi-factor authentication available
- [ ] Role-based access control working

### Data Protection
- [ ] PII data encrypted at rest
- [ ] Data transmission encrypted (HTTPS)
- [ ] Database access restricted
- [ ] API rate limiting enabled
- [ ] Input validation and sanitization

### Infrastructure Security
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Security headers implemented
- [ ] Vulnerability scanning enabled
- [ ] Regular security updates

## ✅ Final Verification

### Pre-Launch
- [ ] All checklist items completed
- [ ] Smoke test script passes
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Legal review completed

### Post-Launch
- [ ] Monitoring alerts configured
- [ ] Backup verification
- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] Error rate monitoring

## 🆘 Rollback Plan

### Emergency Procedures
- [ ] Database rollback procedure documented
- [ ] Application rollback procedure documented
- [ ] DNS rollback procedure documented
- [ ] Emergency contact list prepared
- [ ] Incident response plan ready

---

## Quick Commands

### Run Smoke Test
```bash
pnpm run smoke
```

### Check API Health
```bash
curl https://api.clientflow.ai/health
```

### Check API Readiness
```bash
curl https://api.clientflow.ai/ready
```

### View API Documentation
- Swagger UI: `https://api.clientflow.ai/api/docs`
- OpenAPI Spec: `https://api.clientflow.ai/api/openapi.json`

---

**Note**: This checklist should be reviewed and updated regularly as new features and integrations are added to the system.
