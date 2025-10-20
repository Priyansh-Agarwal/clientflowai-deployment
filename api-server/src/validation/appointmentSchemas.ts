import { z } from 'zod';
import moment from 'moment';

// Appointment status enum
export const AppointmentStatus = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
export type AppointmentStatusType = typeof AppointmentStatus[number];

// Create appointment schema
export const createAppointmentSchema = z.object({
  customer_id: z.string()
    .uuid('Invalid customer ID format')
    .optional()
    .or(z.null()),
  
  customer_name: z.string()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Customer name contains invalid characters'),
  
  customer_phone: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(15, 'Phone number must be less than 15 characters')
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format'),
  
  customer_email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  
  customer_notes: z.string()
    .max(500, 'Customer notes must be less than 500 characters')
    .optional(),
  
  service_id: z.string()
    .uuid('Invalid service ID format')
    .optional()
    .or(z.null()),
  
  service_name: z.string()
    .min(1, 'Service name is required')
    .max(100, 'Service name must be less than 100 characters'),
  
  scheduled_at: z.string()
    .datetime('Invalid datetime format')
    .refine((date) => {
      const appointmentDate = new Date(date);
      const now = new Date();
      // Allow appointments starting from now
      return appointmentDate >= now;
    }, 'Appointment must be scheduled for a future time'),
  
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum appointment duration is 15 minutes')
    .max(480, 'Maximum appointment duration is 8 hours')
    .default(60),
  
  total_price: z.number()
    .positive('Total price must be positive')
    .max(10000, 'Total price must be less than $10,000')
    .optional(),
  
  payment_method: z.enum(['cash', 'card', 'check', 'online', 'subscription'])
    .optional(),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  
  internal_notes: z.string()
    .max(1000, 'Internal notes must be less than 1000 characters')
    .optional(),
  
  metadata: z.object({
    source: z.string().optional(), // 'website', 'phone', 'walk_in', etc.
    preferences: z.object({
      reminder_sms: z.boolean().default(true),
      reminder_email: z.boolean().default(true),
      confirmation_sms: z.boolean().default(true),
      language: z.string().default('en'),
      timezone: z.string().optional(),
    }).optional(),
    external_data: z.record(z.any()).optional(),
  }).optional(),
});

// Update appointment schema (most fields optional)
export const updateAppointmentSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
  
  customer_name: z.string()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Customer name contains invalid characters')
    .optional(),
  
  customer_phone: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(15, 'Phone number must be less than 15 characters')
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format')
    .optional(),
  
  customer_email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  
  customer_notes: z.string()
    .max(500, 'Customer notes must be less than 500 characters')
    .optional(),
  
  service_id: z.string().uuid('Invalid service ID format').optional(),
  
  service_name: z.string()
    .min(1, 'Service name must be specified')
    .max(100, 'Service name must be less than 100 characters')
    .optional(),
  
  scheduled_at: z.string()
    .datetime('Invalid datetime format')
    .refine((date) => {
      const appointmentDate = new Date(date);
      const now = new Date();
      return appointmentDate >= now;
    }, 'Appointment must be scheduled for a future time')
    .optional(),
  
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum appointment duration is 15 minutes')
    .max(480, 'Maximum appointment duration is 8 hours')
    .optional(),
  
  total_price: z.number()
    .positive('Total price must be positive')
    .max(10000, 'Total price must be less than $10,000')
    .optional(),
  
  payment_method: z.enum(['cash', 'card', 'check', 'online', 'subscription'])
    .optional(),
  
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  
  internal_notes: z.string()
    .max(1000, 'Internal notes must be less than 1000 characters')
    .optional(),
});

// Status update schema (specialized endpoint)
export const updateAppointmentStatusSchema = z.object({
  status: z.enum(AppointmentStatus, {
    errorMap: () => ({ message: 'Status must be: pending, confirmed, completed, cancelled, or no_show' })
  }),
  
  cancellation_reason: z.string()
    .max(200, 'Cancellation reason must be less than 200 characters')
    .optional(),
  
  cancellation_fee: z.number()
    .nonnegative('Cancellation fee cannot be negative')
    .max(1000, 'Cancellation fee must be less than $1,000')
    .optional(),
  
  notes: z.string()
    .max(500, 'Status update notes must be less than 500 characters')
    .optional(),
});

// Query parameters schema for GET /appointments
export const getAppointmentsSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  
  // Date filtering
  start_date: z.string()
    .datetime('Invalid start date format')
    .optional(),
  
  end_date: z.string()
    .datetime('Invalid end date format')
    .optional(),
  
  // Status filtering
  status: z.enum(AppointmentStatus).optional(),
  
  // Customer filtering
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
  customer_search: z.string().max(100, 'Customer search term too long').optional(),
  
  // Service filtering
  service_id: z.string().uuid('Invalid service ID format').optional(),
  
  // Pagination
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('10'),
  
  // Sorting
  sort_by: z.enum(['scheduled_at', 'created_at', 'customer_name', 'service_name', 'status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  
  // Additional filters
  payment_status: z.enum(['pending', 'paid', 'refunded', 'failed']).optional(),
  
  include_cancelled: z.string().transform(val => val === 'true').optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type GetAppointmentsQuery = z.infer<typeof getAppointmentsSchema>;

// Utility function to validate business hours
export function isValidBusinessHour(dateStr: string, businessHours?: any): boolean {
  try {
    const appointmentTime = moment(dateStr);
    const dayOfWeek = appointmentTime.day(); // 0 = Sunday, 6 = Saturday
    
    // Default business hours if not provided
    const defaultHours = {
      1: { open: '09:00', close: '17:00' }, // Monday
      2: { open: '09:00', close: '17:00' }, // Tuesday
      3: { open: '09:00', close: '17:00' }, // Wednesday
      4: { open: '09:00', close: '17:00' }, // Thursday
      5: { open: '09:00', close: '17:00' }, // Friday
    };
    
    const hours = businessHours || defaultHours;
    
    if (!hours[dayOfWeek]) {
      return false; // Business closed on this day
    }
    
    const timeStr = appointmentTime.format('HH:mm');
    return timeStr >= hours[dayOfWeek].open && timeStr <= hours[dayOfWeek].close;
  } catch {
    return false;
  }
}

// Utility function to calculate end time
export function calculateEndTime(scheduledAt: string, durationMinutes: number): string {
  const start = moment(scheduledAt);
  const end = start.clone().add(durationMinutes, 'minutes');
  return end.toISOString();
}
