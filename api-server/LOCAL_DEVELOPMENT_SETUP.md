# 🚀 **Local Development Setup Guide**

Step-by-step guide to test the ClientFlow AI Suite API locally before production deployment.

---

## 📋 **Quick Setup Instructions**

### **Step 1: Environment Configuration**

1. **Copy environment template**:
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file with required values**:
   ```bash
   # Minimum required configuration for local testing:
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=change_this_to_a_secure_random_string_at_least_32_characters_long
   PORT=3001
   NODE_ENV=development
   ```

### **Step 2: Supabase Setup (Required)**

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your Project URL and API keys

2. **Apply Database Migrations**:
   ```sql
   -- Run these SQL commands in your Supabase SQL editor:
   -- (The migrations are in supabase/migrations/ folder)
   ```

3. **Enable Authentication**:
   - Go to Authentication → Settings in Supabase Dashboard
   - Set Site URL: `http://localhost:3000`
   - Enable email authentication

### **Step 3: Install and Build**

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev
```

### **Step 4: Test the API**

Visit these URLs to test:
- **Health Check**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/api
- **Webhook Health**: http://localhost:3001/api/webhooks/health

---

## 🧪 **Local Testing Procedures**

### **1. Health Check Tests**
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api
curl http://localhost:3001/robots.txt
curl http://localhost:3001/security.txt
```

### **2. Authentication Tests**
```bash
# Test unauthorized access
curl http://localhost:3001/api/customers

# Should return: {"error": "Authentication required", "statusCode": 401}
```

### **3. API Endpoint Tests**
```bash
# Test with invalid token
curl -H "Authorization: Bearer invalid-token" http://localhost:3001/api/customers

# Should return: {"error": "Invalid or expired token", "statusCode": 401}
```

---

## 📁 **Supabase Database Setup**

Create these tables in your Supabase project:

### **1. Run Core Migration**
```sql
-- Copy the contents of supabase/migrations/001_core_tables.sql
-- and run them in Supabase SQL Editor
```

### **2. Run Additional Migrations**
```sql
-- Copy and run:
-- supabase/migrations/005_notifications_table.sql
-- supabase/migrations/006_storage_setup.sql  
-- supabase/migrations/007_webhook_logs_table.sql
```

### **3. Enable Row Level Security**
The migration scripts automatically enable RLS, but verify:
- Go to Authentication → Policies in Supabase
- Ensure Row Level Security is enabled for all tables
- Review the policies created by the migrations

---

## 🔧 **Development Tools**

### **Useful npm Scripts**
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server (after build)
npm run test         # Run test suite
npm run lint         # Run ESLint
npm run health-check # Test API health endpoint
```

### **Development Server**
The development server runs with:
- **Hot reload**: Automatically restart on file changes
- **Source maps**: Full TypeScript debugging support
- **Debug logging**: Detailed request/response logging
- **Error details**: Full stack traces in development

---

## 🐛 **Troubleshooting**

### **Common Issues:**

1. **"Missing Supabase configuration"**
   - Verify `.env` file exists and has correct Supabase credentials
   - Check SUPABASE_URL format: `https://xxxxx.supabase.co`

2. **"Authentication failed"**
   - Ensure SUPABASE_SERVICE_ROLE_KEY is correct
   - Check Supabase project is active and accessible

3. **"Database connection failed"**
   - Verify database migrations have been applied
   - Check network connectivity to Supabase

4. **"Port already in use"**
   - Change PORT in `.env` file to different value (e.g., 3002)
   - Kill existing process: `npx kill-port 3001`

### **Debug Commands:**
```bash
# Check environment variables
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"

# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('businesses').select('id').limit(1).then(r => console.log('Connected:', !r.error));
"
```

---

## ✅ **Success Indicators**

The API is working correctly if:

1. **Server starts successfully**: Console shows "Server running on port 3001"
2. **Health check responds**: `curl http://localhost:3001/health` returns status 200
3. **API docs accessible**: Visit `http://localhost:3001/api` shows endpoint documentation
4. **Authentication works**: Unauthenticated requests return 401 properly
5. **Database connected**: No connection errors in logs

---

## 🚀 **Ready for Production?**

Before deploying to production, ensure:

- [ ] Local development server runs without errors
- [ ] All health checks pass
- [ ] Database migrations applied successfully
- [ ] Environment variables configured for production
- [ ] Domain name configured
- [ ] SSL certificates obtained
- [ ] Production secrets generated securely

---

**Once local testing passes, we'll proceed with production deployment!** 🎉
