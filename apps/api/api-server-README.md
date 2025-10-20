# 🚀 **ClientFlow AI Suite - API Server**

**Production-Ready CRM API with Supabase Integration**

---

## 🏗️ **Architecture**

This is the backend API server for the ClientFlow AI Suite, built with:

- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Deployment**: Vercel Serverless
- **CI/CD**: GitHub Actions

---

## 🚀 **Quick Start**

### **Local Development**
```bash
# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm start
```

### **API Endpoints**
- **Base URL**: `https://your-domain.vercel.app/api`
- **Health Check**: `/health`
- **API Documentation**: `/`

---

## 📋 **Available APIs**

### **🏢 Business Management**
```http
GET    /api/businesses           # List businesses
POST   /api/businesses           # Create business
PUT    /api/businesses/:id       # Update business
DELETE /api/businesses/:id        # Delete business
```

### **👥 Customer Management**
```http
GET    /api/customers            # List customers
POST   /api/customers            # Create customer
PUT    /api/customers/:id        # Update customer
DELETE /api/customers/:id        # Delete customer
```

### **📅 Appointment Scheduling**
```http
GET    /api/appointments         # List appointments
POST   /api/appointments         # Create appointment
PUT    /api/appointments/:id     # Update appointment
PUT    /api/appointments/:id/status # Update appointment status
```

### **💬 Communication**
```http
GET    /api/conversations        # List conversations
POST   /api/conversations        # Create conversation
GET    /api/conversations/:id/messages # Get messages
POST   /api/conversations/:id/messages # Send message
```

### **📊 Analytics**
```http
GET    /api/analytics/dashboard  # Dashboard metrics
GET    /api/analytics/performance # Performance data
GET    /api/analytics/export     # Data export
```

### **🔗 Webhooks**
```http
POST   /api/webhooks/twilio      # Twilio call/webhook
POST   /api/webhooks/google-calendar # Google Calendar sync
POST   /api/webhooks/sms-provider # SMS delivery reports
POST   /api/webhooks/review-platforms # Review updates
```

---

## ⚙️ **Configuration**

### **Environment Variables**
```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production

# Optional
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=*
PORT=3001
```

### **Database Setup**
Run the SQL migrations in `supabase/migrations/` folder in your Supabase dashboard.

---

## 🔒 **Security Features**

- **Authentication**: JWT-based user authentication
- **Authorization**: Row Level Security (RLS) policies
- **Validation**: Zod schema validation for all inputs
- **Security Headers**: Helmet.js middleware
- **Rate Limiting**: Built-in request throttling
- **CORS**: Configurable cross-origin requests

---

## 📈 **Performance**

- **Serverless**: Vercel edge functions for global performance
- **Auto-scaling**: Handles traffic spikes automatically
- **Real-time**: Supabase real-time subscriptions
- **Caching**: Optimized database queries
- **Monitoring**: Built-in performance metrics

---

## 🛠️ **Development**

### **Project Structure**
```
api-server/
├── index.js                 # Main server entry point
├── package.json             # Dependencies & scripts
├── vercel.json              # Vercel deployment config
├── src/                     # Source code
│   ├── controllers/         # Route handlers
│   ├── services/            # Business logic
│   ├── routes/             # API routes
│   ├── middleware/          # Express middleware
│   ├── validation/         # Request validation schemas
│   ├── utils/              # Helper utilities
│   └── types/              # TypeScript type definitions
├── docs/                   # API documentation
├── scripts/                # Development scripts
└── supabase/               # Database migrations
```

### **Available Scripts**
```bash
npm start          # Start production server
npm run test       # Run API tests
npm run build      # Build TypeScript
npm run lint       # Lint code
```

---

## 🌐 **Deployment**

### **Vercel Deployment**
This API server is optimized for Vercel serverless deployment:

1. **Import Repository**: Connect your GitHub repo to Vercel
2. **Configure Build**: Set root directory to `api-server/`
3. **Environment Variables**: Add Supabase credentials
4. **Deploy**: Automatic deployment on push

### **Environment Setup**
Ensure all required environment variables are set in Vercel dashboard.

---

## 📞 **Support**

- **Issues**: Create GitHub issues for bugs or feature requests
- **Documentation**: See `docs/` folder for detailed guides
- **API Reference**: Available at `/` endpoint when running

---

## 📜 **License**

MIT License - See LICENSE file for details

---

**🚀 Ready for production with enterprise-grade security and performance!**
