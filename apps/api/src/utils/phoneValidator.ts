// Phone number validation and formatting utilities

export class PhoneValidator {
  /**
   * Format phone number for consistent storage
   */
  static format(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Phone number is required');
    }

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Remove leading + if present for processing
    const hasPlus = cleaned.startsWith('+');
    if (hasPlus) {
      cleaned = cleaned.substring(1);
    }
    
    // Ensure it's all digits
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('Phone number contains invalid characters');
    }
    
    // Validate length
    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new Error('Phone number must be between 10 and 15 digits');
    }
    
    // Add back the + if it was there originally
    return hasPlus ? `+${cleaned}` : cleaned;
  }

  /**
   * Validate phone number format
   */
  static isValid(phone: string): boolean {
    try {
      this.format(phone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract country code from phone number
   */
  static extractCountryCode(phone: string): string | null {
    try {
      const formatted = this.format(phone);
      
      if (formatted.startsWith('+1')) return '+1'; // US/Canada
      if (formatted.startsWith('+49')) return '+49'; // Germany
      if (formatted.startsWith('+44')) return '+44'; // UK
      if (formatted.startsWith('+33')) return '+33'; // France
      if (formatted.startsWith('+86')) return '+86'; // China
      if (formatted.startsWith('+91')) return '+91'; // India
      if (formatted.startsWith('+81')) return '+81'; // Japan
      if (formatted.startsWith('+61')) return '+61'; // Australia
      if (formatted.startsWith('+55')) return '+55'; // Brazil
      if (formatted.startsWith('+52')) return '+52'; // Mexico
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize phone number for comparison
   */
  static normalize(phone: string): string {
    try {
      return this.format(phone);
    } catch {
      return phone; // Return original if formatting fails
    }
  }

  /**
   * Check if two phone numbers are the same
   */
  static isEqual(phone1: string, phone2: string): boolean {
    try {
      return this.normalize(phone1) === this.normalize(phone2);
    } catch {
      return false;
    }
  }
}
