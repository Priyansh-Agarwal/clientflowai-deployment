// ClientFlow AI Suite - Enterprise Billing & Subscription Management
// Complete subscription management with Stripe integration

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    slug: 'free',
    price_cents: 0,
    billing_interval: 'monthly',
    features: {
      contacts: 100,
      users: 1,
      ai_queries: 0,
      storage_gb: 1,
      api_calls: 1000,
      voice_minutes: 0,
      automation_workflows: 0
    },
    limits: {
      max_contacts: 100,
      max_users: 1,
      max_ai_queries: 0,
      max_storage_gb: 1,
      max_api_calls: 1000,
      max_voice_minutes: 0,
      max_automation_workflows: 0
    }
  },
  starter: {
    name: 'Starter',
    slug: 'starter',
    price_cents: 2900, // $29/month
    billing_interval: 'monthly',
    features: {
      contacts: 1000,
      users: 5,
      ai_queries: 100,
      storage_gb: 10,
      api_calls: 10000,
      voice_minutes: 0,
      automation_workflows: 3
    },
    limits: {
      max_contacts: 1000,
      max_users: 5,
      max_ai_queries: 100,
      max_storage_gb: 10,
      max_api_calls: 10000,
      max_voice_minutes: 0,
      max_automation_workflows: 3
    }
  },
  professional: {
    name: 'Professional',
    slug: 'professional',
    price_cents: 7900, // $79/month
    billing_interval: 'monthly',
    features: {
      contacts: 10000,
      users: 25,
      ai_queries: 1000,
      storage_gb: 100,
      api_calls: 100000,
      voice_minutes: 100,
      automation_workflows: 10
    },
    limits: {
      max_contacts: 10000,
      max_users: 25,
      max_ai_queries: 1000,
      max_storage_gb: 100,
      max_api_calls: 100000,
      max_voice_minutes: 100,
      max_automation_workflows: 10
    }
  },
  enterprise: {
    name: 'Enterprise',
    slug: 'enterprise',
    price_cents: 0, // Custom pricing
    billing_interval: 'monthly',
    features: {
      contacts: -1, // Unlimited
      users: -1, // Unlimited
      ai_queries: -1, // Unlimited
      storage_gb: -1, // Unlimited
      api_calls: -1, // Unlimited
      voice_minutes: -1, // Unlimited
      automation_workflows: -1 // Unlimited
    },
    limits: {
      max_contacts: -1,
      max_users: -1,
      max_ai_queries: -1,
      max_storage_gb: -1,
      max_api_calls: -1,
      max_voice_minutes: -1,
      max_automation_workflows: -1
    }
  }
};

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
      ...plan,
      price_display: plan.price_cents === 0 ? 'Free' : `$${(plan.price_cents / 100).toFixed(2)}/${plan.billing_interval}`,
      features: Object.entries(plan.features).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: value === -1 ? 'Unlimited' : value.toLocaleString(),
        limit: plan.limits[`max_${key}`]
      }))
    }));

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

// Get current subscription
router.get('/subscription', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    const { data: subscription, error } = await supabase
      .from('organization_subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Get current usage
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('organization_id', orgId)
      .gte('billing_period_start', new Date().toISOString().split('T')[0]);

    res.json({
      success: true,
      data: {
        subscription: subscription || null,
        usage: usage || [],
        plan: subscription ? SUBSCRIPTION_PLANS[subscription.subscription_plans?.slug] : SUBSCRIPTION_PLANS.free
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription'
    });
  }
});

