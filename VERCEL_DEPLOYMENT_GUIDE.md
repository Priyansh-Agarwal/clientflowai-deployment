# 🚀 Complete Vercel Deployment Guide

## **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

## **Step 2: Login to Vercel**

```bash
vercel login
```

## **Step 3: Deploy from api-server directory**

```bash
cd api-server
vercel --prod
```

## **Step 4: Set Environment Variables**

After deployment, set these in your Vercel dashboard:

### **Required Environment Variables:**
```env
SUPABASE_URL=https://gmpsdeenhdtvbxjungxl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcHNkZWVuaGR0dmJ4anVuZ3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUzMDY2OCwiZXhwIjoyMDc1MTA2NjY4fQ.qIXgTLe10v3gRLtEYfeEJz8dHXZMuWARnUty6wNItHI
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcHNkZWVuaGR0dmJ4anVuZ3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzA2NjgsImV4cCI6MjA3NTEwNjY2OH0.C5sWEGKxDuSaD3xsui4YUKgGPhWrsDQ_C26yJMtkJc
JWT_SECRET=production_jwt_secret_key_minimum_32_characters_long
NODE_ENV=production
```

### **Optional Environment Variables (for full functionality):**
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM=+15555551234
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM=noreply@clientflow.ai
OPENAI_API_KEY=sk-your_openai_api_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
```

## **Step 5: Test Your Deployment**

After deployment, test your API:

```bash
# Test health endpoint
curl https://your-app-name.vercel.app/health

# Test API documentation
curl https://your-app-name.vercel.app/

# Test database connection
curl https://your-app-name.vercel.app/test
```

## **Step 6: Set up n8n Workflows**

1. **Start n8n locally:**
   ```bash
   cd n8n
   docker-compose up -d
   ```

2. **Access n8n:** `http://localhost:5678`

3. **Import workflows:** Import all 6 JSON files from `n8n/` folder

4. **Configure environment variables in n8n:**
   ```json
   {
     "API_BASE_URL": "https://your-app-name.vercel.app/api",
     "ORG_ID": "your-organization-uuid",
     "AUTH_TOKEN": "Bearer your-api-token",
     "SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/YOUR/WEBHOOK",
     "STRIPE_WEBHOOK_SECRET": "whsec_your_stripe_secret"
   }
   ```

## **Alternative Deployment Options**

### **Option A: Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### **Option B: Render**
1. Connect your GitHub repository
2. Select "Web Service"
3. Set build command: `npm install`
4. Set start command: `node index-production.js`
5. Add environment variables

### **Option C: Fly.io**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```

## **Production Checklist**

- [ ] ✅ API deployed successfully
- [ ] ✅ Environment variables configured
- [ ] ✅ Health endpoint responding
- [ ] ✅ Database connection working
- [ ] ✅ All API endpoints accessible
- [ ] ✅ n8n workflows imported and configured
- [ ] ✅ Webhooks set up in external services
- [ ] ✅ Custom domain configured (optional)
- [ ] ✅ SSL certificate active
- [ ] ✅ Monitoring set up

## **Testing Your Production API**

```bash
# Test all endpoints
curl -X GET "https://your-app-name.vercel.app/health"
curl -X GET "https://your-app-name.vercel.app/api/businesses"
curl -X POST "https://your-app-name.vercel.app/api/messages/outbound?orgId=test" \
  -H "Content-Type: application/json" \
  -d '{"channel":"sms","to_addr":"+15555551234","body":"Test message"}'
```

## **Troubleshooting**

### **Common Issues:**

1. **Build Failed**
   - Check Node.js version (18+)
   - Verify all dependencies in package.json
   - Check vercel.json configuration

2. **Environment Variables Not Working**
   - Verify variables are set in Vercel dashboard
   - Check variable names match exactly
   - Redeploy after adding variables

3. **Database Connection Failed**
   - Verify Supabase credentials
   - Check network connectivity
   - Test with `/test` endpoint

4. **API Endpoints Not Working**
   - Check vercel.json routes configuration
   - Verify index-production.js is the entry point
   - Check function timeout settings

## **Success!**

Once deployed, your API will be available at:
`https://your-app-name.vercel.app`

**Your ClientFlow AI Suite is now live and production-ready! 🎉**
