# 🚀 **VERCEL DEPLOYMENT GUIDE**

## 🎯 **DEPLOY YOUR API SERVER TO VERCEL**

Your GitHub repository is ready! Now let's deploy it to Vercel.

---

## 📱 **STEP 1: Go to Vercel**

**Click**: https://vercel.com/new

---

## 📤 **STEP 2: Import Your Repository**

1. **Sign in to Vercel** (use GitHub account)
2. **Click**: "Import Git Repository"
3. **Find**: `Priyansh-Agarwal/clientflow-ai-suite`
4. **Click**: "Import"

---

## ⚙️ **STEP 3: Configure Project**

### **🔧 Project Settings:**
- **Project Name**: `clientflow-ai-api` (or your choice)
- **Framework Preset**: **Other** or **Node.js**
- **Root Directory**: Type `api-server`
- **Build Command**: Leave empty
- **Output Directory**: Leave empty
- **Install Command**: `npm install`

### **🔑 Environment Variables (IMPORTANT!)**
**Click "Environment Variables" and add these:**

```
Variable: SUPABASE_URL
Value: https://gmpsdeenhdtvbxjungxl.supabase.co

Variable: SUPABASE_SERVICE_ROLE_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcHNkZWVuaGR0dmJ4anVuZ3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUzMDY2OCwiZXhwIjoyMDc1MTA2NjY4fQ.kIXgTLe10v3gRLtEYfeEJz8dHXZMuWARnUty6wNItHI

Variable: NODE_ENV
Value: production

Variable: PORT
Value: 3001
```

---

## 🚀 **STEP 4: Deploy**

1. **Click**: "Deploy"
2. **Wait**: 2-3 minutes for deployment
3. **Copy**: Your deployment URL

---

## ✅ **STEP 5: Test Your Deployment**

After deployment, test these URLs:

```
✅ Main API: https://your-api-name.vercel.app/
✅ Health: https://your-api-name.vercel.app/health
✅ Test DB: https://your-api-name.vercel.app/api/test
✅ Businesses: https://your-api-name.vercel.app/api/businesses
```

---

## 🎉 **SUCCESS!**

**You now have:**
- ✅ **Frontend**: https://clientflow-ai-suite.vercel.app (existing)
- ✅ **API**: https://your-new-api.vercel.app (NEW!)

**Complete CRM solution is LIVE!** 🚀

---

## 🔄 **Automatic Updates**

Any changes pushed to your GitHub repository will automatically deploy to Vercel!

**Your professional CRM API is now live and scaling globally!** ⚡🌟

