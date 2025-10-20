import { z } from 'zod';

// Channel types
export const ConversationChannel = ['sms', 'email', 'whatsapp', 'facebook', 'instagram', 'twitter', 'website_chat', 'phone_call', 'in_person'] as const;
export type ConversationChannelType = typeof ConversationChannel[number];

// Thread types
export const ThreadType = ['customer_support', 'sales_inquiry', 'appointment_booking', 'general_question', 'complaint', 'feedback', 'cancel_request', 'upsell'] as const;
export type ThreadTypeType = typeof ThreadType[number];

// Status types
export const ConversationStatus = ['open', 'active', 'waiting', 'closed', 'spam', 'pending'] as const;
export type ConversationStatusType = typeof ConversationStatus[number];

// Priority types
export const ConversationPriority = ['low', 'normal', 'high', 'urgent'] as const;
export type ConversationPriorityType = typeof ConversationPriority[number];

// Sender types for messages
export const SenderType = ['customer', 'agent', 'system', 'bot'] as const;
export type SenderTypeType = typeof SenderType[number];

// Message types
export const MessageType = ['text', 'image', 'document', 'voice', 'video', 'location', 'contact', 'sticker', 'system'] as const;
export type MessageTypeType = typeof MessageType[number];

// Message direction
export const MessageDirection = ['inbound', 'outbound'] as const;
export type MessageDirectionType = typeof MessageDirection[number];

// Message status
export const MessageStatus = ['sending', 'sent', 'delivered', 'read', 'failed'] as const;
export type MessageStatusType = typeof MessageStatus[number];

// Create conversation schema
export const createConversationSchema = z.object({
  customer_id: z.string()
    .uuid('Invalid customer ID format')
    .optional()
    .or(z.literal('')),
  
  external_conversation_id: z.string()
    .max(255, 'External conversation ID too long')
    .optional(),
  
  thread_type: z.enum(ThreadType, {
    errorMap: () => ({ message: 'Invalid thread type' })
  }),
  
  channel: z.enum(ConversationChannel, {
    errorMap: () => ({ message: 'Invalid channel type' })
  }),
  
  status: z.enum(ConversationStatus)
    .optional()
    .default('open'),
  
  participants: z.object({
    customer: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      contact: z.string().optional(),
      role: z.string().default('customer')
    }).optional(),
    agents: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string().default('agent')
    })).optional()
  }).optional(),
  
  priority: z.enum(ConversationPriority)
    .optional()
    .default('normal'),
  
  tags: z.array(z.string())
    .max(10, 'Too many tags (max 10)')
    .each(z.max(50, 'Tag too long (max 50 characters)'))
    .optional(),
  
  assigned_to: z.string()
    .uuid('Invalid user ID format')
    .optional(),
  
  metadata: z.object({
    source_url: z.string().url().optional(),
    user_agent: z.string().optional(),
    ip_address: z.string().ip().optional(),
    campaign: z.string().optional(),
    reference_id: z.string().optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Create message schema
export const createMessageSchema = z.object({
  external_message_id: z.string()
    .max(255, 'External message ID too long')
    .optional(),
  
  sender_type: z.enum(SenderType, {
    errorMap: () => ({ message: 'Invalid sender type' })
  }),
  
  sender_id: z.string()
    .uuid('Invalid sender ID format')
    .optional(),
  
  sender_name: z.string()
    .min(1, 'Sender name is required')
    .max(100, 'Sender name must be less than 100 characters')
    .optional(),
  
  sender_contact: z.string()
    .max(100, 'Sender contact must be less than 100 characters')
    .optional(),
  
  body: z.string()
    .min(1, 'Message body is required')
    .max(4000, 'Message body must be less than 4000 characters')
    .refine(body => body.trim().length > 0, 'Message body cannot be empty'),
  
  message_type: z.enum(MessageType)
    .optional()
    .default('text'),
  
  direction: z.enum(MessageDirection, {
    errorMap: () => ({ message: 'Invalid message direction' })
  }),
  
  status: z.enum(MessageStatus)
    .optional()
    .default('sent'),
  
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'audio', 'video']),
    url: z.string().url(),
    filename: z.string(),
    size: z.number().positive(),
    mime_type: z.string(),
    metadata: z.object({
      thumbnail_url: z.string().url().optional(),
      duration: z.number().optional(), // for audio/video
      dimensions: z.object({ width: z.number(), height: z.number() }).optional() // for images/videos
    }).optional()
  })).optional(),
  
  metadata: z.object({
    delivery_report: z.object({
      provider: z.string(),
      provider_message_id: z.string(),
      delivered_at: z.string().datetime().optional(),
      read_at: z.string().datetime().optional(),
      failed_reason: z.string().optional()
    }).optional(),
    automation: z.object({
      trigger: z.string(),
      workflow_id: z.string(),
      action_taken: z.string()
    }).optional(),
    processing: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
      language: z.string().optional(),
      intent: z.string().optional(),
      entities: z.array(z.object({
        type: z.string(),
        value: z.string(),
        confidence: z.number().min(0).max(1)
      })).optional()
    }).optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Update conversation schema
