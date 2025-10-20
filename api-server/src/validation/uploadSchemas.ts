import { z } from 'zod';

// File upload validation schemas
export const fileUploadSchema = z.object({
  description: z.string().max(500, 'Description too long').optional(),
  folder: z.string().max(100, 'Folder name too long').optional(),
  tags: z.array(z.string().max(50)).optional(),
  metadata: z.record(z.string()).optional()
});

// File metadata validation
export const fileMetadataSchema = z.object({
  file_type: z.enum([
    'image',
    'document', 
    'spreadsheet',
    'presentation',
    'pdf',
    'archive',
    'text',
    'other'
  ]).optional(),
  
  category: z.enum([
    'customer_documents',
    'appointment_files',
    'team_materials',
    'business_documents',
    'templates',
    'temp',
    'other'
  ]).default('other'),
  
  confidential: z.boolean().default(false),
  retention_days: z.number().min(1).max(2555).default(365), // Max ~7 years
  
  original_filename: z.string().optional(),
  source: z.enum(['web_upload', 'email_attachment', 'api_upload', 'manual']).default('web_upload'),
  
  version: z.string().regex(/^\d+\.\d+$/).default('1.0'),
  author: z.string().max(100).optional(),
  department: z.string().max(50).optional()
});

// File types and limits
export const allowedMimeTypes = {
  image: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
    'text/markdown'
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  archive: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ],
  other: []
};

export const fileSizeLimits = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  spreadsheet: 10 * 1024 * 1024, // 10MB
  presentation: 15 * 1024 * 1024, // 15MB
  archive: 50 * 1024 * 1024, // 50MB
  other: 10 * 1024 * 1024 // 10MB default
};

// File validation utility functions
export function validateFileMetadata(file: Express.Multer.File): {
  isValid: boolean;
  fileType: string;
  category: string;
  errors: string[];
} {
  const errors: string[]) = [];
  const fileType = getFileType(file.mimetype);
  const category = getFileCategory(fileType, file.originalname);
  
  // Validate file size
  const maxSize = fileSizeLimits[fileType as keyof typeof fileSizeLimits] || fileSizeLimits.other;
  if (file.size > maxSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(maxSize)})`);
  }
  
  // Validate MIME type
  const allowedTypes = allowedMimeTypes[fileType as keyof typeof allowedMimeTypes];
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed for ${fileType} files`);
  }
  
  // Validate filename
  if (!file.originalname || file.originalname.trim() === '') {
    errors.push('Filename is required');
  }
  
  if (file.originalname.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }
  
  return {
    isValid: errors.length === 0,
    fileType,
    category,
    errors
  };
}

export function getFileType(mimeType: string): string {
  for (const [type, mimeTypes] of Object.entries(allowedMimeTypes)) {
    if (mimeTypes.includes(mimeType)) {
      return type;
    }
  }
  return 'other';
}

export function getFileCategory(fileType: string, filename: string): string {
  if (fileType === 'image') {
    return 'customer_documents';
  }
  
  if (filename.match(/contract|agreement|proposal|invoice/i)) {
    return 'business_documents';
  }
  
  if (filename.match(/profile|photo|avatar/i)) {
    return 'customer_documents';
  }
  
  if (filename.match(/appointment|booking|schedule/i)) {
    return 'appointment_files';
  }
  
  if (filename.match(/template|guide|manual/i)) {
    return 'team_materials';
  }
  
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(originalName);
  const lastDot = sanitized.lastIndexOf('.');
  
  if (lastDot === -1) {
    return `${timestamp}_${sanitized}`;
  }
  
  const name = sanitized.substring(0, lastDot);
  const extension = sanitized.substring(lastDot);
  
  return `${timestamp}_${name}${extension}`;
}

// Notification types
export const NotificationType = z.enum([
  'appointment_confirmed',
  'appointment_cancelled',
  'appointment_completed',
  'review_submitted',
  'review_response',
  'team_invitation',
  'file_uploaded',
  'payment_received',
  'system_alert',
  'general'
]);

export const NotificationPriority = z.enum([
  'low',
  'normal', 
  'high',
  'urgent'
]);

export const NotificationStatus = z.enum([
  'unread',
  'read',
  'archived',
  'expired'
]);

