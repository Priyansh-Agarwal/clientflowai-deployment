# 🚀 ClientFlow AI Suite - Production Deployment Guide

This guide will help you deploy the ClientFlow AI Suite API to production with all the necessary configurations and optimizations.

## 📋 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All TypeScript errors fixed
- [ ] Linting passed (`npm run lint`)
- [ ] Type checking passed (`npm run type-check`)
- [ ] Tests passing (`npm test`)
- [ ] Build successful (`npm run build`)

### ✅ Environment Configuration
- [ ] Environment variables configured
- [ ] Database credentials set
- [ ] CORS origins configured
- [ ] Rate limiting configured
- [ ] Security headers enabled

### ✅ Database Setup
- [ ] Supabase project created
- [ ] Database schema migrated
- [ ] Row Level Security (RLS) enabled
- [ ] Service role key generated
- [ ] Anon key generated

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

#### Prerequisites
- Vercel account
- GitHub repository connected
- Environment variables ready

#### Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link Project**
   ```bash
   cd api-server
   vercel link
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add NODE_ENV production
   vercel env add CORS_ORIGIN https://your-frontend-domain.com
   ```

5. **Deploy**
   ```bash
   vercel --prod
   ```

#### Vercel Configuration
The `vercel.json` file is already configured for TypeScript builds:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "functions": {
    "dist/index.js": {
      "maxDuration": 30
    }
  }
}
```

### Option 2: Railway

#### Prerequisites
- Railway account
- GitHub repository connected

#### Steps

1. **Connect Repository**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Build**
   - Root Directory: `api-server`
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. **Set Environment Variables**
   - Go to Variables tab
   - Add all required environment variables

4. **Deploy**
   - Railway will automatically deploy on push to main branch

### Option 3: DigitalOcean App Platform

#### Prerequisites
- DigitalOcean account
- GitHub repository connected

#### Steps

1. **Create App**
   - Go to DigitalOcean App Platform
   - Click "Create App"
   - Connect GitHub repository

2. **Configure App Spec**
   ```yaml
   name: clientflow-api
   services:
   - name: api
     source_dir: api-server
     github:
       repo: your-username/your-repo
       branch: main
     run_command: npm start
     build_command: npm run build
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: SUPABASE_URL
       value: your-supabase-url
     - key: SUPABASE_ANON_KEY
       value: your-anon-key
     - key: SUPABASE_SERVICE_ROLE_KEY
       value: your-service-role-key
   ```

3. **Deploy**
   - Click "Create Resources"
   - Wait for deployment to complete

### Option 4: AWS (Manual)

#### Prerequisites
- AWS account
- EC2 instance or ECS cluster
- Domain name (optional)

#### Steps

1. **Prepare Server**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/your-repo.git
   cd your-repo/api-server
   
   # Install dependencies
   npm ci --production
   
   # Build application
   npm run build
   
   # Start with PM2
   pm2 start dist/index.js --name "clientflow-api"
   pm2 save
   pm2 startup
   ```

3. **Configure Nginx (Optional)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com,https://your-admin-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
WEBHOOK_RATE_LIMIT_WINDOW_MS=60000
WEBHOOK_RATE_LIMIT_MAX_REQUESTS=1000

# File Upload
MAX_FILE_SIZE_MB=10

# Logging
LOG_LEVEL=info

# Security
ALLOWED_WEBHOOK_IPS=127.0.0.1,::1

# External Services (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
```

## 🗄️ Database Setup

### Supabase Configuration

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note down URL and keys

2. **Run Database Migrations**
   ```sql
   -- Run the SQL files in supabase/migrations/
   -- Or use Supabase CLI:
   supabase db push
   ```

3. **Enable Row Level Security**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
   ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
   -- ... repeat for all tables
   ```

4. **Create RLS Policies**
   ```sql
   -- Example policy for customers table
   CREATE POLICY "Users can view own business customers" ON customers
   FOR SELECT USING (business_id = auth.jwt() ->> 'business_id');
   
   CREATE POLICY "Users can insert own business customers" ON customers
   FOR INSERT WITH CHECK (business_id = auth.jwt() ->> 'business_id');
   ```

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Get SSL Certificate**
   - Use Let's Encrypt (free)
   - Or purchase from certificate authority