export const updateConversationSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
  
  external_conversation_id: z.string().max(255, 'External conversation ID too long').optional(),
  
  thread_type: z.enum(ThreadType).optional(),
  
  channel: z.enum(ConversationChannel).optional(),
  
  status: z.enum(ConversationStatus).optional(),
  
  priority: z.enum(ConversationPriority).optional(),
  
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
  
  assigned_to: z.string().uuid('Invalid user ID format').optional(),
  
  participants: z.object({
    customer: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      contact: z.string().optional(),
      role: z.string().default('customer')
    }).optional(),
    agents: z.array(z.object({
      id: z.string(),
      name: z.string(),
      role: z.string().default('agent')
    })).optional()
  }).optional(),
  
  metadata: z.object({
    source_url: z.string().url().optional(),
    user_agent: z.string().optional(),
    ip_address: z.string().ip().optional(),
    campaign: z.string().optional(),
    reference_id: z.string().optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Update message schema
export const updateMessageSchema = z.object({
  body: z.string()
    .min(1, 'Message body is required')
    .max(4000, 'Message body must be less than 4000 characters')
    .optional(),
  
  message_type: z.enum(MessageType).optional(),
  
  status: z.enum(MessageStatus).optional(),
  
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'audio', 'video']),
    url: z.string().url(),
    filename: z.string(),
    size: z.number().positive(),
    mime_type: z.string()
  })).optional(),
  
  metadata: z.object({
    delivery_report: z.object({
      provider: z.string(),
      provider_message_id: z.string(),
      delivered_at: z.string().datetime().optional(),
      read_at: z.string().datetime().optional(),
      failed_reason: z.string().optional()
    }).optional(),
    automation: z.object({
      trigger: z.string(),
      workflow_id: z.string(),
      action_taken: z.string()
    }).optional(),
    processing: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
      language: z.string().optional(),
      intent: z.string().optional(),
      entities: z.array(z.object({
        type: z.string(),
        value: z.string(),
        confidence: z.number().min(0).max(1)
      })).optional()
    }).optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Query parameters for getting conversations
export const getConversationsSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  
  // Filtering
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
  
  channel: z.enum(ConversationChannel).optional(),
  
  status: z.enum(ConversationStatus).optional(),
  
  priority: z.enum(ConversationPriority).optional(),
  
  assigned_to: z.string().uuid('Invalid user ID format').optional(),
  
  thread_type: z.enum(ThreadType).optional(),
  
  // Date filtering
  start_date: z.string().datetime('Invalid start date format').optional(),
  
  end_date: z.string().datetime('Invalid end date format').optional(),
  
  // Search
  search: z.string().max(100, 'Search term too long').optional(),
  
  tags: z.string().optional(), // comma-separated tags
  
  // Pagination
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('10'),
  
  // Sorting
  sort_by: z.enum(['created_at', 'last_message_at', 'priority', 'status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

// Query parameters for getting messages
export const getMessagesSchema = z.object({
  conversation_id: z.string().uuid('Invalid conversation ID format').optional(),
  
  sender_type: z.enum(SenderType).optional(),
  
  message_type: z.enum(MessageType).optional(),
  
  direction: z.enum(MessageDirection).optional(),
  
  status: z.enum(MessageStatus).optional(),
  
  // Date filtering
  start_date: z.string().datetime('Invalid start date format').optional(),
  
  end_date: z.string().datetime('Invalid end date format').optional(),
  
  // Search in message body
  search: z.string().max(100, 'Search term too long').optional(),
  
  // Pagination
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('50'), // More messages per page
  
  // Sorting
  sort_by: z.enum(['created_at', 'status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

// Bulk operations
export const bulkUpdateConversationsSchema = z.object({
  conversation_ids: z.array(z.string().uuid())
    .min(1, 'At least one conversation ID required')
    .max(100, 'Too many conversation IDs (max 100)'),
  
  updates: z.object({
    status: z.enum(ConversationStatus).optional(),
    priority: z.enum(ConversationPriority).optional(),
    assigned_to: z.string().uuid().optional(),
    tags: z.array(z.string()).optional()
  })
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type GetConversationsQuery = z.infer<typeof getConversationsSchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesSchema>;
export type BulkUpdateConversationsInput = z.infer<typeof bulkUpdateConversationsSchema>;

// Utility functions for conversation management

export function generateConversationPreview(body: string, maxLength: number = 100): string {
  const cleaned = body.replace(/[\n\r\t]+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + '...';
}

export function extractMentionedUsers(body: string): string[] {
  // Extract @mentions from message body
  const mentions = body.match(/@(\w+)/g);
  return mentions ? mentions.map(mention => mention.substring(1)) : [];
}

export function extractHashtags(body: string): string[] {
  // Extract #hashtags from message body
  const hashtags = body.match(/#(\w+)/g);
  return hashtags ? hashtags.map(tag => tag.substring(1)) : [];
}

export function sanitizeMessageBody(body: string): string {
  // Sanitize message body for security
  return body
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

export function validateConversationPermissions(userId: string, conversationAssignments: string[]): boolean {
  // Check if user has permission to access conversation
  // This could be enhanced with role-based permissions
  return conversationAssignments.includes(userId);
}

export function calculateConversationPriority(lastMessageAt: string, unreadCount: number): ConversationPriorityType {
  const now = new Date();
  const lastMessage = new Date(lastMessageAt);
  const hoursSinceLastMessage = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
  
  if (unreadCount > 0 && hoursSinceLastMessage < 1) return 'urgent';
  if (unreadCount > 2 && hoursSinceLastMessage < 4) return 'high';
  if (unreadCount > 0 && hoursSinceLastMessage < 12) return 'normal';
  return 'low';
}
