import { z } from 'zod';
import crypto from 'crypto';

// Webhook source validation
export const WebhookSource = z.enum([
  'twilio',
  'google-calendar', 
  'sms-provider',
  'review-platforms'
]);

// Twilio webhook payload schema
export const TwilioWebhookSchema = z.object({
  CallSid: z.string().min(1, 'CallSid is required'),
  CallStatus: z.enum([
    'ringing',
    'initiated',
    'answered', 
    'completed',
    'busy',
    'failed',
    'no-answer'
  ]).optional(),
  CallDirection: z.enum(['inbound', 'outbound']).optional(),
  From: z.string().nullable().optional(),
  To: z.string().nullable().optional(),
  CallDuration: z.string().nullable().optional(),
  RecordingUrl: z.string().url().nullable().optional(),
  TranscriptionText: z.string().nullable().optional(),
  AccountSid: z.string().optional(),
  ApiVersion: z.string().optional(),
  ApplicationSid: z.string().nullable().optional(),
  AnsweredBy: z.string().nullable().optional(),
  CallerName: z.string().nullable().optional(),
  Direction: z.string().nullable().optional(),
  ForwardedFrom: z.string().nullable().optional(),
  ParentCallSid: z.string().nullable().optional(),
  StartTime: z.string().optional(),
  EndTime: z.string().optional()
});

// SMS Provider webhook payload schema  
export const SMSProviderWebhookSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  status: z.enum([
    'sent',
    'delivered', 
    'failed',
    'rejected',
    'expired',
    'unknown'
  ]),
  deliveryStatus: z.enum([
    'pending',
    'delivered',
    'failed',
    'undelivered',
    'rejected',
    'expired'
  ]).optional(),
  errorCode: z.string().nullable().optional(),
  timestamp: z.string().datetime().optional(),
  phoneNumber: z.string().optional(),
  messageText: z.string().nullable().optional(),
  supplierReference: z.string().optional(),
  cost: z.string().nullable().optional(),
  currency: z.string().optional()
});

// Google Calendar webhook payload schema
export const GoogleCalendarWebhookSchema = z.object({
  kind: z.literal('calendar#event').optional(),
  etag: z.string().optional(),
  id: z.string().min(1, 'Event ID is required'),
  summary: z.string().min(1, 'Event summary is required'),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string().default('UTC'),
    date: z.string().optional()
  }).nullable().optional(),
  end: z.object({
    dateTime: z.string().datetime(), 
    timeZone: z.string().default('UTC'),
    date: z.string().optional()
  }).nullable().optional(),
  attendees: z.array(z.object({
    id: z.string().nullable().optional(),
    email: z.string().email().optional(),
    displayName: z.string().nullable().optional(),
    organizer: z.boolean().optional(),
    self: z.boolean().optional(),
    resource: z.boolean().optional(),
    optional: z.boolean().optional(),
    responseStatus: z.enum(['accepted', 'declined', 'tentative', 'needsAction']).optional(),
    comment: z.string().nullable().optional(),
    additionalGuests: z.number().optional()
  })).optional(),
  creator: z.object({
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    self: z.boolean().optional()
  }).nullable().optional(),
  organizer: z.object({
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    self: z.boolean().optional()
  }).nullable().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  htmlLink: z.string().url().nullable().optional(),
  created: z.string().datetime().optional(),
  updated: z.string().datetime().optional(),
  sequence: z.number().optional(),
  transparency: z.enum(['opaque', 'transparent']).optional(),
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
  iCalUID: z.string().optional(),
  recurringEventId: z.string().nullable().optional()
});

// Review Platform webhook payload schema
export const ReviewPlatformWebhookSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  reviewerName: z.string().min(1, 'Reviewer name is required'),
  reviewRating: z.number().min(1).max(5, 'Rating must be between 1-5'),
  reviewText: z.string().nullable().optional(),
  reviewDate: z.string().datetime(),
  platform: z.enum(['google', 'yelp', 'facebook', 'tripadvisor', 'other']),
  businessId: z.string().min(1, 'Business ID is required'),
  businessName: z.string().optional(),
  responseText: z.string().nullable().optional(),
  responseDate: z.string().datetime().nullable().optional(),
  reviewUrl: z.string().url().nullable().optional(),
  reviewerProfileUrl: z.string().url().nullable().optional(),
  verifiedPurchase: z.boolean().optional(),
  language: z.string().default('en').optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional()
});

// Webhook signature verification utilities
export class WebhookSignatureVerifier {
  /**
   * Verify Twilio webhook signature
   */
  static verifyTwilioSignature(
    payload: string,
    signature: string,
    authToken: string,
    url: string
  ): boolean {
    // Remove TwilioSignature from signature param if present
    const cleanSignature = signature.replace('TwilioSignature=', '');
    
    // Create the base string for verification
    const baseString = url + payload;
    
    // Create HMAC SHA1 hash
    const hmac = crypto.createHmac('sha1', authToken);
    hmac.update(baseString);
    const expectedSignature = hmac.digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify Google Calendar webhook signature
   */
  static verifyGoogleSignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp: string
  ): boolean {
    // Create verification string: timestamp + payload
    const verifiedString = timestamp + payload;
    
    // Create HMAC SHA256 hash
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(verifiedString);
    const expectedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify custom webhook signature (for SMS providers)
   */
  static verifyCustomSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): boolean {
    try {
      const hmac = crypto.createHmac(algorithm, secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature?.toLowerCase() || ''),
        Buffer.from(expectedSignature?.toLowerCase() || '')
      );
    } catch (error) {
      console.error('Error verifying custom signature:', error);
      return false;
    }
  }

  /**
   * Verify webhook payload hasn't expired
   */
  static verifyTimestamp(timestamp: string, maxAge: number = 300): boolean {
    const now = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp) || 0;
    
    return (now - webhookTime) <= maxAge;
  }
}

