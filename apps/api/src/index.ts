// Initialize telemetry and Sentry first
import './config/telemetry';
import './config/sentry';

import app from './config/server';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './config/logger';

// Import routes
import customersRouter from './routes/customers';
import appointmentsRouter from './routes/appointments';
import conversationsRouter from './routes/conversations';
import callsRouter from './routes/calls';
import reviewsRouter from './routes/reviews';
import servicesRouter from './routes/services';
import analyticsRouter from './routes/analytics';
import teamMembersRouter from './routes/teamMembers';
import uploadRouter from './routes/upload';
import notificationsRouter from './routes/notifications';
import webhooksRouter from './routes/webhooks';
import crmRouter from './routes/crm';
import automationsRouter from './routes/automations';
import healthRouter from './routes/health';
import messagesRouter from './routes/messages';
import slaRouter from './routes/sla';

const PORT = process.env.PORT || 4000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/customers', customersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/team-members', teamMembersRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/crm', crmRouter);
app.use('/api/automations', automationsRouter);
app.use('/api', messagesRouter);
app.use('/api', slaRouter);
app.use('/', healthRouter);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ClientFlow CRM API',
    version: '1.0.0',
    endpoints: {
      health: {
        'GET /health': 'Health check',
        'GET /ready': 'Readiness check',
      },
      crm: {
        'GET /api/crm/contacts': 'List contacts',
        'POST /api/crm/contacts': 'Create contact',
        'GET /api/crm/contacts/:id': 'Get contact',
        'PUT /api/crm/contacts/:id': 'Update contact',
        'DELETE /api/crm/contacts/:id': 'Delete contact',
        'GET /api/crm/deals': 'List deals',
        'POST /api/crm/deals': 'Create deal',
        'PUT /api/crm/deals/:id': 'Update deal',
        'DELETE /api/crm/deals/:id': 'Delete deal',
      },
      messages: {
        'POST /api/messages/outbound': 'Send SMS or email messages',
      },
      appointments: {
        'GET /api/appointments?window=next_24h': 'Get appointments in next 24 hours',
        'GET /api/appointments?status=completed&within=1d': 'Get completed appointments within 1 day',
      },
      sla: {
        'GET /api/sla/unanswered?minutes=5': 'Get unanswered conversations for SLA monitoring',
      },
      automations: {
        'POST /api/automations/sms_inbound': 'SMS inbound proxy',
        'POST /api/automations/email_inbound': 'Email inbound proxy',
        'POST /api/automations/run': 'Run automation',
        'GET /api/automations/presets': 'Get automation presets',
        'POST /api/automations/test': 'Test automation',
      },
      webhooks: {
        'POST /api/webhooks/stripe': 'Stripe webhook',
        'POST /api/webhooks/twilio': 'Twilio webhook',
        'POST /api/webhooks/sendgrid-inbound': 'SendGrid inbound webhook',
        'POST /api/webhooks/gcal': 'Google Calendar webhook',
      },
    },
    authentication: 'Bearer token required for all endpoints (except webhooks)',
  });
});

// 404 handler for undefined routes
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
  });
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Ready check: http://localhost:${PORT}/ready`);
  console.log(`📚 API docs: http://localhost:${PORT}/api`);
  console.log(`💼 CRM endpoints: http://localhost:${PORT}/api/crm`);
  console.log(`🤖 Automation endpoints: http://localhost:${PORT}/api/automations`);
  console.log(`🪝 Webhook endpoints: http://localhost:${PORT}/api/webhooks`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n🛠️  Development mode enabled`);
    console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
