import sgMail from '@sendgrid/mail';
import { createJobLogger } from '../config/logger';
import { redactString } from '../utils/redaction';

const isSandboxMode = !process.env.SENDGRID_API_KEY;

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  orgId: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface SendGridWebhookPayload {
  email: string;
  timestamp: number;
  smtp_id: string;
  event: string;
  category?: string[];
  sg_event_id: string;
  sg_message_id: string;
  response?: string;
  attempt?: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  status?: string;
  type?: string;
  unique_args?: Record<string, any>;
  marketing_campaign_id?: string;
  marketing_campaign_name?: string;
  orgId?: string;
}

export class SendGridService {
  private logger = createJobLogger('sendgrid-service', 'sendgrid-service');

  /**
   * Send email via SendGrid
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, html, text, from, orgId, templateId, templateData } = options;
    
    this.logger.info('Sending email', {
      to: Array.isArray(to) ? to.map(redactString) : redactString(to),
      subject: redactString(subject),
      from: redactString(from || 'default'),
      templateId,
      orgId,
      sandboxMode: isSandboxMode,
    });

    if (isSandboxMode) {
      this.logger.warn('SendGrid sandbox mode - email not sent', {
        to: Array.isArray(to) ? to.map(redactString) : redactString(to),
        subject: redactString(subject),
        orgId,
      });
      
      return {
        success: true,
        messageId: `sandbox_${Date.now()}`,
      };
    }

    try {
      const msg: any = {
        to: Array.isArray(to) ? to.map(redactString) : redactString(to),
        from: from || process.env.SENDGRID_FROM_EMAIL || 'noreply@clientflow.ai',
        subject: redactString(subject),
        html: redactString(html),
        text: text ? redactString(text) : undefined,
        customArgs: {
          orgId,
        },
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: false,
          },
          openTracking: {
            enable: true,
          },
        },
      };

      if (templateId) {
        msg.templateId = templateId;
        if (templateData) {
          msg.dynamicTemplateData = templateData;
        }
      }

      const response = await sgMail.send(msg);

      this.logger.info('Email sent successfully', {
        messageId: response[0].headers['x-message-id'],
        to: Array.isArray(to) ? to.map(redactString) : redactString(to),
        statusCode: response[0].statusCode,
        orgId,
      });

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
      };
    } catch (error: any) {
      this.logger.error('Failed to send email', {
        error: error.message,
        code: error.code,
        to: Array.isArray(to) ? to.map(redactString) : redactString(to),
        orgId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse SendGrid webhook payload
   */
  parseWebhookPayload(body: any): SendGridWebhookPayload[] {
    try {
      const events = Array.isArray(body) ? body : [body];
      
      const parsedEvents = events.map((event: any) => ({
        email: event.email,
        timestamp: event.timestamp,
        smtp_id: event.smtp_id,
        event: event.event,
        category: event.category,
        sg_event_id: event.sg_event_id,
        sg_message_id: event.sg_message_id,
        response: event.response,
        attempt: event.attempt,
        useragent: event.useragent,
        ip: event.ip,
        url: event.url,
        reason: event.reason,
        status: event.status,
        type: event.type,
        unique_args: event.unique_args,
        marketing_campaign_id: event.marketing_campaign_id,
        marketing_campaign_name: event.marketing_campaign_name,
        orgId: event.unique_args?.orgId,
      }));

      this.logger.debug('Parsed SendGrid webhook payload', {
        eventCount: parsedEvents.length,
        events: parsedEvents.map(e => ({
          email: redactString(e.email),
          event: e.event,
          sg_message_id: e.sg_message_id,
          orgId: e.orgId,
        })),
      });

      return parsedEvents;
    } catch (error: any) {
      this.logger.error('Failed to parse SendGrid webhook payload', {
        error: error.message,
        body: redactString(JSON.stringify(body)),
      });
      return [];
    }
  }

  /**
   * Verify SendGrid webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string
  ): boolean {
    if (isSandboxMode) {
      this.logger.warn('SendGrid sandbox mode - skipping signature verification');
      return true;
    }

    try {
      const crypto = require('crypto');
      const publicKey = process.env.SENDGRID_PUBLIC_KEY;
      
      if (!publicKey) {
        this.logger.error('SendGrid public key not configured');
        return false;
      }

      const expectedSignature = crypto
        .createVerify('sha256')
        .update(timestamp + payload)
        .verify(publicKey, signature, 'base64');

      this.logger.debug('SendGrid signature verification', {
        verified: expectedSignature,
        timestamp,
      });

      return expectedSignature;
    } catch (error: any) {
      this.logger.error('Failed to verify SendGrid signature', {
        error: error.message,
        signature: redactString(signature),
      });
      return false;
    }
  }

  /**
   * Create email template
   */
  async createTemplate(template: {
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
  }): Promise<{ success: boolean; templateId?: string; error?: string }> {
    if (isSandboxMode) {
      this.logger.warn('SendGrid sandbox mode - template not created');
      return {
        success: true,
        templateId: `sandbox_template_${Date.now()}`,
      };
    }

    try {
      const response = await sgMail.request({
        method: 'POST',
        url: '/v3/templates',
        body: {
          name: template.name,
          generation: 'dynamic',
          subject: template.subject,
          html_content: template.htmlContent,
          plain_content: template.textContent,
        },
      });

      this.logger.info('Template created successfully', {
        templateId: response.body.id,
        name: template.name,
      });

      return {
        success: true,
        templateId: response.body.id,
      };
    } catch (error: any) {
      this.logger.error('Failed to create template', {
        error: error.message,
        name: template.name,
      });

      return {
        success: false,
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

export const sendGridService = new SendGridService();
