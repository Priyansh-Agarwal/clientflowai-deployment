import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll capture manually
    });
  }
};

export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(event, properties);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.identify(userId, properties);
  }
};

export const resetUser = () => {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.reset();
  }
};

// Common events
export const events = {
  contactCreated: (contactId: string, orgId: string) => 
    trackEvent('contact_created', { contactId, orgId }),
  
  dealStageChanged: (dealId: string, fromStage: string, toStage: string, orgId: string) =>
    trackEvent('deal_stage_changed', { dealId, fromStage, toStage, orgId }),
  
  messageSent: (channel: string, orgId: string) =>
    trackEvent('message_sent', { channel, orgId }),
  
  appointmentCreated: (appointmentId: string, orgId: string) =>
    trackEvent('appointment_created', { appointmentId, orgId }),
  
  automationCreated: (automationId: string, type: string, orgId: string) =>
    trackEvent('automation_created', { automationId, type, orgId }),
  
  userLoggedIn: (userId: string, method: string) =>
    trackEvent('user_logged_in', { userId, method }),
  
  organizationSwitched: (orgId: string, userId: string) =>
    trackEvent('organization_switched', { orgId, userId }),
};