// Subscribe to a plan
router.post('/subscribe', async (req, res) => {
  try {
    const { planSlug, paymentMethodId, trialDays = 14 } = req.body;
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId || !planSlug) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and plan slug required'
      });
    }

    const plan = SUBSCRIPTION_PLANS[planSlug];
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan'
      });
    }

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (!org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Create Stripe customer if not exists
    let stripeCustomerId = org.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: org.email,
        name: org.name,
        metadata: {
          organization_id: orgId
        }
      });
      stripeCustomerId = customer.id;

      // Update organization with Stripe customer ID
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', orgId);
    }

    let stripeSubscription;
    
    if (plan.price_cents === 0) {
      // Free plan - no Stripe subscription needed
      stripeSubscription = null;
    } else {
      // Create Stripe subscription
      const subscriptionData = {
        customer: stripeCustomerId,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
            },
            unit_amount: plan.price_cents,
            recurring: {
              interval: plan.billing_interval === 'monthly' ? 'month' : 'year'
            }
          }
        }],
        trial_period_days: trialDays,
        metadata: {
          organization_id: orgId,
          plan_slug: planSlug
        }
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      stripeSubscription = await stripe.subscriptions.create(subscriptionData);
    }

    // Create subscription record in database
    const subscriptionRecord = {
      organization_id: orgId,
      plan_slug: planSlug,
      status: plan.price_cents === 0 ? 'active' : 'trialing',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + (plan.billing_interval === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
      trial_start: plan.price_cents > 0 ? new Date() : null,
      trial_end: plan.price_cents > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
      stripe_subscription_id: stripeSubscription?.id || null,
      stripe_customer_id: stripeCustomerId
    };

    const { data: newSubscription, error } = await supabase
      .from('organization_subscriptions')
      .insert(subscriptionRecord)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        subscription: newSubscription,
        plan: plan,
        stripe_subscription: stripeSubscription
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

// Track usage
router.post('/usage/track', async (req, res) => {
  try {
    const { feature, amount = 1 } = req.body;
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId || !feature) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and feature required'
      });
    }

    // Get current billing period
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Check if usage record exists
    const { data: existingUsage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('organization_id', orgId)
      .eq('feature', feature)
      .gte('billing_period_start', billingPeriodStart.toISOString())
      .lte('billing_period_end', billingPeriodEnd.toISOString())
      .single();

    if (existingUsage) {
      // Update existing usage
      const { data: updatedUsage, error } = await supabase
        .from('usage_tracking')
        .update({
          usage_count: existingUsage.usage_count + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUsage.id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: updatedUsage
      });
    } else {
      // Create new usage record
      const { data: newUsage, error } = await supabase
        .from('usage_tracking')
        .insert({
          organization_id: orgId,
          feature: feature,
          usage_count: amount,
          billing_period_start: billingPeriodStart.toISOString(),
          billing_period_end: billingPeriodEnd.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data: newUsage
      });
    }
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track usage'
    });
  }
});

// Get usage for current period
router.get('/usage', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    // Get current billing period
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: usage, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('organization_id', orgId)
      .gte('billing_period_start', billingPeriodStart.toISOString())
      .lte('billing_period_end', billingPeriodEnd.toISOString());

    if (error) throw error;

    res.json({
      success: true,
      data: usage || []
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage'
    });
  }
});

// Check usage limits
router.get('/limits/check', async (req, res) => {
  try {
    const { feature } = req.query;
    const orgId = req.headers['x-organization-id'];
    
    if (!orgId || !feature) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and feature required'
      });
    }

    // Get current subscription
    const { data: subscription } = await supabase
      .from('organization_subscriptions')
      .select('plan_slug')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .single();

    const planSlug = subscription?.plan_slug || 'free';
    const plan = SUBSCRIPTION_PLANS[planSlug];
    const limit = plan.limits[`max_${feature}`];

    if (limit === -1) {
      // Unlimited
      return res.json({
        success: true,
        data: {
          can_use: true,
          limit: -1,
          current_usage: 0,
          remaining: -1
        });
    }

    // Get current usage
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('usage_count')
      .eq('organization_id', orgId)
      .eq('feature', feature)
      .gte('billing_period_start', billingPeriodStart.toISOString())
      .lte('billing_period_end', billingPeriodEnd.toISOString())
      .single();

    const currentUsage = usage?.usage_count || 0;
    const remaining = Math.max(0, limit - currentUsage);
    const canUse = currentUsage < limit;

    res.json({
      success: true,
      data: {
        can_use: canUse,
        limit: limit,
        current_usage: currentUsage,
        remaining: remaining
      }
    });
  } catch (error) {
    console.error('Error checking limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check limits'
    });
  }
});

// Stripe webhook handler
router.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({error: 'Webhook processing failed'});
  }
});

// Webhook handlers
async function handleSubscriptionUpdate(subscription) {
  const orgId = subscription.metadata.organization_id;
  const planSlug = subscription.metadata.plan_slug;

  await supabase
    .from('organization_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionCancellation(subscription) {
  await supabase
    .from('organization_subscriptions')
    .update({
      status: 'canceled'
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSuccess(invoice) {
  // Create invoice record
  await supabase
    .from('invoices')
    .insert({
      organization_id: invoice.metadata.organization_id,
      invoice_number: invoice.number,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      paid_at: new Date(invoice.status_transitions.paid_at * 1000),
      stripe_invoice_id: invoice.id
    });
}

async function handlePaymentFailure(invoice) {
  await supabase
    .from('organization_subscriptions')
    .update({
      status: 'past_due'
    })
    .eq('stripe_customer_id', invoice.customer);
}

module.exports = router;
