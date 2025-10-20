import twilio from 'twilio';
import { createRequestLogger } from '../config/logger';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;

export interface SendSmsOptions {
  orgId: string;
  to: string;
  body: string;
  from?: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sandbox?: boolean;
}

export async function sendSms({ orgId, to, body, from }: SendSmsOptions): Promise<SendSmsResult> {
  const logger = createRequestLogger({} as any);
  
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      logger.warn('Twilio credentials not configured, using sandbox mode', { orgId, to });
      return { success: true, sandbox: true };
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const fromNumber = from || TWILIO_FROM || '+15555551234';
    
    const message = await client.messages.create({
      to,
      from: fromNumber,
      body,
    });

    logger.info('SMS sent successfully', {
      orgId,
      to,
      messageId: message.sid,
      from: fromNumber,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    logger.error('Failed to send SMS', {
      orgId,
      to,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function verifyWebhookSignature(
  signature: string,
  url: string,
  payload: any
): Promise<boolean> {
  try {
    if (!TWILIO_SIGNING_SECRET) {
      logger.warn('Twilio signing secret not configured, skipping verification');
      return true; // Allow in development
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    return client.validateRequest(TWILIO_SIGNING_SECRET, signature, url, payload);
  } catch (error) {
    logger.error('Failed to verify Twilio webhook signature', { error });
    return false;
  }
}

export function parseWebhookPayload(payload: any) {
  try {
    return {
      MessageSid: payload.MessageSid,
      From: payload.From,
      To: payload.To,
      Body: payload.Body,
      MessageStatus: payload.MessageStatus,
      SmsStatus: payload.SmsStatus,
    };
  } catch (error) {
    logger.error('Failed to parse Twilio webhook payload', { error });
    return null;
  }
}
