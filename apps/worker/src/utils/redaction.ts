// Redaction utility for sensitive data
export function redactString(str: string): string {
  if (!str) return str;
  
  // Redact phone numbers
  if (str.match(/^\+?[\d\s\-\(\)]+$/)) {
    return str.replace(/\d/g, '*');
  }
  
  // Redact email addresses
  if (str.includes('@')) {
    const [local, domain] = str.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }
  
  // Redact other sensitive patterns
  if (str.length > 10) {
    return str.substring(0, 3) + '***' + str.substring(str.length - 3);
  }
  
  return str;
}

export function redactObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const redacted = { ...obj };
  
  // Redact sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'key', 'phone', 'email'];
  
  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = redactString(redacted[field]);
    }
  }
  
  return redacted;
}