2. **Configure HTTPS**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       # Security headers
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       
       location / {
           proxy_pass http://localhost:3001;
           # ... proxy configuration
       }
   }
   ```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Or iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -j DROP
```

## 📊 Monitoring & Logging

### Application Monitoring

1. **Health Checks**
   ```bash
   # Basic health check
   curl https://your-api-domain.com/health
   
   # Database health check
   curl https://your-api-domain.com/api/test
   ```

2. **Log Monitoring**
   ```bash
   # View logs (if using PM2)
   pm2 logs clientflow-api
   
   # View error logs
   pm2 logs clientflow-api --err
   ```

3. **Performance Monitoring**
   - Set up APM (Application Performance Monitoring)
   - Monitor response times
   - Track error rates
   - Monitor database performance

### External Monitoring

1. **Uptime Monitoring**
   - Use services like Pingdom, UptimeRobot
   - Monitor health endpoint
   - Set up alerts for downtime

2. **Error Tracking**
   - Integrate Sentry for error tracking
   - Set up alerts for critical errors
   - Monitor error trends

## 🧪 Testing Deployment

### Pre-Deployment Tests

1. **Local Testing**
   ```bash
   # Build and test locally
   npm run build
   npm start
   
   # Run API tests
   node test-api.js
   ```

2. **Staging Environment**
   - Deploy to staging first
   - Run full test suite
   - Test all endpoints
   - Verify database connections

### Post-Deployment Tests

1. **Smoke Tests**
   ```bash
   # Test basic functionality
   curl https://your-api-domain.com/health
   curl https://your-api-domain.com/api/test
   ```

2. **Load Testing**
   ```bash
   # Install artillery
   npm install -g artillery
   
   # Run load test
   artillery quick --count 10 --num 5 https://your-api-domain.com/health
   ```

3. **Integration Tests**
   - Test all API endpoints
   - Verify authentication
   - Test database operations
   - Check webhook endpoints

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: api-server/package-lock.json
    
    - name: Install dependencies
      run: |
        cd api-server
        npm ci
    
    - name: Run tests
      run: |
        cd api-server
        npm run type-check
        npm run lint
        npm test
    
    - name: Build application
      run: |
        cd api-server
        npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: api-server
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check TypeScript errors
   npm run type-check
   
   # Check linting errors
   npm run lint
   
   # Clean and rebuild
   npm run clean
   npm run build
   ```

2. **Database Connection Issues**
   - Check Supabase credentials
   - Verify network connectivity
   - Check database status in Supabase dashboard

3. **CORS Issues**
   - Verify CORS_ORIGIN environment variable
   - Check frontend domain configuration
   - Test with different origins

4. **Rate Limiting Issues**
   - Check rate limit configuration
   - Monitor request patterns
   - Adjust limits if needed

5. **Memory Issues**
   - Monitor memory usage
   - Check for memory leaks
   - Optimize database queries
   - Consider scaling up

### Debug Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs clientflow-api

# Restart application
pm2 restart clientflow-api

# Monitor resources
pm2 monit

# Check environment variables
pm2 env 0
```

## 📈 Performance Optimization

### Database Optimization

1. **Indexing**
   ```sql
   -- Add indexes for frequently queried fields
   CREATE INDEX idx_customers_business_id ON customers(business_id);
   CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
   CREATE INDEX idx_calls_business_id ON calls(business_id);
   ```

2. **Query Optimization**
   - Use pagination for large datasets
   - Optimize complex queries
   - Use database views for complex aggregations

### Application Optimization

1. **Caching**
   - Implement Redis caching
   - Cache frequently accessed data
   - Use CDN for static assets

2. **Compression**
   - Enable gzip compression
   - Optimize response sizes
   - Use efficient data formats

## 🔐 Security Best Practices

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply security patches promptly

2. **Access Control**
   - Use strong authentication
   - Implement proper authorization
   - Regular security audits

3. **Data Protection**
   - Encrypt sensitive data
   - Use secure connections
   - Implement data retention policies

## 📞 Support

If you encounter issues during deployment:

1. Check the troubleshooting section
2. Review logs for error messages
3. Test individual components
4. Contact support if needed

---

**Happy Deploying! 🚀**
