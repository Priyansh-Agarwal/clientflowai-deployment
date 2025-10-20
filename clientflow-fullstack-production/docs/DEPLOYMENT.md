# 🚀 ClientFlow AI Suite - Deployment Guide

Complete guide for deploying the full-stack CRM application to Vercel.

## 📋 Prerequisites

- GitHub account
- Vercel account (free tier available)
- Supabase account (free tier available)

## 🌐 Vercel Deployment (Recommended)

### Step 1: Prepare Repository

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial full-stack production setup"
   git branch -M main
   git remote add origin https://github.com/yourusername/clientflow-fullstack-production.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Sign in with GitHub

2. **Import Project**
   - Click "Import Git Repository"
   - Select your `clientflow-fullstack-production` repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: `/` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`

### Step 3: Environment Variables

Add these in Vercel → Settings → Environment Variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Application Configuration
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters
CORS_ORIGIN=*

# Optional: Additional Services
SMS_API_KEY=your_sms_api_key
EMAIL_API_KEY=your_email_api_key
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Your app will be live!

## 🔧 Configuration Details

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

### Frontend Build Configuration

The frontend uses Vite and will build to `frontend/dist/` directory.

### Backend API Configuration

The backend API runs on Vercel's serverless functions and handles all `/api/*` routes.

## 📊 Post-Deployment

### Verify Deployment

1. **Check Frontend**: Visit your Vercel URL
2. **Check API**: Visit `your-url.vercel.app/api/health`
3. **Check Database**: Visit `your-url.vercel.app/api/test`

### Expected URLs

- **Frontend**: `https://your-app.vercel.app`
- **API Health**: `https://your-app.vercel.app/api/health`
- **API Test**: `https://your-app.vercel.app/api/test`
- **API Docs**: `https://your-app.vercel.app/api`

## 🔍 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check environment variables are set
   - Verify Node.js version (18+)
   - Check package.json scripts

2. **API Not Working**
   - Verify Supabase credentials
   - Check CORS settings
   - Review backend logs in Vercel dashboard

3. **Frontend Not Loading**
   - Check build output directory
   - Verify Vite configuration
   - Check for TypeScript errors

### Debug Commands

```bash
# Check build locally
npm run build

# Test API locally
cd backend && npm start

# Test frontend locally
cd frontend && npm run dev
```

## 🚀 Performance Optimization

### Vercel Optimizations

- **Automatic CDN**: Global content delivery
- **Edge Functions**: Fast API responses
- **Image Optimization**: Automatic image compression
- **Caching**: Intelligent caching strategies

### Application Optimizations

- **Code Splitting**: Automatic bundle splitting
- **Tree Shaking**: Remove unused code
- **Minification**: Compressed assets
- **Lazy Loading**: Load components on demand

## 📈 Monitoring

### Vercel Analytics

- **Performance**: Core Web Vitals
- **Usage**: Page views and API calls
- **Errors**: Real-time error tracking
- **Functions**: Serverless function metrics

### Application Monitoring

- **Health Checks**: `/api/health` endpoint
- **Database**: Supabase dashboard
- **Logs**: Vercel function logs

## 🔄 Continuous Deployment

### Automatic Deployments

- **Git Push**: Deploys on every push to main
- **Preview Deployments**: Deploys on pull requests
- **Branch Deployments**: Deploy specific branches

### Manual Deployments

- **Vercel CLI**: `vercel --prod`
- **GitHub Actions**: Automated workflows
- **Webhook**: Trigger deployments via webhook

## 🎉 Success!

Your full-stack CRM application is now live and ready for production use!

### Next Steps

1. **Custom Domain**: Add your own domain
2. **SSL Certificate**: Automatic HTTPS
3. **Monitoring**: Set up alerts and monitoring
4. **Backup**: Configure database backups
5. **Scaling**: Monitor and scale as needed

---

**Your production-ready CRM is deployed!** 🚀✨
