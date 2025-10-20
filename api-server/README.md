# ClientFlow AI Suite API Server

A production-ready CRM API with AI-powered business automation, built with TypeScript, Express.js, and Supabase.

## 🚀 Features

- **Customer Management**: Complete CRUD operations for customer data
- **Appointment Scheduling**: Advanced appointment booking and management
- **Call Tracking**: Integration with Twilio for call recording and analytics
- **Review Management**: Handle customer reviews and responses
- **Analytics Dashboard**: Comprehensive business metrics and KPIs
- **Team Management**: Role-based access control and team collaboration
- **File Upload**: Secure file storage with Supabase Storage
- **Real-time Notifications**: WebSocket-based notification system
- **Webhook Integration**: Support for external service integrations

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Logging**: Winston
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account and project
- Git

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd api-server
npm install
```

### 2. Environment Setup

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### 3. Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```

### 4. Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3001`
- Production: `https://your-domain.vercel.app`

### Authentication
All API endpoints (except webhooks) require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-domain.vercel.app/api/customers
```

### Core Endpoints

#### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

#### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id/status` - Update status
- `DELETE /api/appointments/:id` - Cancel appointment

#### Analytics
- `GET /api/analytics/dashboard` - Dashboard KPIs
- `GET /api/analytics/calls` - Call analytics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/realtime` - Real-time metrics

#### Team Management
- `GET /api/team-members` - List team members
- `POST /api/team-members` - Invite member
- `PUT /api/team-members/:id` - Update role
- `DELETE /api/team-members/:id` - Remove member

### Webhook Endpoints

#### Twilio
- `POST /api/webhooks/twilio` - Call status updates
- `POST /api/webhooks/twilio/recording` - Recording completion

#### Google Calendar
- `POST /api/webhooks/google-calendar` - Calendar events

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Required |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | `100` |
| `LOG_LEVEL` | Logging level | `info` |

### Database Schema

The API uses Supabase with the following main tables:
- `customers` - Customer information
- `appointments` - Appointment bookings
- `calls` - Call records and analytics
- `reviews` - Customer reviews
- `services` - Business services
- `conversations` - Customer conversations
- `team_members` - Team management
- `notifications` - System notifications

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   vercel login
   vercel link
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Manual Deployment

1. **Build**
   ```bash
   npm run build
   ```

2. **Deploy dist/ folder** to your preferred platform

## 🧪 Testing

### Health Check
```bash
curl https://your-domain.vercel.app/health
```

### API Test
```bash
curl https://your-domain.vercel.app/api/test
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 10 --num 5 https://your-domain.vercel.app/health
```

## 📊 Monitoring

### Logs
- Development: Console output
- Production: Winston file logging in `logs/` directory

### Metrics
- Request/response times
- Error rates
- Database query performance
- Memory usage

### Health Monitoring
- `/health` endpoint for uptime monitoring
- Database connection status
- External service availability

## 🔒 Security

### Implemented Security Measures
- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content sanitization
- **Authentication**: JWT token verification
- **Authorization**: Role-based access control

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check Supabase credentials
   - Verify network connectivity
   - Check database status

2. **Authentication Errors**
   - Verify JWT token format
   - Check token expiration
   - Validate user permissions

3. **Rate Limit Exceeded**
   - Implement exponential backoff
   - Check rate limit configuration
   - Consider upgrading limits

4. **Build Failures**
   - Check TypeScript errors: `npm run type-check`
   - Fix linting issues: `npm run lint`
   - Verify all dependencies installed

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## 📈 Performance

### Optimization Tips
- Use database indexes for frequently queried fields
- Implement caching for expensive operations
- Use pagination for large datasets
- Optimize database queries
- Monitor memory usage

### Performance Monitoring
- Response time tracking
- Database query analysis
- Memory usage monitoring
- Error rate tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and type checking
6. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add JSDoc comments for functions
- Write unit tests for new features
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## 🔄 Changelog

### v1.0.0
- Initial release
- Core CRM functionality
- Analytics dashboard
- Team management
- File upload system
- Webhook integrations

---

**Built with ❤️ by the ClientFlow AI Suite team**