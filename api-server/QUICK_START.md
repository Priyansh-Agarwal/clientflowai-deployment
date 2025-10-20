# ⚡ **QUICK START - Get Running in 5 Minutes**

### **🚨 IMMEDIATE STEPS:**

## **1. Get Supabase Credentials** (2 minutes)
1. Go to [supabase.com](https://supabase.com) 
2. Sign up → Create New Project → Name: `clientflow-ai-suite`
3. Copy these from **Project Settings → API**:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`  
   - **service_role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## **2. Configure Environment** (30 seconds)
The `.env` file was just created! Edit it with your Supabase values:

```bash
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here  
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
JWT_SECRET=test_jwt_secret_for_local_development_change_in_production_32_chars_minimum_here
PORT=3001
NODE_ENV=development
```

## **3. Run Database Setup** (1 minute)
In Supabase Dashboard:
1. Go to **SQL Editor** → **New Query**
2. Copy/paste this SIMPLIFIED SQL (start with essentials):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    settings JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create demo business
INSERT INTO businesses (id, name, slug, phone, email) 
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Demo Business',
    'demo-business', 
    '+1234567890',
    'demo@business.com'
);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Allow all access for demo (restrict in production)
CREATE POLICY "allow_all_for_demo" ON businesses FOR ALL USING (true);

SELECT 'Setup complete!' as status;
```

## **4. Test Locally** (30 seconds)

```bash
npm run dev
```

**Should see:** `🚀 Server running on port 3001`

## **5. Verify API Works**

Open these URLs:
- http://localhost:3001/health ← Should show `{"status":"OK"}`
- http://localhost:3001/api ← Should show API documentation

---

## ✅ **SUCCESS INDICATORS:**

✅ Server starts without errors  
✅ Health endpoint returns 200 OK  
✅ API documentation accessible  
✅ No database connection errors

---

## 🚀 **READY FOR PRODUCTION?**

Once local test passes:
1. ✅ Configure production environment variables
2. ✅ Set up production domain and SSL
3. ✅ Deploy with Docker/Kubernetes
4. ✅ Set up monitoring and alerts

**Let me know when Supabase setup is done and I'll help with the next steps!** 🎉
