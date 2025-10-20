import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Contact schemas
export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  tags: z.array(z.string()).default([]),
});

export const updateContactSchema = createContactSchema.partial();

export const contactQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  tags: z.string().optional(),
});

// Deal schemas
export const dealStageSchema = z.enum(['lead', 'qualified', 'proposal', 'won', 'lost']);

export const createDealSchema = z.object({
  contactId: uuidSchema,
  title: z.string().min(1).max(200),
  stage: dealStageSchema,
  valueCents: z.number().int().min(0),
  currency: z.string().length(3).default('USD'),
});

export const updateDealSchema = createDealSchema.partial();

export const dealQuerySchema = paginationSchema.extend({
  stage: dealStageSchema.optional(),
  contactId: uuidSchema.optional(),
  minValue: z.coerce.number().int().min(0).optional(),
  maxValue: z.coerce.number().int().min(0).optional(),
});

// Activity schemas
export const activityTypeSchema = z.enum(['note', 'call', 'sms', 'email', 'task']);

export const createActivitySchema = z.object({
  contactId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  type: activityTypeSchema,
  content: z.string().min(1).max(5000),
  meta: z.record(z.any()).optional(),
});

export const updateActivitySchema = createActivitySchema.partial();

export const activityQuerySchema = paginationSchema.extend({
  type: activityTypeSchema.optional(),
  contactId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
});

// Appointment schemas
export const appointmentStatusSchema = z.enum(['pending', 'confirmed', 'completed', 'no_show', 'canceled']);

export const createAppointmentSchema = z.object({
  contactId: uuidSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: appointmentStatusSchema.default('pending'),
  location: z.string().max(200).optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export const appointmentQuerySchema = paginationSchema.extend({
  contactId: uuidSchema.optional(),
  status: appointmentStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Message schemas
export const messageDirectionSchema = z.enum(['inbound', 'outbound']);
export const messageChannelSchema = z.enum(['sms', 'email', 'whatsapp']);

export const sendMessageSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1).max(1600),
  channel: messageChannelSchema,
  meta: z.record(z.any()).optional(),
});

// Metrics schemas
export const metricsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Automation schemas
export const testAutomationSchema = z.object({
  config: z.record(z.any()),
  testData: z.record(z.any()).optional(),
});

// Webhook schemas
export const webhookParamsSchema = z.object({
  provider: z.enum(['stripe', 'twilio', 'sendgrid', 'gcal']),
});

// Common response schemas
export const errorResponseSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })).optional(),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  data: z.array(dataSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

