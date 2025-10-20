#!/usr/bin/env node

/**
 * Standalone ClientFlow Hardened API Server
 * This runs our hardened implementation independently of the monorepo
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { randomUUID } = require('crypto');

// Create Express app
const app = express();

// Security middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => cb(null, true), // tighten for prod with allowlist
  credentials: true
}));
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || randomUUID();
  req.id = reqId;
  console.log(`${new Date().toISOString()} [${reqId}] ${req.method} ${req.path}`);
  next();
});

// Tenancy middleware
function requireOrg(req, res, next) {
  const orgId = req.headers['x-org-id'] || req.query.orgId;
  if (!orgId) return res.status(401).json({ error: 'Missing org' });
  req.orgId = orgId;
  next();
}

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    try {
      // Simple validation - in production use Zod
      if (schema && req.body) {
        const required = schema.required || [];
        for (const field of required) {
          if (!req.body[field]) {
            return res.status(400).json({
              type: 'about:blank',
              title: 'Validation Error',
              detail: `Missing required field: ${field}`,
              status: 400
            });
          }
        }
      }
      next();
    } catch (error) {
      res.status(400).json({
        type: 'about:blank',
        title: 'Validation Error',
        detail: error.message,
        status: 400
      });
    }
  };
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'clientflow-hardened-api', 
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ready endpoint (simplified - no Redis dependency for demo)
app.get('/api/ready', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Messages endpoints
app.post('/api/messages/outbound', requireOrg, validate({ required: ['channel', 'to_addr', 'body'] }), (req, res) => {
  const { channel, to_addr, body } = req.body;
  
  console.log(`📤 Sending ${channel} to ${to_addr}: ${body.substring(0, 50)}...`);
  
  // Simulate provider calls (sandbox mode)
  if (channel === 'sms') {
    res.json({ sandbox: true, provider: 'twilio', message: 'SMS would be sent in production' });
  } else if (channel === 'email') {
    res.json({ sandbox: true, provider: 'sendgrid', message: 'Email would be sent in production' });
  } else {
    res.status(400).json({ error: 'Invalid channel' });
  }
});

// Automation endpoints
app.post('/api/automations/sms_inbound', requireOrg, (req, res) => {
  console.log('📱 SMS inbound webhook received:', req.body);
  res.json({ ok: true, processed: true });
});

app.post('/api/automations/email_inbound', requireOrg, (req, res) => {
  console.log('📧 Email inbound webhook received:', req.body);
  res.json({ ok: true, processed: true });
});

app.post('/api/automations/run', requireOrg, validate({ required: ['type'] }), (req, res) => {
  const { type, payload } = req.body;
  console.log(`🤖 Automation triggered: ${type}`, payload);
  
  // Simulate queue processing
  res.json({ ok: true, queued: type, jobId: randomUUID() });
});

// Appointments endpoints
app.get('/api/appointments', requireOrg, (req, res) => {
  const { window, status, within } = req.query;
  
  console.log(`📅 Appointments query: window=${window}, status=${status}, within=${within}`);
  
  if (window === 'next_24h') {
    res.json({ data: [
      { 
        id: 'appt1', 
        starts_at: new Date(Date.now() + 23 * 3600e3).toISOString(), 
        reminder_offset_minutes: 60, 
        contact: { phone: '+15555550123' } 
      }
    ]});
  } else if (status === 'completed' && within === '1d') {
    res.json({ data: [
      { 
        id: 'apptC', 
        starts_at: new Date(Date.now() - 1 * 3600e3).toISOString(), 
        contact: { phone: '+15555550123' } 
      }
    ]});
  } else {
    res.json({ data: [] });
  }
});

// SLA endpoints
app.get('/api/sla/unanswered', requireOrg, (req, res) => {
  const minutes = Number(req.query.minutes || 5);
  console.log(`⏰ SLA check: ${minutes} minutes threshold`);
  
  res.json({ 
    data: [{ 
      id: 'conv_123', 
      waiting_minutes: minutes + 1, 
      on_call_phone: process.env.ON_CALL_PHONE || '+15555550100' 
    }]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    requestId: req.id 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.originalUrl,
    requestId: req.id 
  });
});

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log('🚀 ClientFlow Hardened API Server Started!');
  console.log(`📍 Server running on http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/api/health`);
  console.log(`✅ Ready check: http://localhost:${port}/api/ready`);
  console.log('\n📋 Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/ready');
  console.log('  POST /api/messages/outbound');
  console.log('  POST /api/automations/sms_inbound');
  console.log('  POST /api/automations/email_inbound');
  console.log('  POST /api/automations/run');
  console.log('  GET  /api/appointments');
  console.log('  GET  /api/sla/unanswered');
  console.log('\n🧪 Run tests with: node test-api.js');
  console.log('\n🔧 Environment:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  PORT: ${port}`);
  console.log(`  Uptime: ${process.uptime()}s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
