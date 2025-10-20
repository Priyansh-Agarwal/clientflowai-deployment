# 🗄️ **Supabase Quick Setup Guide**

Since the ClientFlow AI Suite requires a database, we need to set up Supabase first. Here's the fast track:

---

## 🚀 **Step-by-Step Supabase Setup**

### **Step 1: Create Supabase Project**

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** → **"New project"**
3. Choose your organization
4. Project name: `clientflow-ai-suite`
5. Database password: **Generate a secure password** (save it!)
6. Region: Choose closest to your users
7. Click **"Create new project"**
8. Wait 2-3 minutes for setup

### **Step 2: Get Your Database URL and Keys**

Once project is ready:

1. Go to **Project Settings** → **API**
2. Copy these **THREE** values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (long JWT token)
   - **service_role secret** key (long JWT token)

### **Step 3: Apply Database Schema**

1. Go to **SQL Editor** in Supabase Dashboard
2. Create a **New Query**
3. Copy and paste **ALL** the SQL from `supabase/migrations/001_core_tables.sql`
4. Click **Run** ✅
5. Do the same for all migration files:
   - `005_notifications_table.sql`
   - `006_storage_setup.sql`
   - `007_webhook_logs_table.sql`

### **Step 4: Enable Authentication**

1. Go to **Authentication** → **Settings**
2. Set **Site URL**: `http://localhost:3000`
3. Under **Auth Providers**, make sure **Email** is enabled
4. Save settings

### **Step 5: Create Initial Business Data**

Run this SQL to create demo data:

```sql
-- Create demo organization and business
UPDATE businesses 
SET id='11111111-1111-1111-1111-111111111111'
WHERE business_name='Demo Business';

-- Create demo customer
INSERT INTO customers (id, business_id, first_name, phone, email, source)
VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'John Doe',
  '+1234567890',
  'john.doe@example.com',
  'demo'
);
```

---

## 🔧 **Configure Local Environment**

Now update your `.env` file:

```bash
# Copy from our example
cp env.example .env
```

Then edit `.env` with your Supabase values:

```bash
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here  
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
JWT_SECRET=your_secure_random_string_at_least_32_characters_long_here
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

## ✅ **Test Connection**

Run this to test your Supabase connection:

```bash
npm run dev
```

Then test in browser:
- http://localhost:3001/health
- http://localhost:3001/api

**Success indicators:**
- ✅ Server starts without errors
- ✅ Health endpoint returns `{"status":"OK"}`
- ✅ API docs show all available endpoints

---

## 🎯 **Next Steps**

Once Supabase is configured:

1. **Test Authentication**: Try accessing protected endpoints
2. **Test API Endpoints**: Create customers, appointments, etc.
3. **Test File Uploads**: Upload files to test storage
4. **Test Webhooks**: Test external integrations

**Ready for Supabase setup? Let me know when you've completed these steps!** 🚀
