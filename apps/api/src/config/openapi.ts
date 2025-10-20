import { createOpenApiSpec } from 'zod-to-openapi';
import { z } from 'zod';
import { createRouter } from 'zod-openapi';
import { Request, Response } from 'express';

// Define common schemas
const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.string().optional(),
  timestamp: z.string(),
  path: z.string(),
});

const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number(),
  pages: z.number(),
});

// Health endpoints
const HealthSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  uptime: z.number(),
  memory: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
  }),
});

const ReadinessSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  timestamp: z.string(),
  service: z.string(),
  checks: z.object({
    database: z.boolean(),
    redis: z.boolean(),
    environment: z.boolean(),
  }),
});

// Contact schemas
const ContactSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});

const CreateContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const UpdateContactSchema = CreateContactSchema.partial();

// Deal schemas
const DealSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  contactId: z.string().uuid(),
  title: z.string(),
  stage: z.enum(['lead', 'qualified', 'proposal', 'won', 'lost']),
  valueCents: z.number(),
  currency: z.string().default('USD'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const CreateDealSchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().min(1),
  stage: z.enum(['lead', 'qualified', 'proposal', 'won', 'lost']).default('lead'),
  valueCents: z.number().min(0),
  currency: z.string().default('USD'),
});

const UpdateDealSchema = CreateDealSchema.partial();

// Message schemas
const MessageSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  direction: z.enum(['inbound', 'outbound']),
  channel: z.enum(['sms', 'email', 'whatsapp']),
  toAddr: z.string(),
  fromAddr: z.string(),
  body: z.string(),
  meta: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
});

const SendMessageSchema = z.object({
  to: z.string(),
  body: z.string().min(1),
  channel: z.enum(['sms', 'email']),
});

// Automation schemas
const AutomationPresetSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  version: z.string(),
  schema: z.record(z.any()),
  defaultConfig: z.record(z.any()),
});

const RunAutomationSchema = z.object({
  type: z.string(),
  orgId: z.string().uuid(),
  payload: z.record(z.any()),
});

// Create OpenAPI router
const router = createRouter({
  openapi: '3.0.0',
  info: {
    title: 'ClientFlow API',
    version: '1.0.0',
    description: 'Professional CRM with AI-powered business automation',
    contact: {
      name: 'ClientFlow Support',
      email: 'support@clientflow.ai',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'https://api.clientflow.ai',
      description: 'Production server',
    },
    {
      url: 'http://localhost:4000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: ErrorSchema,
      Pagination: PaginationSchema,
      Health: HealthSchema,
      Readiness: ReadinessSchema,
      Contact: ContactSchema,
      CreateContact: CreateContactSchema,
      UpdateContact: UpdateContactSchema,
      Deal: DealSchema,
      CreateDeal: CreateDealSchema,
      UpdateDeal: UpdateDealSchema,
      Message: MessageSchema,
      SendMessage: SendMessageSchema,
      AutomationPreset: AutomationPresetSchema,
      RunAutomation: RunAutomationSchema,
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
});

// Health endpoints
router.openapi({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Health check',
  description: 'Returns the health status of the API service',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: HealthSchema,
        },
      },
    },
  },
}, (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'clientflow-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

router.openapi({
  method: 'get',
  path: '/ready',
  tags: ['Health'],
  summary: 'Readiness check',
  description: 'Returns the readiness status of the API service and its dependencies',
  responses: {
    200: {
      description: 'Service is ready',
      content: {
        'application/json': {
          schema: ReadinessSchema,
        },
      },
    },
    503: {
      description: 'Service is not ready',
      content: {
        'application/json': {
          schema: ReadinessSchema,
        },
      },
    },
  },
}, async (req: Request, res: Response) => {
  // This would be implemented with actual dependency checks
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    service: 'clientflow-api',
    checks: {
      database: true,
      redis: true,
      environment: true,
    },
  });
});

// Contact endpoints
router.openapi({
  method: 'get',
  path: '/api/contacts',
  tags: ['Contacts'],
  summary: 'List contacts',
  description: 'Get a paginated list of contacts for the organization',
  request: {
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      tags: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of contacts',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(ContactSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
  },
}, (req: Request, res: Response) => {
  // Implementation would go here
  res.json({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  });
});

router.openapi({
  method: 'post',
  path: '/api/contacts',
  tags: ['Contacts'],
  summary: 'Create contact',
  description: 'Create a new contact for the organization',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateContactSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Contact created successfully',
      content: {
        'application/json': {
          schema: ContactSchema,
        },
      },
    },
    400: {
      description: 'Invalid request data',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
}, (req: Request, res: Response) => {
  // Implementation would go here
  res.status(201).json({
    id: '123e4567-e89b-12d3-a456-426614174000',
    orgId: '123e4567-e89b-12d3-a456-426614174001',
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    tags: req.body.tags || [],
    createdAt: new Date().toISOString(),
  });
});

// Deal endpoints
router.openapi({
  method: 'get',
  path: '/api/deals',
  tags: ['Deals'],
  summary: 'List deals',
  description: 'Get a paginated list of deals for the organization',
  request: {
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      stage: z.enum(['lead', 'qualified', 'proposal', 'won', 'lost']).optional(),
      contactId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of deals',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(DealSchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
  },
}, (req: Request, res: Response) => {
  // Implementation would go here
  res.json({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  });
});

// Message endpoints
router.openapi({
  method: 'post',
  path: '/api/messages/outbound',
  tags: ['Messages'],
  summary: 'Send message',
  description: 'Send an outbound SMS or email message',
  request: {
    body: {
      content: {
        'application/json': {
          schema: SendMessageSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Message sent successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            messageId: z.string().optional(),
            error: z.string().optional(),
          }),
        },
      },
    },
  },
}, (req: Request, res: Response) => {
  // Implementation would go here
  res.json({
    success: true,
    messageId: 'msg_123456789',
  });
});

// Automation endpoints
router.openapi({
  method: 'get',
  path: '/api/automations/presets',
  tags: ['Automations'],
  summary: 'Get automation presets',
  description: 'Get available automation presets and their schemas',
  responses: {
    200: {
      description: 'List of automation presets',
      content: {
        'application/json': {
          schema: z.array(AutomationPresetSchema),
        },
      },
    },
  },
}, (req: Request, res: Response) => {
  // Implementation would load presets from files
  res.json([]);
});

router.openapi({
  method: 'post',
  path: '/api/automations/run',
  tags: ['Automations'],
  summary: 'Run automation',
  description: 'Execute an automation workflow',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RunAutomationSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Automation queued successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            jobId: z.string().optional(),
            error: z.string().optional(),
          }),
        },
      },
    },
  },
}, (req: Request, res: Response) => {
  // Implementation would enqueue the automation job
  res.json({
    success: true,
    jobId: 'job_123456789',
  });
});

// Generate OpenAPI spec
const spec = createOpenApiSpec(router, {
  openapi: '3.0.0',
  info: {
    title: 'ClientFlow API',
    version: '1.0.0',
    description: 'Professional CRM with AI-powered business automation',
  },
});

export { router, spec };
export default router;
