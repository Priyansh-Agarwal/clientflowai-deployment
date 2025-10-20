import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { twilioService } from '../services/twilio';
import { sendGridService } from '../services/sendgrid';
import { googleCalendarService } from '../services/google-calendar';
import { createRequestLogger } from '../config/logger';
import { redactString } from '../utils/redaction';

const router = Router();
const prisma = new PrismaClient();

// Stripe webhook handler
router.post('/stripe', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;
    
    logger.info('Stripe webhook received', {
      eventType: payload.type,
      eventId: payload.id,
    });

    // Verify webhook signature
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        JSON.stringify(payload),
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: err });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      default:
        logger.info('Unhandled Stripe event type', { eventType: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleCheckoutCompleted(session: any) {
  const logger = createRequestLogger({} as Request);
  
  try {
    const orgId = session.metadata?.orgId;
    if (!orgId) {
      logger.warn('No orgId in checkout session metadata');
      return;
    }

    // Update subscription
    await prisma.subscription.upsert({
      where: { orgId },
      update: {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        plan: session.metadata?.plan || 'pro',
        status: 'active',
        currentPeriodStart: new Date(session.subscription_details?.current_period_start * 1000),
        currentPeriodEnd: new Date(session.subscription_details?.current_period_end * 1000),
      },
      create: {
        orgId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        plan: session.metadata?.plan || 'pro',
        status: 'active',
        currentPeriodStart: new Date(session.subscription_details?.current_period_start * 1000),
        currentPeriodEnd: new Date(session.subscription_details?.current_period_end * 1000),
      },
    });

    logger.info('Subscription created/updated', { orgId, plan: session.metadata?.plan });
  } catch (error) {
    logger.error('Failed to handle checkout completion', { error });
  }
}

async function handlePaymentFailed(invoice: any) {
  const logger = createRequestLogger({} as Request);
  
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeCustomerId: invoice.customer },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'past_due' },
      });

      logger.info('Subscription marked as past due', { orgId: subscription.orgId });
    }
  } catch (error) {
    logger.error('Failed to handle payment failure', { error });
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const logger = createRequestLogger({} as Request);
  
  try {
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      logger.info('Subscription updated', { orgId: dbSubscription.orgId, status: subscription.status });
    }
  } catch (error) {
    logger.error('Failed to handle subscription update', { error });
  }
}

