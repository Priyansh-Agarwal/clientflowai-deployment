// Vercel serverless function entry point - Optimized for Vercel
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Initialize Express app
const app = express();

// Basic middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase client
let supabase = null;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
} catch (error) {
  console.error('Supabase initialization error:', error);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ClientFlow AI Suite API',
    version: '1.0.0',
    status: 'Live',
    environment: process.env.NODE_ENV || 'production',
    endpoints: {
      health: '/api/health',
      businesses: '/api/businesses',
      customers: '/api/customers',
      test: '/api/test'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: supabase ? 'Connected' : 'Disconnected'
  });
});

// Businesses endpoint
app.get('/api/businesses', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not connected'
      });
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name, slug, phone, email, status, created_at')
      .limit(50);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'Businesses retrieved successfully',
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Customers endpoint
app.get('/api/customers', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not connected'
      });
    }

    const { data, error } = await supabase
      .from('customers')
      .select('id, business_id, first_name, last_name, phone, email, source, created_at')
      .limit(50);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      message: 'Customers retrieved successfully',
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Create customer endpoint
app.post('/api/customers', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not connected'
      });
    }

    const { business_id, first_name, last_name, phone, email, source } = req.body;
    
    if (!business_id || !first_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: business_id and first_name are required'
      });
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        business_id,
        first_name,
        last_name: last_name || '',
        phone: phone || '',
        email: email || '',
        source: source || 'api'
      }])
      .select();
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create customer',
        details: error.message
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Supabase client not initialized',
        environment: process.env.NODE_ENV || 'production'
      });
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name')
      .limit(1);
    
    res.json({
      success: true,
      message: '🎉 ClientFlow AI Suite API is working!',
      database_status: error ? 'Query failed' : 'Connected ✅',
      demo_business: data?.[0]?.business_name || 'Demo Business',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      endpoints: [
        'GET /api/health',
        'GET /api/businesses', 
        'GET /api/customers',
        'POST /api/customers',
        'GET /api/test'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message,
      environment: process.env.NODE_ENV || 'production'
    });
  }
});

// Catch-all 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/businesses',
      'GET /api/customers', 
      'POST /api/customers',
      'GET /api/test'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Export for Vercel
module.exports = app;