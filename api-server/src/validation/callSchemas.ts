import { z } from 'zod';

// Call direction types
export const CallDirection = ['inbound', 'outbound'] as const;
export type CallDirectionType = typeof CallDirection[number];

// Call status types
export const CallStatus = ['initiated', 'ringing', 'answered', 'completed', 'busy', 'failed', 'no-answer', 'cancelled'] as const;
export type CallStatusType = typeof CallStatus[number];

// Call outcome types
export const CallOutcome = ['completed', 'missed', 'voicemail', 'busy', 'failed', 'hangup', 'timeout', 'blocked'] as const;
export type CallOutcomeType = typeof CallOutcome[number];

// Transcript segment types
export const TranscriptSegmentType = ['customer', 'agent', 'system', 'hold_music', 'unknown'] as const;
export type TranscriptSegmentTypeType = typeof TranscriptSegmentType[number];

// Create call schema
export const createCallSchema = z.object({
  customer_id: z.string()
    .uuid('Invalid customer ID format')
    .optional()
    .or(z.literal('')),

  caller_phone: z.string()
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format')
    .optional(),

  caller_name: z.string()
    .max(100, 'Caller name must be less than 100 characters')
    .optional(),

  twilio_call_sid: z.string()
    .regex(/^CA[0-9a-f]{32}$/, 'Invalid Twilio Call SID format')
    .optional(),

  twilio_account_sid: z.string()
    .regex(/^AG[0-9a-f]{20}$/, 'Invalid Twilio Account SID format')
    .optional(),

  phone_number: z.string()
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format'),

  direction: z.enum(CallDirection, {
    errorMap: () => ({ message: 'Direction must be inbound or outbound' })
  }),

  status: z.enum(CallStatus)
    .optional()
    .default('initiated'),

  started_at: z.string()
    .datetime('Invalid datetime format'),

  ended_at: z.string()
    .datetime('Invalid datetime format')
    .optional(),

  duration: z.number()
    .int('Duration must be a whole number')
    .min(0, 'Duration cannot be negative')
    .max(86400, 'Duration must be less than 24 hours')
    .optional(),

  outcome: z.enum(CallOutcome)
    .optional(),

  quality: z.object({
    jitter: z.number().optional(),
    packet_loss: z.number().min(0).max(1).optional(),
    mos_score: z.number().min(1).max(5).optional(),
    rtt: z.number().optional(), // Round trip time
    codec: z.string().optional(),
    network_info: z.object({
      network_type: z.enum(['wifi', 'cellular', 'ethernet', 'unknown']).optional(),
      carrier: z.string().optional(),
      signal_strength: z.number().optional()
    }).optional()
  }).optional(),

  transcript: z.object({
    segments: z.array(z.object({
      speaker: z.enum(TranscriptSegmentType),
      start_time: z.number().min(0),
      end_time: z.number().min(0),
      text: z.string(),
      confidence: z.number().min(0).max(1).optional()
    })),
    duration: z.number().min(0).optional(),
    language: z.string().default('en').optional(),
    provider: z.string().optional()
  }).optional(),

  recording_url: z.string()
    .url('Invalid recording URL format')
    .optional(),

  transcription_url: z.string()
    .url('Invalid transcription URL format')
    .optional(),

  call_data: z.object({
    twilio_data: z.object({
      parent_call_sid: z.string().optional(),
      call_duration: z.number().optional(),
      price: z.number().optional(),
      price_unit: z.string().optional(),
      annotations: z.record(z.any()).optional(),
      properties: z.record(z.any()).optional()
    }).optional(),
    
    route_data: z.object({
      route_type: z.string().optional(),
      sip_user: z.string().optional(),
      sip_domain: z.string().optional(),
      trunk_sid: z.string().optional()
    }).optional(),

    client_data: z.object({
      application_sid: z.string().optional(),
      api_version: z.string().optional(),
      machine_detection: z.object({
        result: z.string().optional(),
        confidence: z.number().optional()
      }).optional()
    }).optional(),

    voice_data: z.object({
      machine_detection_duration: z.number().optional(),
      answered_by: z.string().optional(),
      caller_name: z.string().optional(),
      privacy: z.boolean().optional()
    }).optional()
  }).optional(),

  metadata: z.object({
    tags: z.array(z.string()).max(10, 'Too many tags').optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    campaign: z.string().max(100).optional(),
    source: z.string().max(100).optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Update call schema
export const updateCallSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID format').optional(),

  caller_phone: z.string()
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format')
    .optional(),

  caller_name: z.string()
    .max(100, 'Caller name must be less than 100 characters')
    .optional(),

  twilio_call_sid: z.string()
    .regex(/^CA[0-9a-f]{32}$/, 'Invalid Twilio Call SID format')
    .optional(),

  twilio_account_sid: z.string()
    .regex(/^AG[0-9a-f]{20}$/, 'Invalid Twilio Account SID format')
    .optional(),

  phone_number: z.string()
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format')
    .optional(),

  direction: z.enum(CallDirection).optional(),
  status: z.enum(CallStatus).optional(),
  started_at: z.string().datetime('Invalid datetime format').optional(),
  ended_at: z.string().datetime('Invalid datetime format').optional(),

  duration: z.number()
    .int('Duration must be a whole number')
    .min(0, 'Duration cannot be negative')
    .max(86400, 'Duration must be less than 24 hours')
    .optional(),

  outcome: z.enum(CallOutcome).optional(),

  quality: z.object({
    jitter: z.number().optional(),
    packet_loss: z.number().min(0).max(1).optional(),
    mos_score: z.number().min(1).max(5).optional(),
    rtt: z.number().optional(),
    codec: z.string().optional(),
    network_info: z.object({
      network_type: z.enum(['wifi', 'cellular', 'ethernet', 'unknown']).optional(),
      carrier: z.string().optional(),
      signal_strength: z.number().optional()
    }).optional()
  }).optional(),

  transcript: z.object({
    segments: z.array(z.object({
      speaker: z.enum(TranscriptSegmentType),
      start_time: z.number().min(0),
      end_time: z.number().min(0),
      text: z.string(),
      confidence: z.number().min(0).max(1).optional()
    })),
    duration: z.number().min(0).optional(),
    language: z.string().default('en').optional(),
    provider: z.string().optional()
  }).optional(),

  recording_url: z.string().url('Invalid recording URL format').optional(),
  transcription_url: z.string().url('Invalid transcription URL format').optional(),

  call_data: z.object({
    twilio_data: z.object({
      parent_call_sid: z.string().optional(),
      call_duration: z.number().optional(),
      price: z.number().optional(),
      price_unit: z.string().optional(),
      annotations: z.record(z.any()).optional(),
      properties: z.record(z.any()).optional()
    }).optional(),
    route_data: z.object({
      route_type: z.string().optional(),
      sip_user: z.string().optional(),
      sip_domain: z.string().optional(),
      trunk_sid: z.string().optional()
    }).optional(),
    client_data: z.object({
      application_sid: z.string().optional(),
      api_version: z.string().optional(),
      machine_detection: z.object({
        result: z.string().optional(),
        confidence: z.number().optional()
      }).optional()
    }).optional(),
    voice_data: z.object({
      machine_detection_duration: z.number().optional(),
      answered_by: z.string().optional(),
      caller_name: z.string().optional(),
      privacy: z.boolean().optional()
    }).optional()
  }).optional(),

  metadata: z.object({
    tags: z.array(z.string()).max(10, 'Too many tags').optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    campaign: z.string().max(100).optional(),
    source: z.string().max(100).optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Recording upload schema (multipart/form-data)
export const uploadRecordingSchema = z.object({
  call_sid: z.string()
    .regex(/^CA[0-9a-f]{32}$/, 'Invalid Twilio Call SID format'),

  account_sid: z.string()
    .regex(/^AG[0-9a-f]{20}$/, 'Invalid Twilio Account SID format'),

  recording_url: z.string()
    .url('Invalid recording URL format'),

  recording_sid: z.string()
    .regex(/^RE[0-9a-f]{32}$/, 'Invalid Twilio Recording SID format'),

  duration: z.string()
    .regex(/^\d+$/, 'Duration must be a number')
    .transform(val => parseInt(val, 10))
    .refine(duration => duration >= 0, 'Duration cannot be negative'),

  channels: z.string()
    .regex(/^\d+$/, 'Channels must be a number')
    .transform(val => parseInt(val, 10))
    .refine(channels => channels >= 1 && channels <= 2, 'Channels must be 1 (mono) or 2 (stereo)'),

  sample_rate: z.string()
    .regex(/^\d+$/, 'Sample rate must be a number')
    .transform(val => parseInt(val, 10))
    .optional(),

  audio_format: z.string()
    .regex(/^audio\/|audio\/x-|audio\/wav|audio\/mp3|audio\/ogg$/i)
    .optional()
    .default('audio/wav'),

  source: z.enum(['twilio', 'manual', 'export'])
    .optional()
    .default('twilio'),

  transcription_status: z.enum(['completed', 'failed', 'pending'])
    .optional()
});

// Query parameters schema for GET /calls
export const getCallsSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  
  // Call filtering
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
  direction: z.enum(CallDirection).optional(),
  status: z.enum(CallStatus).optional(),
  outcome: z.enum(CallOutcome).optional(),
  
  // Twilio filtering
  twilio_call_sid: z.string().regex(/^CA[0-9a-f]{32}$/).optional(),
  
  // Date filtering
  start_date: z.string().datetime('Invalid start date format').optional(),
  end_date: z.string().datetime('Invalid end date format').optional(),
  
  // Duration filtering
  min_duration: z.string().regex(/^\d+$/).transform(Number).optional(),
  max_duration: z.string().regex(/^\d+$/).transform(Number).optional(),
  
  // Search
  search: z.string().max(100, 'Search term too long').optional(),
  
  // Pagination
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('10'),
  
  // Sorting
  sort_by: z.enum(['started_at', 'duration', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),

  // Metadata filtering
  has_recording: z.string().transform(val => val === 'true').optional(),
  has_transcript: z.string().transform(val => val === 'true').optional(),
  tags: z.string().optional() // comma-separated tags
});

// Twilio webhook validation schema
export const twilioWebhookSchema = z.object({
  CallSid: z.string().regex(/^CA[0-9a-f]{32}$/),
  AccountSid: z.string().regex(/^AG[0-9a-f]{20}$/),
  From: z.string(),
  To: z.string(),
  CallStatus: z.enum(CallStatus),
  Direction: z.enum(CallDirection),
  Duration: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional(),
  EndTime: z.string().optional(),
  StartTime: z.string().optional(),
  RecordingUrl: z.string().url().optional(),
  RecordingSid: z.string().regex(/^RE[0-9a-f]{32}$/).optional(),
  
  // Optional Twilio fields
  ParentCallSid: z.string().optional(),
  AnsweredBy: z.string().optional(),
  CallerName: z.string().optional(),
  
  // Custom fields
  business_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  campaign: z.string().optional(),
  metadata: z.string().optional() // JSON string
});

export type CreateCallForm = z.infer<typeof createCallSchema>;
export type UpdateCallForm = z.infer<typeof updateCallSchema>;
export type UploadRecordingForm = z.infer<typeof uploadRecordingSchema>;
export type GetCallsQuery = z.infer<typeof getCallsSchema>;
export type TwilioWebhookForm = z.infer<typeof twilioWebhookSchema>;

// Utility functions for call management

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Basic validation
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error('Invalid phone number length');
  }
  
  return cleaned;
}

export function validateTwilioSignature(
  payload: string,
  signature: string,
  authToken: string,
  url: string
): boolean {
  try {
    const crypto = require('crypto');
    
    // Create the signature using HMAC-SHA1
    const computedSignature = crypto
      .createHmac('sha1', authToken)
      .update(url + payload)
      .digest('base64');
    
    return signature === computedSignature;
  } catch (error) {
    return false;
  }
}

export function extractAudioMetadata(audioBuffer: Buffer): {
  duration: number;
  channels: number;
  sampleRate: number;
  bitRate?: number;
} {
  // Basic audio metadata extraction
  // This would typically use a library like node-wav-parser or ffprobe
  
  try {
    // WAV file header parsing (16-byte minimum header)
    if (audioBuffer.length < 44) {
      throw new Error('Invalid or corrupted audio file');
    }
    
    const header = Buffer.from(audioBuffer.slice(0, 44));
    
    // Check RIFF header (first 4 bytes)
    if (header.toString('ascii', 0, 4) !== 'RIFF') {
      throw new Error('Not a valid WAV file');
    }
    
    // Extract audio format metadata
    const sampleRate = header.readUInt32LE(24);
    const channels = header.readUInt16LE(22);
    const bitRate = header.readUInt16LE(32);
    
    // Calculate duration (approximate)
    const byteRate = header.readUInt32LE(28);
    const duration = Math.floor(audioBuffer.length / byteRate);
    
    return {
      duration: Math.max(0, duration),
      channels,
      sampleRate,
      bitRate
    };
  } catch (error) {
    // Fallback metadata for unknown formats
    return {
      duration: 0,
      channels: 1,
      sampleRate: 8000,
      bitRate: 128000
    };
  }
}

export function generateFileHash(fileBuffer: Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function isValidAudioFile(mimeType: string): boolean {
  const validTypes = [
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/webm',
    'audio/flac',
    'audio/x-wav',
    'audio/audio'
  ];
  
  return validTypes.includes(mimeType.toLowerCase());
}
