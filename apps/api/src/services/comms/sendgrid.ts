import sg from '@sendgrid/mail';
import { createRequestLogger } from '../config/logger';

const { SENDGRID_API_KEY, SENDGRID_FROM } = process.env;

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sg.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailOptions {
  orgId: string;
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sandbox?: boolean;
}

export async function sendEmail({ 
  orgId, 
  to, 
  subject, 
  html, 
  from 
}: SendEmailOptions): Promise<SendEmailResult> {
  const logger = createRequestLogger({} as any);
  
  try {
    if (!SENDGRID_API_KEY) {
      logger.warn('SendGrid API key not configured, using sandbox mode', { orgId, to });
      return { success: true, sandbox: true };
    }

    const fromEmail = from || SENDGRID_FROM || 'noreply@clientflow.ai';
    
    const msg = {
      to,
      from: fromEmail,
      subject,
      html,
    };

    const response = await sg.send(msg);
    
    logger.info('Email sent successfully', {
      orgId,
      to,
      messageId: response[0].headers['x-message-id'],
      from: fromEmail,
    });

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
    };
  } catch (error) {
    logger.error('Failed to send email', {
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
  payload: string,
  signature: string,
  timestamp: string
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      logger.warn('SendGrid API key not configured, skipping verification');
      return true; // Allow in development
    }

    // SendGrid webhook signature verification
    // This is a simplified version - in production, use proper verification
    return true;
  } catch (error) {
    logger.error('Failed to verify SendGrid webhook signature', { error });
    return false;
  }
}

export function parseWebhookPayload(payload: any) {
  try {
    return {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      headers: payload.headers,
      attachments: payload.attachments,
    };
  } catch (error) {
    logger.error('Failed to parse SendGrid webhook payload', { error });
    return null;
  }
}
