/**
 * Custom Error Types and Handlers for ClientFlow API
 */

// Custom Error Classes
export class CustomError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly code?: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: any,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      code: this.code,
      stack: this.stack,
    };
  }
}

// Specific Error Types
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, details, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, undefined, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, undefined, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, { resource, identifier }, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 409, details, 'CONFLICT_ERROR');
  }
}

export class BusinessLogicError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 422, details, 'BUSINESS_LOGIC_ERROR');
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, undefined, 'RATE_LIMIT_ERROR');
  }
}

export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string, details?: any) {
    super(`External service error: ${service} - ${message}`, 502, details, 'EXTERNAL_SERVICE_ERROR');
  }
}

export class DatabaseError extends CustomError {
  constructor(operation: string, message: string, details?: any) {
    super(`Database error during ${operation}: ${message}`, 500, details, 'DATABASE_ERROR');
  }
}

export class FileUploadError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, details, 'FILE_UPLOAD_ERROR');
  }
}

export class WebhookError extends CustomError {
  constructor(source: string, message: string, details?: any) {
    super(`Webhook error from ${source}: ${message}`, 400, details, 'WEBHOOK_ERROR');
  }
}

// Error Codes for consistent error handling
export const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  MISSING_TOKEN: 'MISSING_TOKEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',

  // Validation Errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Business Logic Errors
  APPOINTMENT_CONFLICT: 'APPOINTMENT_CONFLICT',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',

  // External Service Errors
  TWILIO_ERROR: 'TWILIO_ERROR',
  SUPABASE_ERROR: 'SUPABASE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',

  // File Upload Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // System Errors
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

// Helper function to create specific error types
export const createValidationError = (field: string, message: string, value?: any) => {
  return new ValidationError(message, { field, value });
};

export const createNotFoundError = (resource: string, identifier: string) => {
  return new NotFoundError(resource, identifier);
};

export const createConflictError = (resource: string, identifier: string) => {
  return new ConflictError(`${resource} with identifier '${identifier}' already exists`, { resource, identifier });
};

export const createBusinessLogicError = (operation: string, message: string, details?: any) => {
  return new BusinessLogicError(`${operation}: ${message}`, details);
};

export const createExternalServiceError = (service: string, operation: string, error: any) => {
  const message = error?.message || 'Unknown error';
  const details = {
    service,
    operation,
    originalError: error,
  };
  return new ExternalServiceError(service, `${operation} failed - ${message}`, details);
};

export const createDatabaseError = (table: string, operation: string, error: any) => {
  const message = error?.message || 'Unknown database error';
  const details = {
    table,
    operation,
    originalError: error,
  };
  return new DatabaseError(`${table}.${operation}`, message, details);
};

export const createWebhookError = (source: string, eventType: string, error: any) => {
  const message = error?.message || 'Webhook processing failed';
  const details = {
    source,
    eventType,
    originalError: error,
  };
  return new WebhookError(source, `${eventType}: ${message}`, details);
};

export const createFileUploadError = (fileName: string, error: any) => {
  const message = error?.message || 'File upload failed';
  const details = {
    fileName,
    originalError: error,
  };
  return new FileUploadError(`${fileName}: ${message}`, details);
};

// Error validation helper
export const isCustomError = (error: any): error is CustomError => {
  return error instanceof CustomError;
};

export const isOperationalError = (error: any): boolean => {
  return error instanceof CustomError && error.isOperational;
};

// Error sanitization for production
export const sanitizeErrorForClient = (error: any) => {
  // Don't expose internal details in production
  if (process.env.NODE_ENV === 'production') {
    if (error instanceof CustomError) {
      return {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
        details: error.details ? 'Additional details available' : undefined,
      };
    }

    // Generic error for unknown errors in production
    return {
      name: 'InternalServerError',
      message: 'An internal server error occurred',
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  // Development - expose full error details
  return error;
};

// Error response formatter
export const formatErrorResponse = (error: any) => {
  const sanitized = sanitizeErrorForClient(error);
  
  return {
    success: false,
    error: sanitized.message,
    code: sanitized.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    requestId: sanitized.requestId || 'unknown',
    ...(sanitized.details && { details: sanitized.details }),
  };
};

export default CustomError;