// Notification query parameters
export const notificationQuerySchema = z.object({
  // Filtering
  type: NotificationType.optional(),
  priority: NotificationPriority.optional(),
  read_status: NotificationStatus.optional(),
  
  // Date filters
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  
  // Pagination
  page: z.string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .default('1')
    .optional(),
    
  limit: z.string()
    .transform(Number)
    .pipe(z.number().min(1).max(50))
    .default('20')
    .optional(),
    
  // Sorting
  sort_by: z.enum(['created_at', 'priority', 'read_at', 'expires_at'])
    .default('created_at')
    .optional(),
    
  sort_order: z.enum(['asc', 'desc'])
    .default('desc')
    .optional(),
    
  // Additional options
  include_expired: z.string()
    .transform(val => val === 'true')
    .optional(),
    
  include_read: z.string()
    .transform(val => val === 'true')
    .default('true')
    .optional(),
    
  show_all: z.string()
    .transform(val => val === 'true')
    .optional()
});

// Mark notification as read schema
export const markNotificationReadSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
  
  // Optional fields for actions
  action_taken: z.enum(['viewed', 'clicked_action', 'dismissed']).optional(),
  action_data: z.record(z.any()).optional()
});

// Bulk notification operations
export const bulkNotificationActionSchema = z.object({
  notification_ids: z.array(z.string().uuid())
    .min(1, 'At least one notification ID is required')
    .max(100, 'Too many notification IDs (max 100)'),
    
  action: z.enum(['mark_read', 'mark_unread', 'archive', 'delete']),
  
  action_data: z.record(z.any()).optional()
});

// Create notification schema (for API creation)
export const createNotificationSchema = z.object({
  type: NotificationType,
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  
  // Optional fields
  data: z.record(z.any()).optional(),
  action_url: z.string().url().max(500).optional(),
  action_label: z.string().max(100).optional(),
  priority: NotificationPriority.default('normal'),
  expires_at: z.string().datetime().optional(),
  
  // Target user
  target_user_id: z.string().uuid().optional() // If not provided, uses current user
});

// Notification stats query
export const notificationStatsSchema = z.object({
  timeframe: z.enum(['24h', '7d', '30d', '90d', 'all']).default('30d'),
  include_by_type: z.boolean().default(true),
  include_recent: z.boolean().default(true),
  recent_count: z.number().min(1).max(20).default(5)
});

// File upload stats query
export const fileUploadStatsSchema = z.object({
  timeframe: z.enum(['24h', '7d', '30d', '90d', 'all']).default('30d'),
  category: z.string().optional(),
  file_type: z.string().optional(),
  user_id: z.string().uuid().optional()
});

// Type exports
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type FileMetadataInput = z.infer<typeof fileMetadataSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
export type BulkNotificationActionInput = z.infer<typeof bulkNotificationActionSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type NotificationStatsInput = z.infer<typeof notificationStatsSchema>;
export type FileUploadStatsInput = z.infer<typeof fileUploadStatsSchema>;

// Utility functions for file handling
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
}

export function isValidImageFile(mimeType: string): boolean {
  return allowedMimeTypes.image.includes(mimeType);
}

export function isValidDocumentFile(mimeType: string): boolean {
  return allowedMimeTypes.document.includes(mimeType);
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const extension = getFileExtension(filename);
  return imageExtensions.includes(extension);
}

export function getFileIcon(mimeType: string, filename: string): string {
  if (isValidImageFile(mimeType)) return '📷';
  if (mimeType === 'application/pdf') return '📄';
  if (allowedMimeTypes.spreadsheet.includes(mimeType)) return '📊';
  if (allowedMimeTypes.presentation.includes(mimeType)) return '📈';
  if (allowedMimeTypes.archive.includes(mimeType)) return '📦';
  if (mimeType.startsWith('text/')) return '📝';
  return '📁';
}

export function validateFileUploadSafety(file: Express.Multer.File): {
  safe: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check for executable files (security)
  const executableExtensions = ['exe', 'bat', 'cmd', 'scr', 'com', 'pif'];
  const extension = getFileExtension(file.originalname);
  
  if (executableExtensions.includes(extension)) {
    errors.push('Executable files are not allowed for security reasons');
  }
  
  // Check for suspicious patterns in filename
  const suspiciousPatterns = ['\.', 'exec', 'script', 'virus', 'malware'];
  const filename = file.originalname.toLowerCase();
  
  suspiciousPatterns.forEach(pattern => {
    if (filename.includes(pattern)) {
      warnings.push(`Filename contains suspicious pattern: ${pattern}`);
    }
  });
  
  // Check file size (already checked in validation but double-check)
  if (file.size === 0) {
    errors.push('File appears to be empty');
  }
  
  if (file.size > 100 * 1024 * 1024) { // 100MB limit
    errors.push('File exceeds maximum size limit of 100MB');
  }
  
  // Check MIME type consistency
  if (extension === 'pdf' && !mimeType.includes('pdf')) {
    warnings.push('File extension and MIME type mismatch');
  }
  
  return {
    safe: errors.length === 0,
    warnings,
    errors
  };
}
