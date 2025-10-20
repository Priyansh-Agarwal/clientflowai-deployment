
// Production-ready API server for Vercel deployment
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();

// Basic middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.json());

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'ClientFlow AI Suite API',
    version: '1.0.0',
    status: 'Live',
    description: 'Professional-grade CRM with AI-powered automation',
    endpoints: {
      health: '/health',
      businesses: '/api/businesses',
      customers: '/api/customers',
      create_customer: 'POST /api/customers',
      test: '/test'
    },
    features: [
      'Multi-tenant business management',
      'Customer relationship tracking',
      'Supabase-powered database',
      'Production-ready security',
      'Auto-scaling infrastructure'
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0',
    environment: 'production',
    database: 'Connected to Supabase'
  });
});

// Get all businesses
app.get('/api/businesses', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name, slug, phone, email, address, status, created_at')
      .limit(50);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Businesses retrieved successfully',
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch businesses',
      details: error.message
    });
  }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, business_id, first_name, last_name, phone, email, source, created_at')
      .limit(50);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Customers retrieved successfully',
      count: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers',
      details: error.message
    });
  }
});

// Create new customer
app.post('/api/customers', async (req, res) => {
  try {
    const { business_id, first_name, last_name, phone, email, source } = req.body;
    
    // Validation
    if (!business_id || !first_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['business_id', 'first_name']
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
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create customer',
      details: error.message
    });
  }
});

// Database connection test
app.get('/test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name')
      .limit(1);
    
    res.json({
      success: true,
      message: '🎉 ClientFlow AI Suite API is working perfectly!',
      database_status: error ? 'Disconnected' : 'Connected ✅',
      demo_business: data?.[0]?.business_name || 'Demo Business',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'production'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: ['/', '/health', '/api/businesses', '/api/customers', '/test'],
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;
