/**
 * Redacts sensitive information from objects and strings
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
const TOKEN_REGEX = /(token|key|secret|password|auth)[\s=:]+[a-zA-Z0-9+/=]{20,}/gi;
const CREDIT_CARD_REGEX = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-?\d{2}-?\d{4}\b/g;

export function redactString(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(PHONE_REGEX, '[PHONE_REDACTED]')
    .replace(TOKEN_REGEX, '$1=[REDACTED]')
    .replace(CREDIT_CARD_REGEX, '[CARD_REDACTED]')
    .replace(SSN_REGEX, '[SSN_REDACTED]');
}

export function redactObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return redactString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }
  
  if (typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Skip redaction for certain fields that are safe
      if (['id', 'created_at', 'updated_at', 'timestamp', 'status', 'type'].includes(lowerKey)) {
        redacted[key] = value;
      } else if (['email', 'phone', 'token', 'key', 'secret', 'password', 'auth'].some(sensitive => 
        lowerKey.includes(sensitive)
      )) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactObject(value);
      }
    }
    return redacted;
  }
  
  return obj;
}

export function redactLogData(data: any): any {
  if (typeof data === 'string') {
    return redactString(data);
  }
  
  if (typeof data === 'object' && data !== null) {
    return redactObject(data);
  }
  
  return data;
}

// Pino serializer for redacting sensitive data
export const pinoRedactionSerializer = {
  req: (req: any) => {
    const redacted = { ...req };
    
    // Redact headers
    if (redacted.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
      sensitiveHeaders.forEach(header => {
        if (redacted.headers[header]) {
          redacted.headers[header] = '[REDACTED]';
        }
      });
    }
    
    // Redact body
    if (redacted.body) {
      redacted.body = redactObject(redacted.body);
    }
    
    // Redact query
    if (redacted.query) {
      redacted.query = redactObject(redacted.query);
    }
    
    return redacted;
  },
  
  res: (res: any) => {
    const redacted = { ...res };
    
    // Redact response body if it contains sensitive data
    if (redacted.body) {
      redacted.body = redactObject(redacted.body);
    }
    
    return redacted;
  },
  
  err: (err: any) => {
    if (!err) return err;
    
    const redacted = { ...err };
    
    // Redact error message
    if (redacted.message) {
      redacted.message = redactString(redacted.message);
    }
    
    // Redact stack trace
    if (redacted.stack) {
      redacted.stack = redactString(redacted.stack);
    }
    
    return redacted;
  }
};