// Twilio webhook handler
router.post('/twilio', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  
  try {
    const signature = req.headers['x-twilio-signature'] as string;
    const payload = req.body;
    
    logger.info('Twilio webhook received', {
      messageSid: payload.MessageSid,
      from: redactString(payload.From),
      to: redactString(payload.To),
    });

    // Verify webhook signature
    const isValid = twilioService.verifyWebhookSignature(
      signature,
      req.originalUrl,
      payload
    );

    if (!isValid) {
      logger.error('Twilio webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse webhook payload
    const messageData = twilioService.parseWebhookPayload(payload);
    if (!messageData) {
      logger.error('Failed to parse Twilio webhook payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Extract orgId from webhook URL or message metadata
    const orgId = req.query.orgId as string;
    if (!orgId) {
      logger.warn('No orgId in Twilio webhook');
      return res.status(400).json({ error: 'Missing orgId' });
    }

    // Store inbound message
    await prisma.message.create({
      data: {
        orgId,
        direction: 'inbound',
        channel: 'sms',
        toAddr: messageData.To,
        fromAddr: messageData.From,
        body: messageData.Body,
        meta: {
          messageSid: messageData.MessageSid,
          messageStatus: messageData.MessageStatus,
          smtpId: messageData.SmsStatus,
        },
      },
    });

    // Upsert contact
    await upsertContactFromMessage(orgId, messageData.From, messageData.Body);

    logger.info('Twilio message processed', { messageSid: messageData.MessageSid, orgId });
    res.json({ received: true });
  } catch (error) {
    logger.error('Twilio webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// SendGrid webhook handler
router.post('/sendgrid-inbound', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  
  try {
    const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
    const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
    const payload = req.body;
    
    logger.info('SendGrid inbound webhook received', {
      from: redactString(payload.from),
      to: redactString(payload.to),
      subject: redactString(payload.subject),
    });

    // Verify webhook signature
    const isValid = sendGridService.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
      timestamp
    );

    if (!isValid) {
      logger.error('SendGrid webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Extract orgId from email headers or metadata
    const orgId = payload.headers?.['x-org-id'] || req.query.orgId as string;
    if (!orgId) {
      logger.warn('No orgId in SendGrid webhook');
      return res.status(400).json({ error: 'Missing orgId' });
    }

    // Store inbound email
    await prisma.message.create({
      data: {
        orgId,
        direction: 'inbound',
        channel: 'email',
        toAddr: payload.to,
        fromAddr: payload.from,
        body: payload.text || payload.html,
        meta: {
          subject: payload.subject,
          headers: payload.headers,
          attachments: payload.attachments,
        },
      },
    });

    // Upsert contact
    await upsertContactFromMessage(orgId, payload.from, payload.text || payload.html);

    logger.info('SendGrid email processed', { orgId, from: redactString(payload.from) });
    res.json({ received: true });
  } catch (error) {
    logger.error('SendGrid webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Google Calendar webhook handler
router.post('/gcal', async (req: Request, res: Response) => {
  const logger = createRequestLogger(req);
  
  try {
    const payload = req.body;
    const token = req.headers['x-goog-channel-token'] as string;
    
    logger.info('Google Calendar webhook received', {
      channelId: payload.id,
      resourceId: payload.resourceId,
      type: payload.type,
    });

    // Verify webhook token
    const orgId = token;
    if (!orgId) {
      logger.warn('No orgId token in Google Calendar webhook');
      return res.status(400).json({ error: 'Missing orgId token' });
    }

    const isValid = googleCalendarService.verifyWebhookToken(token, orgId);
    if (!isValid) {
      logger.error('Google Calendar webhook token verification failed');
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Parse webhook payload
    const webhookData = googleCalendarService.parseWebhookPayload(payload);
    if (!webhookData) {
      logger.error('Failed to parse Google Calendar webhook payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Sync calendar events
    await syncCalendarEvents(orgId, webhookData.resourceUri);

    logger.info('Google Calendar webhook processed', { orgId, channelId: webhookData.id });
    res.json({ received: true });
  } catch (error) {
    logger.error('Google Calendar webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper functions
async function upsertContactFromMessage(orgId: string, fromAddr: string, body: string) {
  const logger = createRequestLogger({} as Request);
  
  try {
    // Extract contact info from message
    const isEmail = fromAddr.includes('@');
    const contactData: any = { orgId };

    if (isEmail) {
      contactData.email = fromAddr;
      // Try to extract name from email
      const emailName = fromAddr.split('@')[0];
      contactData.firstName = emailName.split('.')[0];
      contactData.lastName = emailName.split('.')[1];
    } else {
      contactData.phone = fromAddr;
      contactData.firstName = 'Unknown';
    }

    // Check if contact already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        orgId,
        OR: [
          { email: contactData.email },
          { phone: contactData.phone },
        ],
      },
    });

    if (existingContact) {
      logger.debug('Contact already exists', { contactId: existingContact.id });
      return existingContact;
    }

    // Create new contact
    const contact = await prisma.contact.create({
      data: contactData,
    });

    logger.info('Contact created from message', { contactId: contact.id, orgId });
    return contact;
  } catch (error) {
    logger.error('Failed to upsert contact from message', { error });
  }
}

async function syncCalendarEvents(orgId: string, resourceUri: string) {
  const logger = createRequestLogger({} as Request);
  
  try {
    // Get calendar connection
    const connection = await prisma.calendarConnection.findFirst({
      where: { orgId, provider: 'google' },
    });

    if (!connection) {
      logger.warn('No Google Calendar connection found', { orgId });
      return;
    }

    // This would integrate with Google Calendar API to sync events
    // For now, just log the sync request
    logger.info('Calendar sync requested', { orgId, resourceUri });
    
    // Update last sync time
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  } catch (error) {
    logger.error('Failed to sync calendar events', { error });
  }
}

export default router;