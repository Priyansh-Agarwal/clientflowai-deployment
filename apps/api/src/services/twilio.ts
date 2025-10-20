import twilio from 'twilio';
import { createJobLogger } from '../config/logger';
import { redactString } from '../utils/redaction';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const webhookUrl = process.env.TWILIO_WEBHOOK_URL || 'https://api.clientflow.ai/webhooks/twilio';
const isSandboxMode = !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN;

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  orgId: string;
}

export interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  MessageStatus: string;
  SmsStatus: string;
  AccountSid: string;
  ApiVersion: string;
  Direction: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export class TwilioService {
  private logger = createJobLogger('twilio-service', 'twilio-service');

  /**
   * Send SMS message via Twilio
   */
  async sendSms(options: SendSmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, body, from, orgId } = options;
    
    this.logger.info('Sending SMS', {
      to: redactString(to),
      from: redactString(from || 'default'),
      bodyLength: body.length,
      orgId,
      sandboxMode: isSandboxMode,
    });

    if (isSandboxMode) {
      this.logger.warn('Twilio sandbox mode - SMS not sent', {
        to: redactString(to),
        body: redactString(body),
        orgId,
      });
      
      return {
        success: true,
        messageId: `sandbox_${Date.now()}`,
      };
    }

    try {
      const message = await client.messages.create({
        body: redactString(body),
        from: from || process.env.TWILIO_PHONE_NUMBER,
        to: redactString(to),
        statusCallback: `${webhookUrl}?orgId=${orgId}`,
      });

      this.logger.info('SMS sent successfully', {
        messageId: message.sid,
        to: redactString(to),
        status: message.status,
        orgId,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      this.logger.error('Failed to send SMS', {
        error: error.message,
        code: error.code,
        to: redactString(to),
        orgId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify Twilio webhook signature
   */
  verifyWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    if (isSandboxMode) {
      this.logger.warn('Twilio sandbox mode - skipping signature verification');
      return true;
    }

    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) {
        this.logger.error('Twilio auth token not configured');
        return false;
      }

      return twilio.validateRequest(authToken, signature, url, params);
    } catch (error: any) {
      this.logger.error('Failed to verify Twilio signature', {
        error: error.message,
        signature: redactString(signature),
      });
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: any): TwilioWebhookPayload | null {
    try {
      const payload: TwilioWebhookPayload = {
        MessageSid: body.MessageSid,
        From: body.From,
        To: body.To,
        Body: body.Body,
        MessageStatus: body.MessageStatus,
        SmsStatus: body.SmsStatus,
        AccountSid: body.AccountSid,
        ApiVersion: body.ApiVersion,
        Direction: body.Direction,
        ErrorCode: body.ErrorCode,
        ErrorMessage: body.ErrorMessage,
      };

      this.logger.debug('Parsed Twilio webhook payload', {
        messageSid: payload.MessageSid,
        from: redactString(payload.From),
        to: redactString(payload.To),
        status: payload.MessageStatus,
        direction: payload.Direction,
      });

      return payload;
    } catch (error: any) {
      this.logger.error('Failed to parse Twilio webhook payload', {
        error: error.message,
        body: redactString(JSON.stringify(body)),
      });
      return null;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    if (isSandboxMode) {
      return { status: 'delivered' };
    }

    try {
      const message = await client.messages(messageId).fetch();
      
      this.logger.debug('Retrieved message status', {
        messageId,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      });

      return {
        status: message.status,
        error: message.errorMessage,
      };
    } catch (error: any) {
      this.logger.error('Failed to get message status', {
        error: error.message,
        messageId,
      });

      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !isSandboxMode;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; sandboxMode: boolean } {
    return {
      configured: this.isConfigured(),
      sandboxMode: isSandboxMode,
    };
  }
}

export const twilioService = new TwilioService();
