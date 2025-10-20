import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { prisma } from '../lib/prisma';
import logger from '../middleware/logger';

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface SendSmsParams {
  to: string;
  body: string;
  orgId: string;
  from?: string;
  meta?: Record<string, any>;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  orgId: string;
  from?: string;
  meta?: Record<string, any>;
}

export class CommsService {
  static async sendSms({ to, body, orgId, from, meta = {} }: SendSmsParams) {
    try {
      const fromNumber = from || process.env.TWILIO_PHONE_NUMBER!;
      
      const message = await twilioClient.messages.create({
        body,
        from: fromNumber,
        to,
      });

      // Store message in database
      await prisma.message.create({
        data: {
          orgId,
          direction: 'outbound',
          channel: 'sms',
          toAddr: to,
          fromAddr: fromNumber,
          body,
          meta: {
            twilioSid: message.sid,
            status: message.status,
            ...meta,
          },
        },
      });

      logger.info('SMS sent successfully', {
        messageSid: message.sid,
        to,
        orgId,
      });

      return {
        id: message.sid,
        status: message.status,
        to,
        from: fromNumber,
      };
    } catch (error) {
      logger.error('Failed to send SMS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to,
        orgId,
      });
      throw error;
    }
  }

  static async sendEmail({ to, subject, html, orgId, from, meta = {} }: SendEmailParams) {
    try {
      const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || 'noreply@clientflow.ai';
      
      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
      };

      const response = await sgMail.send(msg);

      // Store message in database
      await prisma.message.create({
        data: {
          orgId,
          direction: 'outbound',
          channel: 'email',
          toAddr: to,
          fromAddr: fromEmail,
          body: html,
          meta: {
            sendgridMessageId: response[0].headers['x-message-id'],
            subject,
            ...meta,
          },
        },
      });

      logger.info('Email sent successfully', {
        messageId: response[0].headers['x-message-id'],
        to,
        subject,
        orgId,
      });

      return {
        id: response[0].headers['x-message-id'],
        status: 'sent',
        to,
        from: fromEmail,
      };
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to,
        subject,
        orgId,
      });
      throw error;
    }
  }

  static async handleInboundSms(from: string, body: string, orgId: string, meta: Record<string, any> = {}) {
    try {
      // Store inbound message
      const message = await prisma.message.create({
        data: {
          orgId,
          direction: 'inbound',
          channel: 'sms',
          toAddr: process.env.TWILIO_PHONE_NUMBER!,
          fromAddr: from,
          body,
          meta: {
            ...meta,
          },
        },
      });

      // Try to find or create contact
      let contact = await prisma.contact.findFirst({
        where: {
          orgId,
          phone: from,
        },
      });

      if (!contact) {
        // Create new contact from phone number
        contact = await prisma.contact.create({
          data: {
            orgId,
            firstName: 'Unknown',
            phone: from,
            tags: ['sms-lead'],
          },
        });

        logger.info('New contact created from SMS', {
          contactId: contact.id,
          phone: from,
          orgId,
        });
      }

      // Create activity
      await prisma.activity.create({
        data: {
          orgId,
          contactId: contact.id,
          type: 'sms',
          content: `Inbound SMS: ${body}`,
          meta: {
            messageId: message.id,
            direction: 'inbound',
          },
        },
      });

      logger.info('Inbound SMS processed', {
        messageId: message.id,
        contactId: contact.id,
        phone: from,
        orgId,
      });

      return { message, contact };
    } catch (error) {
      logger.error('Failed to process inbound SMS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        from,
        orgId,
      });
      throw error;
    }
  }

  static async handleInboundEmail(from: string, to: string, subject: string, html: string, orgId: string, meta: Record<string, any> = {}) {
    try {
      // Store inbound message
      const message = await prisma.message.create({
        data: {
          orgId,
          direction: 'inbound',
          channel: 'email',
          toAddr: to,
          fromAddr: from,
          body: html,
          meta: {
            subject,
            ...meta,
          },
        },
      });

      // Try to find or create contact
      let contact = await prisma.contact.findFirst({
        where: {
          orgId,
          email: from,
        },
      });

      if (!contact) {
        // Create new contact from email
        contact = await prisma.contact.create({
          data: {
            orgId,
            firstName: 'Unknown',
            email: from,
            tags: ['email-lead'],
          },
        });

        logger.info('New contact created from email', {
          contactId: contact.id,
          email: from,
          orgId,
        });
      }

      // Create activity
      await prisma.activity.create({
        data: {
          orgId,
          contactId: contact.id,
          type: 'email',
          content: `Inbound Email: ${subject}`,
          meta: {
            messageId: message.id,
            direction: 'inbound',
            subject,
          },
        },
      });

      logger.info('Inbound email processed', {
        messageId: message.id,
        contactId: contact.id,
        email: from,
        orgId,
      });

      return { message, contact };
    } catch (error) {
      logger.error('Failed to process inbound email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        from,
        orgId,
      });
      throw error;
    }
  }
}

