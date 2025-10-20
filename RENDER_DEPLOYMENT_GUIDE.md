# ClientFlow AI Suite - Render Deployment Guide

## 🚀 Deploy to Render

### Prerequisites
- GitHub repository: [https://github.com/Priyansh-Agarwal/clientflow-fullstack-production](https://github.com/Priyansh-Agarwal/clientflow-fullstack-production)
- Render account: [https://render.com](https://render.com)
- Supabase project with API keys
- OpenAI API key

## 📋 Step-by-Step Deployment

### 1. **Create Render Account**
1. Go to [https://render.com](https://render.com)
2. Sign up with your GitHub account
3. Connect your GitHub repository

### 2. **Create New Web Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `Priyansh-Agarwal/clientflow-fullstack-production`
3. Select branch: `main`
4. Choose "Node" as the environment

### 3. **Configure Build Settings**
```
Build Command: cd api-server && npm install
Start Command: cd api-server && npm run start:production
Root Directory: api-server
```

### 4. **Set Environment Variables**
In the Render dashboard, go to Environment tab and add:

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environment |
| `PORT` | `10000` | Render port (auto-set) |
| `SUPABASE_URL` | `https://gmpsdeenhdtvbxjungxl.supabase.co` | Your Supabase URL |
| `SUPABASE_ANON_KEY` | `your_new_anon_key` | **⚠️ Use NEW rotated key** |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_new_service_key` | **⚠️ Use NEW rotated key** |
| `OPENAI_API_KEY` | `your_new_openai_key` | **⚠️ Use NEW rotated key** |
| `JWT_SECRET` | `generate_random_string` | Generate a secure random string |

### 5. **Advanced Settings**
- **Plan**: Starter (Free) or Professional
- **Region**: Oregon (US West)
- **Auto-Deploy**: Yes (deploys on git push)
- **Health Check Path**: `/health`

### 6. **Deploy**
1. Click "Create Web Service"
2. Render will automatically build and deploy your API
3. Wait for deployment to complete (5-10 minutes)

## 🔧 **Post-Deployment Setup**

### 1. **Test Your API**
```bash
# Replace YOUR_RENDER_URL with your actual Render URL
curl https://your-app-name.onrender.com/health
curl https://your-app-name.onrender.com/
curl https://your-app-name.onrender.com/docs
```

### 2. **Run Database Migrations**
```bash
# SSH into your Render instance or run locally with Render URL
curl -X POST https://your-app-name.onrender.com/api/migrate
```

### 3. **Test All Endpoints**
```bash
# Health check
curl https://your-app-name.onrender.com/health

# API documentation
curl https://your-app-name.onrender.com/docs

# Test customer creation
curl -X POST https://your-app-name.onrender.com/api/customers \
  -H "Content-Type: application/json" \
  -d '{"business_id":"test-123","first_name":"Test","last_name":"User"}'
```

## 🔒 **Security Configuration**

### 1. **Rotate API Keys (CRITICAL)**
**Before deploying, you MUST rotate these keys:**

**Supabase:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → API
3. Click "Reset" on both anon and service role keys
4. Copy the new keys to Render environment variables

**OpenAI:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Delete the exposed key
3. Generate a new API key
4. Add to Render environment variables

### 2. **Generate JWT Secret**
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📊 **Monitoring & Maintenance**

### 1. **Health Monitoring**
- **Health Check**: `https://your-app-name.onrender.com/health`
- **API Docs**: `https://your-app-name.onrender.com/docs`
- **Status Page**: Monitor in Render dashboard

### 2. **Logs**
- View logs in Render dashboard
- Set up log forwarding if needed
- Monitor error rates and performance

### 3. **Scaling**
- **Starter Plan**: 750 hours/month free
- **Professional Plan**: $7/month for always-on
- **Auto-scaling**: Available on paid plans

## 🚨 **Troubleshooting**

### Common Issues

**1. Build Fails**
```bash
# Check build logs in Render dashboard
# Ensure all dependencies are in package.json
# Verify Node.js version compatibility
```

**2. Environment Variables Not Working**
```bash
# Verify all required env vars are set
# Check for typos in variable names
# Ensure values don't have extra spaces
```

**3. Database Connection Issues**
```bash
# Verify Supabase URL format
# Check service role key permissions
# Test connection locally first
```

**4. API Not Responding**
```bash
# Check health endpoint: /health
# Verify port configuration
# Check Render service logs
```

## 📈 **Performance Optimization**

### 1. **Enable Caching**
- Set up Redis for session storage
- Configure response caching
- Use CDN for static assets

### 2. **Database Optimization**
- Enable connection pooling
- Optimize RLS policies
- Monitor query performance

### 3. **Monitoring Setup**
- Set up uptime monitoring
- Configure error alerting
- Track API usage metrics

## 🎯 **Success Verification**

After deployment, verify:

- [ ] Health endpoint responds: `/health`
- [ ] API documentation loads: `/docs`
- [ ] Database connection works
- [ ] All 13 endpoints respond correctly
- [ ] Rate limiting is active
- [ ] JWT authentication works
- [ ] CORS headers are set
- [ ] Error handling works

## 📞 **Support Resources**

- **Render Documentation**: [https://render.com/docs](https://render.com/docs)
- **API Documentation**: `https://your-app-name.onrender.com/docs`
- **Health Status**: `https://your-app-name.onrender.com/health`
- **GitHub Repository**: [https://github.com/Priyansh-Agarwal/clientflow-fullstack-production](https://github.com/Priyansh-Agarwal/clientflow-fullstack-production)

---

**🎉 Your ClientFlow AI Suite will be live at: `https://your-app-name.onrender.com`**

**Next Steps:**
1. Deploy to Render
2. Test all endpoints
3. Set up monitoring
4. Configure custom domain (optional)
5. Set up CI/CD for automatic deployments
