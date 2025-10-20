# 🚀 **ClientFlow AI Suite - Production Deployment Guide**

Complete guide to deploy the ClientFlow AI Suite API server to production with enterprise-grade security, monitoring, and reliability.

---

## 📋 **Production Readiness Checklist**

### **✅ Pre-Deployment Verification**
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Environment-specific secrets secured
- [ ] HTTPS/SSL certificates installed
- [ ] Domain configuration complete
- [ ] Load balancer configured
- [ ] Monitoring/alerting setup
- [ ] Backup procedures tested
- [ ] Security audit completed

### **✅ Security Checklist**
- [ ] API endpoints secured with authentication
- [ ] Webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] CORS policy properly set
- [ ] Security headers implemented
- [ ] Sensitive data properly encrypted
- [ ] Error messages sanitized for production
- [ ] File upload size limits enforced
- [ ] Input validation comprehensive

---

## 🏗️ **Infrastructure Requirements**

### **Minimum Production Requirements**
- **CPU**: 2 vCPU cores (recommended: 4+ cores)
- **RAM**: 4GB (recommended: 8GB+)
- **Storage**: 50GB SSD (recommended: 100GB+)
- **Network**: 100Mbps connection (recommended: 1Gbps)
- **OS**: Ubuntu 20.04 LTS or CentOS 8+

### **Recommended Architecture**
```
Internet → Load Balancer → Multiple API Servers → Database/Redis
                ↓
         Monitoring & Logging
```

---

## 🔧 **Environment Configuration**

### **1. Copy Environment Template**
```bash
cp env.example .env.production
```

### **2. Configure Production Environment Variables**
```bash
# Core configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Supabase (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security (REQUIRED)
JWT_SECRET=your_super_secure_64_character_secret_key_here_must_be_random_and_secure
SESSION_SECRET=your_session_secret_here

# CORS (REQUIRED - Replace with your domain)
CORS_ORIGIN=https://your-production-domain.com,https://app.your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
WEBHOOK_RATE_LIMIT_MAX_REQUESTS=5000

# Twilio (REQUIRED for SMS/Calls)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890

# Webhook Security (REQUIRED)
TWILIO_WEBHOOK_AUTH_TOKEN=your_twilio_auth_token
GOOGLE_CALENDAR_WEBHOOK_SECRET=your_google_secret
SMS_PROVIDER_WEBHOOK_SECRET=your_sms_secret
REVIEW_PLATFORM_WEBHOOK_SECRET=your_review_secret

# File Upload Limits
MAX_FILE_SIZE_MB=50
MAX_UPLOADS_PER_HOUR=1000

# Monitoring (RECOMMENDED)
SENTRY_DSN=your_sentry_dsn_here
ENABLE_REQUEST_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true

# Email Service (RECOMMENDED)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@your-domain.com
FROM_NAME="ClientFlow AI Suite"

# Database Optimization
DB_POOL_MIN_HOSTS=2
DB_POOL_MIN_CONNECTIONS_PER_HOST=1
DB_POOL_MAX_CONNECTIONS_PER_HOST=20
DB_QUERY_TIMEOUT=30000
```

### **3. Generate Secure Secrets**
```bash
# Generate JWT secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate webhook secrets
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

---

## 🐳 **Docker Deployment**

### **1. Create Production Dockerfile**
```dockerfile
# Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### **2. Create Docker Compose for Production**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: clientflow-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3001:3001"
    volumes:
      - ./logs:/app/logs
    networks:
      - clientflow-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: clientflow-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - clientflow-network

  redis:
    image: redis:7-alpine
    container_name: clientflow-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - clientflow-network

networks:
  clientflow-network:
    driver: bridge

volumes:
  redis-data:
    driver: local
```

### **3. Create Nginx Configuration**
```nginx
# nginx.conf
events {
  worker_connections 1024;
}

http {
  upstream api {
    server app:3001;
  }

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=webhooks:10m rate=50r/s;

  # Security headers
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

  server {
    listen 80;
    server_name your-api-domain.com;
    return 301 https://$server_name$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name your-api-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers for HTTPS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Webhook endpoints with higher rate limits
    location /api/webhooks/ {
      limit_req zone=webhooks burst=100;
      
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_cache_bypass $http_upgrade;
      
      # Timeout settings for webhooks
      proxy_connect_timeout 30s;
      proxy_send_timeout 30s;
      proxy_read_timeout 30s;
    }

    # Regular API endpoints
    location /api/ {
      limit_req zone=api burst=20 nodelay;
      
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_cache_bypass $http_upgrade;
    }

    # Health endpoint (no rate limiting)
    location /health {
      proxy_pass http://api;
      access_log off;
    }

    # Static files
    location /robots.txt {
      proxy_pass http://api;
    }

    location /security.txt {
      proxy_pass http://api;
    }

    # Block access to sensitive files
    location ~ /\. {
      deny all;
      access_log off;
      log_not_found off;
    }

    location ~* \.(env|log|sh|sql)$ {
      deny all;
      access_log off;
      log_not_found off;
    }
  }
}
```

---

## 🚀 **Deployment Steps**

### **1. Production Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx (for manual setup if not using container)
sudo apt install nginx certbot python3-certbot-nginx -y

# Create application user
sudo useradd -m -s /bin/bash clientflow
sudo usermod -aG docker clientflow
```