// Webhook event processing types
export const WebhookEventStatus = z.enum([
  'pending',
  'processing', 
  'completed',
  'failed',
  'retrying'
]);

export const WebhookRetryConfig = z.object({
  maxRetries: z.number().default(3),
  retryDelay: z.number().default(5000), // milliseconds
  backoffMultiplier: z.number().default(2),
  maxDelay: z.number().default(30000) // milliseconds
});

// Business ID resolution utilities
export function resolveBusinessId(
  phoneNumber?: string,
  email?: string, 
  businessId?: string
): string | null {
  // Priority: explicit businessId > phoneNumber lookup > email lookup
  if (businessId) return businessId;
  
  // This would typically involve database lookups
  // For now, returning null to indicate lookup needed
  return null;
}

export function extractPhoneNumber(input: string): string {
  // Remove all non-digit characters except +
  return input.replace(/[^\d+]/g, '');
}

export function normalizeEmail(input: string): string {
  return input.toLowerCase().trim();
}

// Error handling utilities  
export function createWebhookError(
  type: string,
  message: string,
  details?: any
): { type: string; message: string; details?: any } {
  return {
    type,
    message,
    details
  };
}

// Rate limiting utilities
export const WebhookRateLimit = z.object({
  enabled: z.boolean().default(true),
  windowMs: z.number().default(60000), // 1 minute
  maxRequests: z.number().default(100), // per window
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false)
});

// Health check utilities
export function validateWebhookHealth(
  source: string,
  payload?: any
): { healthy: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic payload validation
  if (!payload) {
    errors.push(`${source}: No payload received`);
  }
  
  // Source-specific validation
  switch (source) {
    case 'twilio':
      if (!payload?.CallSid) {
        errors.push('twilio: Missing CallSid');
      }
      break;
    case 'sms-provider':
      if (!payload?.messageId) {
        errors.push('sms-provider: Missing messageId');
      }
      break;
    case 'google-calendar':
      if (!payload?.id) {
        errors.push('google-calendar: Missing event id');
      }
      break;
    case 'review-platforms':
      if (!payload?.reviewId || !payload?.businessId) {
        errors.push('review-platforms: Missing reviewId or businessId');
      }
      break;
  }
  
  return {
    healthy: errors.length === 0,
    errors
  };
}

// Type exports for validation
export type TwilioWebhookPayload = z.infer<typeof TwilioWebhookSchema>;
export type SMSProviderWebhookPayload = z.infer<typeof SMSProviderWebhookSchema>;
export type GoogleCalendarWebhookPayload = z.infer<typeof GoogleCalendarWebhookSchema>;
export type ReviewPlatformWebhookPayload = z.infer<typeof ReviewPlatformWebhookSchema>;

export type WebhookSourceType = z.infer<typeof WebhookSource>;
export type WebhookEventStatusType = z.infer<typeof WebhookEventStatus>;
export type WebhookRetryConfigType = z.infer<typeof WebhookRetryConfig>;
export type WebhookRateLimitType = z.infer<typeof WebhookRateLimit>;

// Middleware validation schemas
export const TwilioWebhookValidation = z.object({
  CallSid: z.string(),
  CallStatus: z.enum(['ringing', 'initiated', 'answered', 'completed', 'busy', 'failed', 'no-answer']),
  CallDirection: z.enum(['inbound', 'outbound']),
  From: z.string().nullable(),
  To: z.string().nullable(),
  CallDuration: z.string().nullable().optional(),
  RecordingUrl: z.string().url().nullable().optional()
});

export const SMSWebhookValidation = z.object({
  messageId: z.string(),
  status: z.enum(['sent', 'delivered', 'failed', 'rejected', 'expired', 'unknown']),
  deliveryStatus: z.enum(['pending', 'delivered', 'failed', 'undelivered', 'rejected', 'expired']).optional(),
  timestamp: z.string().datetime()
});

export const CalendarWebhookValidation = z.object({
  id: z.string(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']),
  summary: z.string(),
  start: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string()
  }),
  end: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string()
  })
});

export const ReviewWebhookValidation = z.object({
  reviewId: z.string(),
  reviewerName: z.string(),
  reviewRating: z.number().min(1).max(5),
  reviewDate: z.string().datetime(),
  platform: z.enum(['google', 'yelp', 'facebook', 'tripadvisor', 'other']),
  businessId: z.string()
});

export const WebhookLogEntry = z.object({
  id: z.string().uuid(),
  source: WebhookSource,
  event_type: z.string(),
  payload: z.record(z.any()),
  signature: z.string(),
  ip_address: z.string().ip(),
  user_agent: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  processed_at: z.string().datetime().optional(),
  error_message: z.string().optional(),
  retries: z.number().default(0),
  created_at: z.string().datetime()
});
