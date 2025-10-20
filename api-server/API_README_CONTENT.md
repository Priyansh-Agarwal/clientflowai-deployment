# 📚 Copy this content to: api-server/README.md

# 🚀 ClientFlow AI Suite - API Server

**Production-Ready CRM API with Supabase Integration**

---

## 🌟 Features

### 🏢 Business Management
- Multi-tenant architecture
- Business profile management
- Team member roles and permissions

### 👥 Customer Relationship Management
- Customer profiles with contact information
- Service management and pricing
- Appointment scheduling system

### 💼 Communication & Automation
- SMS/Call integration ready
- Conversation threading
- Automated notifications
- Webhook integrations

### 📊 Analytics & Reporting
- Real-time dashboard metrics
- Revenue tracking
- Customer engagement analytics
- Performance monitoring

---

## �                        .

### Prerequisites
- Node.js 18+
- Supabase account

### Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm start
```

### Production Start
```bash
npm start
```

---

## 📚 API Documentation

### Base URL
- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.vercel.app`

### Core Endpoints

#### Health Check
```http
GET /health
```
Returns API health status and database connection status.

#### API Documentation
```http
GET /
```
Returns complete API documentation and available endpoints.

#### Businesses
```http
GET /api/businesses
```
Retrieve list of businesses.

#### Customers
```http
GET /api/customers?business_id=...
POST /api/customers
```
Manage customer data.

#### Analytics
```http
GET /api/analytics/dashboard
```
Retrieve dashboard metrics and analytics.

#### Test Connection
```http
GET /api/test
```
Test Supabase database connection.

---

## ⚙️ Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
PORT=3001
```

---

## 🔧 Configuration

### Database Setup
1. Create your Supabase project
2. Run the migrations from `supabase/migrations/` folder
3. Enable Row Level Security (RLS)
4. Configure environment variables

### Production Deployment
1. Deploy to Vercel
2. Add environment variables in Vercel dashboard
3. Test all endpoints

---

## 📈 Performance Features

- **Serverless**: Vercel edge functions for global performance
- **Auto-scaling**: Handles traffic spikes automatically
- **Real-time**: Supabase real-time subscriptions
- **Security**: Row Level Security (RLS) policies
- **Validation**: Input validation and error handling

---

## 🔒 Security

- JWT-based authentication
- Row Level Security (RLS) policies
- Input validation and sanitization
- CORS configuration
- Rate limiting

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel Serverless
- **Language**: JavaScript ES6+

---

## 📞 Support

- **Issues**: Create GitHub issues
- **Documentation**: See `docs/` folder
- **API Reference**: Available at `/` endpoint when running

---

## 📜 License

MIT License - Feel free to use in your projects!

---

## 🎯 Production Ready

✅ **Multi-tenant architecture**  
✅ **Automated CI/CD pipeline**  
✅ **Global deployment with Vercel**  
✅ **Enterprise-grade security**  
✅ **Real-time monitoring**  
✅ **Comprehensive documentation**  

**Deploy your professional CRM API in minutes!** ⚡✨
