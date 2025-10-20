import { z } from 'zod';

// Create customer schema
export const createCustomerSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(15, 'Phone number must be less than 15 characters')
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format'),
  
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  
  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('')),
  
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'])
    .optional(),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  
  lead_source: z.string()
    .max(100, 'Lead source must be less than 100 characters')
    .optional(),
  
  preferences: z.object({
    communication_method: z.enum(['email', 'phone', 'sms', 'whatsapp']).optional(),
    language: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    other: z.record(z.any()).optional(),
  }).optional(),
  
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

// Update customer schema (all fields optional except id)
export const updateCustomerSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters')
    .optional(),
  
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters')
    .optional(),
  
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('').or(z.null())),
  
  phone: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(15, 'Phone number must be less than 15 characters')
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format')
    .optional(),
  
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  
  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional()
    .or(z.literal('').or(z.null())),
  
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'])
    .optional(),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  
  lead_source: z.string().max(100, 'Lead source must be less than 100 characters').optional(),
  
  preferences: z.object({
    communication_method: z.enum(['email', 'phone', 'sms', 'whatsapp']).optional(),
    language: z.string().max(10).optional(),
    timezone: z.string().max(50).optional(),
    other: z.record(z.any()).optional(),
  }).optional(),
  
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

// Query parameters schema for GET /customers
export const getCustomersSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('10'),
  sort_by: z.enum(['first_name', 'last_name', 'email', 'phone', 'created_at', 'last_interaction_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type GetCustomersQuery = z.infer<typeof getCustomersSchema>;
