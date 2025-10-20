# ClientFlow Hardened API - Production Ready

This is a production-hardened implementation of the ClientFlow API with security middleware, automation endpoints, and comprehensive testing.

## 🚀 Quick Start

### Option 1: Standalone Server (Recommended for Testing)

```bash
# Install dependencies
cd api-server
npm install

# Start the hardened API server
node standalone-server.js

# In another terminal, run tests
node ../test-api.js
```

### Option 2: TypeScript Implementation

```bash
# Install all dependencies
npm install

# Copy environment template
cp env.example .env

# Start development server
npm run dev

# Run tests
npm run test

# Run smoke test
npm run smoke
```

## 📋 Features Implemented

### ✅ Security & Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression
- **Request ID**: Unique request tracking
- **Rate Limiting**: Built-in protection
- **Input Validation**: Zod schema validation

### ✅ Communication Providers
- **Twilio**: SMS sending (sandbox mode)
- **SendGrid**: Email sending (sandbox mode)
- **Webhook Support**: Inbound message processing

### ✅ Automation Endpoints
- **SMS Inbound**: Process incoming SMS messages
- **Email Inbound**: Process incoming emails
- **Automation Runner**: Trigger automation workflows
- **Queue System**: BullMQ with Redis (ready for production)

### ✅ Business Logic Endpoints
- **Appointments**: Query appointment data
- **SLA Monitoring**: Track response time violations
- **Health Checks**: Service health and readiness

### ✅ Testing & Quality
- **Unit Tests**: Vitest + Supertest
- **Smoke Tests**: End-to-end API testing
- **TypeScript**: Full type safety
- **CI/CD**: GitHub Actions ready

### ✅ Production Ready
- **Docker**: Containerized deployment
- **Environment Config**: Comprehensive env setup
- **Logging**: Structured logging with Pino
- **Error Handling**: Graceful error responses
- **Documentation**: Complete API docs

## 🔧 API Endpoints

### Health & Status
- `GET /api/health` - Basic health check
- `GET /api/ready` - Readiness check (Redis connectivity)

### Messages
- `POST /api/messages/outbound` - Send SMS/Email
  ```json
  {
    "orgId": "uuid",
    "channel": "sms|email",
    "to_addr": "+15555550123",
    "body": "Your message"
  }
  ```

### Automations
- `POST /api/automations/sms_inbound` - Process inbound SMS
- `POST /api/automations/email_inbound` - Process inbound email
- `POST /api/automations/run` - Trigger automation
  ```json
  {
    "type": "reminder|nurture|dunning|booking|review|sla",
    "orgId": "uuid",
    "payload": {}
  }
  ```

### Business Data
- `GET /api/appointments?window=next_24h` - Get appointments
- `GET /api/sla/unanswered?minutes=5` - SLA violations

## 🧪 Testing

### Run All Tests
```bash
# Test the standalone server
node test-api.js

# Test TypeScript implementation
npm run test
npm run smoke
```

### Test Individual Endpoints
```bash
# Health check
curl http://localhost:4000/api/health

# Send SMS (sandbox)
curl -X POST "http://localhost:4000/api/messages/outbound?orgId=00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{"orgId":"00000000-0000-0000-0000-000000000000","channel":"sms","to_addr":"+15555550123","body":"Test"}'
```

## 🐳 Docker Deployment

### Build & Run
```bash
# Build Docker image
docker build -t clientflow-api ./api-server

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up
```

### Environment Variables
```bash
# Required
NODE_ENV=production
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/clientflow
REDIS_URL=redis://localhost:6379

# Optional (for full functionality)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SENDGRID_API_KEY=your_sendgrid_key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
OPENAI_API_KEY=sk-your_openai_key
```

## 🔒 Security Features

- **Helmet**: Security headers (XSS, CSRF, etc.)
- **CORS**: Configurable cross-origin policies
- **Rate Limiting**: Request throttling
- **Input Validation**: Schema-based validation
- **Request ID**: Request tracing
- **Error Sanitization**: Safe error responses

## 📊 Monitoring & Observability

- **Health Checks**: `/api/health` and `/api/ready`
- **Request Logging**: Structured JSON logs
- **Error Tracking**: Centralized error handling
- **Metrics**: Request timing and counts
- **Sentry Ready**: Error monitoring integration

## 🔄 CI/CD Pipeline

The repository includes GitHub Actions workflow:
- **Type Checking**: TypeScript compilation
- **Testing**: Unit and integration tests
- **Security**: Dependency scanning
- **Build**: Docker image creation

## 📚 Documentation

- **API Docs**: Complete endpoint documentation in `docs/AUTOMATIONS.md`
- **n8n Integration**: Ready-to-import workflows in `n8n/`
- **Environment**: Comprehensive env setup
- **Deployment**: Docker and production guides

## 🚀 Production Deployment

### Railway/Render/Vercel
1. Set environment variables
2. Deploy Docker container
3. Configure Redis database
4. Set up webhook endpoints

### Self-Hosted
1. Install Docker and Docker Compose
2. Configure environment variables
3. Run `docker-compose -f docker-compose.prod.yml up`
4. Set up reverse proxy (nginx)

## 🔧 Development

### Project Structure
```
api-server/
├── src/
│   ├── server.ts          # Express app setup
│   ├── index.ts           # Server startup
│   ├── lib/               # Utilities (tenancy, validation)
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── queues/            # Background jobs
│   └── types/              # TypeScript types
├── test/                  # Test files
├── scripts/               # Utility scripts
├── Dockerfile             # Container definition
└── package.json           # Dependencies
```

### Adding New Endpoints
1. Create route in `src/routes/`
2. Add validation schema
3. Implement business logic in `src/services/`
4. Add tests in `test/`
5. Update documentation

## 🆘 Troubleshooting

### Common Issues
1. **Port already in use**: Change PORT environment variable
2. **Redis connection failed**: Check REDIS_URL or run without Redis
3. **TypeScript errors**: Run `npm run typecheck`
4. **Tests failing**: Check environment variables

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check server status
curl http://localhost:4000/api/health
```

## 📞 Support

- **Documentation**: Check `docs/AUTOMATIONS.md`
- **Issues**: GitHub Issues
- **API Testing**: Use `test-api.js`
- **Logs**: Check console output for detailed logs

---

**🎉 Your ClientFlow API is now production-ready with enterprise-grade security, monitoring, and automation capabilities!**
