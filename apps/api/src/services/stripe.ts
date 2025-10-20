import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import logger from '../middleware/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface CreateCheckoutSessionParams {
  orgId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CreatePortalSessionParams {
  orgId: string;
  returnUrl: string;
}

export class StripeService {
  static async createCheckoutSession({
    orgId,
    priceId,
    successUrl,
    cancelUrl,
    customerEmail,
    metadata = {},
  }: CreateCheckoutSessionParams) {
    try {
      // Get or create Stripe customer
      let customerId: string;
      
      if (customerEmail) {
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1,
        });
        
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: customerEmail,
            metadata: { orgId },
          });
          customerId = customer.id;
        }
      } else {
        // Create customer without email
        const customer = await stripe.customers.create({
          metadata: { orgId },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          orgId,
          ...metadata,
        },
      });

      logger.info('Stripe checkout session created', {
        sessionId: session.id,
        orgId,
        customerId,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create Stripe checkout session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
        priceId,
      });
      throw error;
    }
  }

  static async createPortalSession({ orgId, returnUrl }: CreatePortalSessionParams) {
    try {
      // Find the customer for this organization
      const customers = await stripe.customers.list({
        metadata: { orgId },
        limit: 1,
      });

      if (customers.data.length === 0) {
        throw new Error('No Stripe customer found for organization');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: returnUrl,
      });

      logger.info('Stripe portal session created', {
        sessionId: session.id,
        orgId,
        customerId: customers.data[0].id,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create Stripe portal session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
      });
      throw error;
    }
  }

  static async handleWebhookEvent(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        default:
          logger.info('Unhandled Stripe webhook event', { type: event.type });
      }
    } catch (error) {
      logger.error('Failed to handle Stripe webhook event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type,
        eventId: event.id,
      });
      throw error;
    }
  }

  private static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const orgId = session.metadata?.orgId;
    if (!orgId) {
      logger.warn('Checkout session completed without orgId', { sessionId: session.id });
      return;
    }

    // Update organization with subscription info
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        // Add subscription fields to organization if needed
        // subscriptionId: session.subscription as string,
        // subscriptionStatus: 'active',
      },
    });

    logger.info('Checkout session completed', {
      sessionId: session.id,
      orgId,
      customerId: session.customer,
    });
  }

  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const orgId = invoice.metadata?.orgId;
    if (!orgId) {
      logger.warn('Invoice payment failed without orgId', { invoiceId: invoice.id });
      return;
    }

    // Handle payment failure - could send notification, update status, etc.
    logger.warn('Invoice payment failed', {
      invoiceId: invoice.id,
      orgId,
      customerId: invoice.customer,
    });
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const orgId = subscription.metadata?.orgId;
    if (!orgId) {
      logger.warn('Subscription updated without orgId', { subscriptionId: subscription.id });
      return;
    }

    // Update organization with new subscription status
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        // subscriptionId: subscription.id,
        // subscriptionStatus: subscription.status,
      },
    });

    logger.info('Subscription updated', {
      subscriptionId: subscription.id,
      orgId,
      status: subscription.status,
    });
  }
}

