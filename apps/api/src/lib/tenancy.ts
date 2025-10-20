import { Request, Response, NextFunction } from 'express';

export function requireOrg(req: Request, res: Response, next: NextFunction) {
  const orgId = (req as any).orgId || req.headers['x-org-id'] || req.query.orgId;
  if (!orgId) {
    return res.status(401).json({ 
      error: 'Missing organization ID',
      message: 'Organization ID is required for this operation'
    });
  }
  (req as any).orgId = String(orgId);
  next();
}

export function optionalOrg(req: Request, res: Response, next: NextFunction) {
  const orgId = (req as any).orgId || req.headers['x-org-id'] || req.query.orgId;
  if (orgId) {
    (req as any).orgId = String(orgId);
  }
  next();
}

// Helper to normalize phone numbers
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Add +1 if it's a 10-digit US number
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // Add + if it's an 11-digit number starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  // Return as-is if it already has country code
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// Helper to normalize email addresses
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

// Helper to validate phone number format
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Basic validation for US numbers (+1XXXXXXXXXX)
  return /^\+1\d{10}$/.test(normalized);
}

// Helper to validate email format
export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
}
