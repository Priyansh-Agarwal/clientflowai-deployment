import twilio from 'twilio';
import moment from 'moment';
import { Appointment } from '../types/database';

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
}

let twilioClient: twilio.Twilio | null = null;

// Initialize Twilio client
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export class SMSService {
  /**
   * Check if SMS service is available
   */
  static isAvailable(): boolean {
    return twilioClient !== null;
  }

  /**
   * Send appointment confirmation SMS
   */
  static async sendConfirmation(appointment: Appointment): Promise<void> {
    if (!twilioClient) {
      console.log('Twilio not configured, skipping SMS confirmation');
      return;
    }

    const formattedDate = moment(appointment.scheduled_at).format('MMMM D, YYYY [at] h:mm A');
    const businessName = 'Your Business'; // This should come from business settings
    
    const message = `Your appointment has been confirmed!\n\n📅 ${formattedDate}\n📍 ${appointment.service_name}\n💰 Duration: ${appointment.duration} minutes\n\nReply STOP to unsubscribe.`;

    try {
      const messageResult = await twilioClient.messages.create({
        body: message,
        from: fromNumber!,
        to: appointment.customer_phone,
      });

      console.log(`SMS confirmation sent to ${appointment.customer_phone}:`, messageResult.sid);
    } catch (error) {
      console.error('Failed to send SMS confirmation:', error);
      throw new Error('Failed to send SMS confirmation');
    }
  }

  /**
   * Send appointment rescheduled SMS
   */
  static async sendRescheduledNotification(appointment: Appointment, oldDate?: string): Promise<void> {
    if (!twilioClient) {
      console.log('Twilio not configured, skipping SMS reschedule notification');
      return;
    }

    const newDate = moment(appointment.scheduled_at).format('MMMM D, YYYY [at] h:mm A');
    const oldDateStr = oldDate ? moment(oldDate).format('MMMM D, YYYY [at] h:mm A') : 'previously scheduled time';
    
    const message = `Your appointment has been rescheduled.\n\n📅 New time: ${newDate}\n📍 Service: ${appointment.service_name}\n\nPlease reply if you need to make changes.`;

    try {
      const messageResult = await twilioClient.messages.create({
        body: message,
        from: fromNumber!,
        to: appointment.customer_phone,
      });

      console.log(`SMS reschedule notification sent to ${appointment.customer_phone}:`, messageResult.sid);
    } catch (error) {
      console.error('Failed to send SMS rescheduled notification:', error);
      throw new Error('Failed to send SMS reschedule notification');
    }
  }

  /**
   * Send appointment cancelled SMS
   */
  static async sendCancelledSMS(appointment: Appointment, cancellationReason?: string): Promise<void> {
    if (!twilioClient) {
      console.log('Twilio not configured, skipping SMS cancellation notification');
      return;
    }

    const formattedDate = moment(appointment.scheduled_at).format('MMMM D, YYYY [at] h:mm A');
    const reasonText = cancellationReason ? `Reason: ${cancellationReason}\n\n` : '';
    
    const message = `Your appointment scheduled for ${formattedDate} has been cancelled.\n\n${reasonText}Please call us to reschedule. We're sorry for any inconvenience.`;

    try {
      const messageResult = await twilioClient.messages.create({
        body: message,
        from: fromNumber!,
        to: appointment.customer_phone,
      });

      console.log(`SMS cancellation sent to ${appointment.customer_phone}:`, messageResult.sid);
    } catch (error) {
      console.error('Failed to send SMS cancellation:', error);
      throw new Error('Failed to send SMS cancellation');
    }
  }

  /**
   * Send appointment reminder SMS
   */
  static async sendReminder(appointment: Appointment): Promise<void> {
    if (!twilioClient) {
      console.log('Twilio not configured, skipping SMS reminder');
      return;
    }

    const formattedDate = moment(appointment.scheduled_at).format('MMMM D, YYYY [at] h:mm A');
    const timeUntilAppointment = moment(appointment.scheduled_at).diff(moment(), 'hours');
    
    let reminderText = '';
    if (timeUntilAppointment > 24) {
      reminderText = 'This is a friendly reminder about your upcoming appointment';
    } else if (timeUntilAppointment > 2) {
      reminderText = 'Just a reminder that you have an appointment tomorrow';
    } else {
      reminderText = 'Just a reminder that you have an appointment today';
    }
    
    const message = `${reminderText}:\n\n📅 ${formattedDate}\n📍 ${appointment.service_name}\n💰 Duration: ${appointment.duration} minutes\n\nReply STOP to unsubscribe.`;

    try {
      const messageResult = await twilioClient.messages.create({
        body: message,
        from: fromNumber!,
        to: appointment.customer_phone,
      });

      console.log(`SMS reminder sent to ${appointment.customer_phone}:`, messageResult.sid);
    } catch (error) {
      console.error('Failed to send SMS reminder:', error);
      throw new Error('Failed to send SMS reminder');
    }
  }

  /**
   * Send general SMS notification
   */
  static async sendNotification(phoneNumber: string, message: string): Promise<void> {
    if (!twilioClient) {
      console.log('Twilio not configured, skipping SMS notification');
      return;
    }

    try {
      const messageResult = await twilioClient.messages.create({
        body: message,
        from: fromNumber!,
        to: phoneNumber,
      });

      console.log(`SMS notification sent to ${phoneNumber}:`, messageResult.sid);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      throw new Error('Failed to send SMS notification');
    }
  }

  /**
   * Validate phone number format for SMS
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Basic validation for SMS
    if (cleaned.startsWith('+')) {
      return cleaned.length >= 12 && cleaned.length <= 15; // International format
    } else {
      return cleaned.length === 10 || cleaned.length === 11; // US format
    }
  }

  /**
   * Format phone number for Twilio
   */
  static formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, assume it's US number
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
    }
    
    return cleaned;
  }

  /**
   * Check SMS send history to avoid spam
   */
  static async shouldSendSMS(phoneNumber: string, messageType: string): Promise<boolean> {
    // This could be enhanced to check against a database table for SMS history
    // For now, we'll implement basic rate limiting logic
    
    const now = moment();
    
    // Check if we've sent more than X messages in the last hour to this number
    // This would typically query a database table like sms_logs
    // For now, we'll return true (implement your own rate limiting logic)
    
    return true;
  }
}

export default SMSService;
