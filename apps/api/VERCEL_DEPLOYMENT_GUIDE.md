# 🚀 **VERCEL DEPLOYMENT GUIDE**

After uploading to GitHub, deploy your API to Vercel automatically!

---

## 📱 **STEP 1: Go to Vercel**

**Click**: https://vercel.com/new

## 📤 **STEP 2: Import From GitHub**

1. **Sign in** with your GitHub account
2. **Click**: "Import Git Repository"
3. **Find and select**: `Priyansh-Agarwal/clientflow-ai-suite`
4. **Click**: "Import" 

## ⚙️ **STEP 3: Configure Project**

### **🔧 Project Settings**
- **Project Name**: `clientflow-ai-api` (or your choice)
- **Framework Preset**: Other
- **Root Directory**: Type `api-server`
- **Build Command**: Leave empty
- **Output Directory**: Leave empty

### **🔑 Environment Variables**
**Click "Environment Variables" and add these:**

```
SUPABASE_URL
https://gmpsdeenhdtvbxjungxl.supabase.co

SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcHNkZWVuaGR0dmJ4anVuZ3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUzMDY2OCwiZXhwIjoyMDc1MTA2NjY4fQ.kIXgTLe10v3gRLtEYfeEJz8dHXZMuWARnUty6wNItHI

SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcHNkZWVuaGR0dmJ4anVuZ3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzA2NjgsImV4cCI6MjA3NTEwNjY2OH0.C5sWEGKxDuSaD3xsui4YUKgGPhWrsDQ_C26yJMtkJc

NODE_ENV
production

PORT
3001
```

## 🚀 **STEP 4: Deploy**

1. **Click**: "Deploy"
2. **Wait**: 2-3 minutes for deployment
3. **Your API will be live!**

---

## ✅ **STEP 5: Test Your Deployment**

After deployment completes, you'll get a URL like:
`https://clientflow-ai-api.vercel.app`

### **🧪 Test These Endpoints:**

```
✅ Main API: https://your-api.vercel.app/
✅ Health: https://your-api.vercel.app/health
✅ Test DB: https://your-api.vercel.app/api/test
✅ Businesses: https://your-api.vercel.app/api/businesses
✅ Customers: https://your-api.vercel.app/api/customers
```

---

## 🎉 **SUCCESS!**

**You now have:**
- ✅ **Frontend**: https://clientflow-ai-suite.vercel.app
- ✅ **API**: https://your-api.vercel.app
- ✅ **Complete CRM Solution**: Frontend + Backend + Database

---

## 🔄 **Automatic Updates**

Any changes you push to your GitHub repository will automatically deploy to Vercel!

---

**Your professional CRM API is now live and scalable! 🚀**