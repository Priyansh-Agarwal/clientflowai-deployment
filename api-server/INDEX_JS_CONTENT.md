# 📄 Copy this content to: api-server/index.js

```javascript
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://gmpsdeenhdtvbxjungxl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcHNkZWVuaGR0dmJ4anVuZ3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTUzMDY2OCwiZXhwIjoyMDc1MTA2NjY4fQ.kIXgTLe10v3gRLtEYfeEJz8dHXZMuWARnUty6wNItHI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('businesses').select('id').limit(1);
    const dbStatus = error ? 'disconnected' : 'connected';
    res.status(200).json({
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      message: 'ClientFlow AI Suite API is healthy'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during health check',
      details: error.message
    });
  }
});

// Root endpoint for API documentation/status
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ClientFlow AI Suite API!',
    description: 'Professional CRM API with Supabase integration',
    endpoints: {
      health: '/health',
      businesses: '/api/businesses',
      customers: '/api/customers',
      appointments: '/api/appointments',
      analytics: '/api/analytics/dashboard'
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Businesses API
app.get('/api/businesses', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .limit(10);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      message: '🏢 Businesses retrieved successfully!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Businesses API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch businesses',
      error: error.message,
    });
  }
});

// Customers API
app.get('/api/customers', async (req, res) => {
  try {
    const business_id = req.query.business_id;
    
    let query = supabase.from('customers').select('*, businesses!inner(*)');
    
    if (business_id) {
      query = query.eq('business_id', business_id);
    }
    
    const { data, error } = await query.limit(10);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      message : '👥 Customers retrieved successfully!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Customers API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message,
    });
  }
});

// Create Customer API
app.post('/api/customers', async (req, res) => {
  try {
    const { business_id, name, phone, email } = req.body;

    if (!business_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Business ID and name are required'
      });
    }

    // Split name into first and last name
    const nameParts = name.split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          business_id,
          first_name,
          last_name,
          phone,
          email,
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
      message: '✅ Customer created successfully!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message,
    });
  }
});

// Analytics API
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    // Get basic stats
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id')
      .limit(1000);

    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .limit(1000);

    if (businessesError || customersError) {
      throw businessesError || customersError;
    }

    res.status(200).json({
      success: true,
      data: {
        total_businesses: businesses?.length || 0,
        total_customers: customers?.length || 0,
        active_customers: customers?.length || 0,
        conversion_rate: 0,
        monthly_revenue: 0,
        weekly_analytics: {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0
        }
      },
      message: '📊 Dashboard analytics retrieved successfully!',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('businesses').select('*').limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: '🎉 Supabase connection test successful!',
      demo_business_data: data?.[0] || 'No business data',
      database_message: error ? 'Database connection issue' : 'Database connected',
      timestamp: new Date().toISOString(),
      environment: {
        supabase_url: supabaseUrl ? 'SET' : 'NOT SET',
        service_role_key: supabaseKey ? 'SET' : 'NOT SET',
        node_env: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({
      success: false,
      message: 'API test failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Generic error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: err.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    requested_url: req.originalUrl,
    available_endpoints: [
      '/health',
      '/api/businesses',
      '/api/customers', 
      '/api/analytics/dashboard',
      '/api/test'
    ],
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 ClientFlow AI Suite API Server');
  console.log('====================================');
  console.log('✅ Server running on port ${port}');
  console.log('🌐 Health: http://localhost:${port}/health');
  console.log('👔 API Docs: http://localhost:${port}/');
  console.log('📊 Test: http://localhost:${port}/api/test');
  console.log('====================================');
});

// Export for Vercel
module.exports = app;
```