### **2. Application Deployment**
```bash
# Clone repository
git clone https://github.com/your-org/clientflow-ai-suite.git
cd clientflow-ai-suite/api-server

# Configure environment
cp env.example .env.production
# Edit .env.production with production values

# Build production image
docker build -f Dockerfile.production -t clientflow-api:latest .

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml logs -f
```

### **3. SSL Certificate Setup**
```bash
# Using Certbot with Nginx
sudo certbot --nginx -d your-api-domain.com

# Test certificate renewal
sudo certbot renew --dry-run

# Auto-renewal (add to crontab)
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### **4. Database Setup**
```bash
# Apply database migrations
docker exec -it clientflow-api npm run migrate

# Verify database connectivity
docker exec -it clientflow-api npm run db:check
```

---

## 📊 **Monitoring & Logging**

### **1. Application Monitoring**
```bash
# Install monitoring tools
docker run -d \
  --name=prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest

# Monitor API endpoints
curl -f http://localhost:3001/health || exit 1
docker logs clientflow-api --tail 100
```

### **2. Log Management**
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs app -f

# Log rotation (systemd service)
sudo tee /etc/systemd/system/clientflow-logs.service << EOF
[Unit]
Description=ClientFlow Log Rotation
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker exec clientflow-api npm run logs:rotate
User=root

[Install]
WantedBy=multi-user.target
EOF
```

### **3. Health Monitoring Script**
```bash
#!/bin/bash
# health-check.sh

API_URL="${API_URL:-http://localhost:3001}"
MAX_RESPONSE_TIME=5

while true; do
  RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s "$API_URL/health")
  
  if (( $(echo "$RESPONSE_TIME > $MAX_RESPONSE_TIME" | bc) )); then
    echo "WARNING: Slow response time - ${RESPONSE_TIME}s"
    # Send alert (email, Slack, etc.)
  fi
  
  sleep 30
done
```

---

## 🔐 **Security Hardening**

### **1. Server Security**
```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3001/tcp  # Block direct access to API

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **2. Docker Security**
```bash
# Scan Docker image for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image clientflow-api:latest

# Sign Docker images
docker trust key generate clientflow
docker trust signer add --key clientflow.pub clientflow clientflow-api:latest
```

### **3. Regular Security Updates**
```bash
# Automated security updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades

# Update Docker images regularly
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📈 **Performance Optimization**

### **1. Database Optimization**
```sql
-- Connect to PostgreSQL and run:
ANALYZE;
VACUUM;

-- Create additional indexes for production workload
```

### **2. Application Tuning**
```bash
# Increase file descriptor limits
echo "* soft nofile 65000" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65000" | sudo tee -a /etc/security/limits.conf

# Optimize Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

### **3. Caching Strategy**
```bash
# Redis configuration for production
# Add to docker-compose.prod.yml:
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 🔄 **Backup & Recovery**

### **1. Database Backups**
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)

# Create Supabase database backup
supabase db dump --local --data-only > "$BACKUP_DIR/clientflow_backup_$DATE.sql"

# Upload to S3 (configure AWS CLI)
aws s3 cp "$BACKUP_DIR/clientflow_backup_$DATE.sql" s3://your-backup-bucket/

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

### **2. Configuration Backups**
```bash
# Backup environment files and configurations
tar -czf "/backups/config/clientflow_config_$(date +%Y%m%d).tar.gz" \
  .env.production docker-compose.prod.yml Dockerfile.production nginx.conf
```

---

## 🚨 **Incident Response**

### **1. Emergency Procedures**
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml stop

# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker image tag clientflow-api:latest clientflow-api:broken
docker image tag clientflow-api:working clientflow-api:latest
docker-compose -f docker-compose.prod.yml up -d

# Restore database from backup
supabase db reset < /backups/database/latest_backup.sql
```

### **2. Monitoring Alerts**
```yaml
# alertmanager.yml
groups:
  - name: clientflow-alerts
    rules:
      - alert: ApiDown
        expr: up{job="clientflow-api"} == 0
        for: 1m
        annotations:
          summary: "ClientFlow API is down"
          description: "The ClientFlow API has been down for more than 1 minute"
      
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 10% for 2 minutes"
```

---

## 📚 **Additional Resources**

### **Documentation**
- [API Documentation](./docs/)
- [Webhook Integration Guide](./docs/WEBHOOK_INTEGRATION_API.md)
- [Database Schema](./supabase/migrations/)

### **Support**
- **Security Issues**: security@yourcompany.com
- **Technical Support**: support@yourcompany.com
- **Status Page**: https://status.yourcompany.com

### **Performance**
- **Target Response Time**: < 200ms (95th percentile)
- **Uptime SLA**: 99.9%
- **Concurrent Users**: 1000+ per minute

---

## ✅ **Production Deployment Verification**

Run the following tests after deployment:

```bash
# Health check
curl https://your-api-domain.com/health

# API documentation
curl https://your-api-domain.com/api

# Webhook endpoints (test with sample data)
curl -X POST https://your-api-domain.com/api/webhooks/health

# Authentication endpoints
curl -H "Authorization: Bearer invalid-token" https://your-api-domain.com/api/customers

# Rate limiting (should return 429 after multiple requests)
for i in {1..10}; do curl https://your-api-domain.com/api; done

# SSL certificate
openssl s_client -connect your-api-domain.com:443 -servername your-api-domain.com
```

**Congratulations! Your ClientFlow AI Suite API is now production-ready with enterprise-grade security, monitoring, and reliability.** 🚀
