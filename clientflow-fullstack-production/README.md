# 🚀 ClientFlow AI Suite - Full Stack Production

A complete, production-ready CRM application with React frontend and Node.js backend, optimized for Vercel deployment.

## 📁 Project Structure

```
clientflow-fullstack-production/
├── frontend/          # React + Vite frontend
├── backend/           # Node.js + Express API server
├── docs/              # Documentation
├── vercel.json        # Vercel deployment configuration
└── package.json       # Root package configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

### Development
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 🌐 Production Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import this repository
   - Vercel will auto-detect the configuration

2. **Environment Variables**
   Add these in Vercel → Settings → Environment Variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   NODE_ENV=production
   JWT_SECRET=your_jwt_secret
   ```

3. **Deploy**
   - Click "Deploy"
   - Your app will be live in minutes!

## 📊 Features

### Frontend (React + Vite)
- ✅ Modern React 18 with TypeScript
- ✅ Tailwind CSS for styling
- ✅ Shadcn/ui component library
- ✅ Supabase integration
- ✅ Responsive design
- ✅ Dark/Light mode support

### Backend (Node.js + Express)
- ✅ RESTful API with Express
- ✅ Supabase PostgreSQL database
- ✅ JWT authentication
- ✅ File upload handling
- ✅ Webhook support
- ✅ Analytics and reporting
- ✅ Team management
- ✅ Appointment scheduling

## 🔧 API Endpoints

- `GET /` - API documentation
- `GET /health` - Health check
- `GET /api/test` - Database connection test
- `GET /api/businesses` - Business data
- `GET /api/customers` - Customer management
- `GET /api/appointments` - Appointment scheduling
- `GET /api/analytics` - Analytics dashboard
- `POST /api/upload` - File uploads
- `POST /api/webhooks` - Webhook handling

## 🛠️ Development Commands

```bash
# Install dependencies
npm run install:all

# Start both frontend and backend
npm run dev

# Start only frontend
npm run dev:frontend

# Start only backend
npm run dev:backend

# Build for production
npm run build

# Start production server
npm start
```

## 📚 Documentation

- [Frontend Documentation](./frontend/README.md)
- [Backend API Documentation](./backend/README.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [API Reference](./docs/API_REFERENCE.md)

## 🌟 Production Ready Features

- ✅ **Auto-scaling**: Vercel handles traffic spikes
- ✅ **CDN**: Global content delivery
- ✅ **SSL**: Automatic HTTPS
- ✅ **Monitoring**: Built-in analytics
- ✅ **CI/CD**: Automatic deployments
- ✅ **Database**: Supabase PostgreSQL
- ✅ **Security**: JWT authentication
- ✅ **Performance**: Optimized builds

## 🔗 Live Demo

- **Frontend**: https://clientflow-fullstack.vercel.app
- **API**: https://clientflow-fullstack.vercel.app/api

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Ready for production deployment!** 🚀✨
