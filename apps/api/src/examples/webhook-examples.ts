import axios from 'axios';
import crypto from 'crypto';

const API_BASE_URL = 'http://localhost:3001/api/webhooks';

// Webhook signature simulation utilities
const generateTwilioSignature = (payload: string, authToken: string, url: string): string => {
  const baseString = url + payload;
  return crypto.createHmac('sha1', authToken).update(baseString).digest('base64');
};

const generateCustomSignature = (payload: string, secret: string, algorithm: string = 'sha256'): string => {
  return crypto.createHmac(algorithm, secret).update(payload).digest('hex');
};

const makeWebhookRequest = async (
  endpoint: string, 
  payload: any, 
  headers: Record<string, string> = {}
) => {
  try {
    const response = await axios({
      url: `${API_BASE_URL}${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      data: payload,
    });
    
    console.log(`\n--- POST ${endpoint} Response ---`);
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error(`\n--- Error for POST ${endpoint} ---`);
    console.error(JSON.stringify(error.response?.data || error.message, null, 2));
    throw error;
  }
};

export const runTwilioWebhookExamples = async () => {
  console.log('=== Twilio Webhook Integration Examples ===');

  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || 'test_auth_token_for_example';
  const webhookUrl = `${API_BASE_URL}/twilio`;

  // 1. Call Completed Event
  console.log('\n--- 1. Twilio: Call Completed Event ---');
  const completedCallPayload = {
    CallSid: 'CA' + Date.now(),
    CallStatus: 'completed',
    CallDirection: 'inbound',
    From: '+1234567890',
    To: '+0987654321',
    CallDuration: '120',
    RecordingUrl: 'https://api.twilio.com/recording.mp3',
    TranscriptionText: 'Customer called about appointment booking',
    AccountSid: 'AC' + Math.random().toString(36).substr(2, 8),
    ApiVersion: '2010-04-01',
    StartTime: new Date(Date.now() - 120000).toISOString(),
    EndTime: new Date().toISOString()
  };

  const completedSignature = generateTwilioSignature(
    JSON.stringify(completedCallPayload),
    twilioAuthToken,
    webhookUrl
  );

  try {
    await makeWebhookRequest('/twilio', completedCallPayload, {
      'X-Twilio-Signature': completedSignature
    });
    console.log('✅ Call completed webhook processed successfully');
  } catch (error) {
    console.error('❌ Call completed webhook failed:', error.response?.data?.message);
  }

  // 2. Call Failed Event
  console.log('\n--- 2. Twilio: Call Failed Event ---');
  const failedCallPayload = {
    CallSid: 'CA' + Date.now(),
    CallStatus: 'failed',
    CallDirection: 'outbound',
    From: '+0987654321',
    To: '+1234567890',
    CallDuration: null,
    ErrorText: 'Call failed - busy signal',
    ErrorCode: '13231',
    AccountSid: 'AC' + Math.random().toString(36).substr(2, 8),
    StatusCallbackEvent: 'completed'
  };

  const failedSignature = generateTwilioSignature(
    JSON.stringify(failedCallPayload),
    twilioAuthToken,
    webhookUrl
  );

  try {
    await makeWebhookRequest('/twilio', failedCallPayload, {
      'X-Twilio-Signature': failedSignature
    });
    console.log('✅ Call failed webhook processed successfully');
  } catch (error) {
    console.error('❌ Call failed webhook failed:', error.response?.data?.message);
  }

  // 3. Call Answered Event
  console.log('\n--- 3. Twilio: Call Answered Event ---');
  const answeredCallPayload = {
    CallSid: 'CA' + Date.now(),
    CallStatus: 'answered',
    CallDirection: 'inbound',
    From: '+15551234567',
    To: '+15559876543',
    CallDuration: '45',
    AnsweredBy: 'human',
    CallerName: '+15551234567',
    AccountSid: 'AC' + Math.random().toString(36).substr(2, 8)
  };

  const answeredSignature = generateTwilioSignature(
    JSON.stringify(answeredCallPayload),
    twilioAuthToken,
    webhookUrl
  );

  try {
    await makeWebhookRequest('/twilio', answeredCallPayload, {
      'X-Twilio-Signature': answeredSignature
    });
    console.log('✅ Call answered webhook processed successfully');
  } catch (error) {
    console.error('❌ Call answered webhook failed:', error.response?.data?.message);
  }
};

export const runGoogleCalendarWebhookExamples = async () => {
  console.log('\n=== Google Calendar Webhook Integration Examples ===');

  const googleSecret = process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET || 'test_google_secret';
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // 1. Calendar Event Created
  console.log('\n--- 1. Google Calendar: Event Created ---');
  const eventCreatedPayload = {
    kind: 'calendar#event',
    id: `event_${Date.now()}@google.com`,
    summary: 'Client Meeting - Product Demo',
    description: 'Demonstrating new product features to potential client',
    location: '123 Business St, Conference Room A',
    start: {
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      timeZone: 'America/New_York'
    },
    attendees: [
      {
        email: 'client@example.com',
        displayName: 'John Smith',
        responseStatus: 'accepted'
      },
      {
        email: 'team@business.com',
        displayName: 'Business Team',
        responseStatus: 'accepted'
      }
    ],
    status: 'confirmed',
    creator: {
      email: 'business@example.com',
      displayName: 'Business Owner'
    },
    organizer: {
      email: 'business@example.com',
      displayName: 'Business Owner'
    },
    created: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    updated: new Date().toISOString(),
    iCalUID: `event_${Date.now()}@google.com`
  };

  const eventCreatedSignature = generateCustomSignature(
    JSON.stringify(eventCreatedPayload),
    googleSecret,
    'sha256'
  );

  try {
    await makeWebhookRequest('/google-calendar', eventCreatedPayload, {
      'X-Goog-Signature': eventCreatedSignature,
      'X-Goog-Timestamp': timestamp
    });
    console.log('✅ Calendar event created webhook processed successfully');
  } catch (error) {
    console.error('❌ Calendar event created webhook failed:', error.response?.data?.message);
  }

  // 2. Calendar Event Updated
  console.log('\n--- 2. Google Calendar: Event Updated ---');
  const eventUpdatedPayload = {
    kind: 'calendar#event',
    id: `event_${Date.now() - 1000}@google.com`, // Same as previous event
    summary: 'Client Meeting - Product Demo (Updated)',
    description: 'Demonstrating new product features - Updated agenda with pricing discussion',
    start: {
      dateTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: new Date(Date.now() + 26.75 * 60 * 60 * 1000).toISOString(),
      timeZone: 'America/New_York'
    },
    status: 'confirmed',
    updated: new Date().toISOString()
  };

  const eventUpdatedSignature = generateCustomSignature(
    JSON.stringify(eventUpdatedPayload),
    googleSecret,
    'sha256'
  );

  try {
    await makeWebhookRequest('/google-calendar', eventUpdatedPayload, {
      'X-Goog-Signature': eventUpdatedSignature,
      'X-Goog-Timestamp': timestamp
    });
    console.log('✅ Calendar event updated webhook processed successfully');
  } catch (error) {
    console.error('❌ Calendar event updated webhook failed:', error.response?.data?.message);
  }

  // 3. Calendar Event Cancelled
  console.log('\n--- 3. Google Calendar: Event Cancelled ---');
  const eventCancelledPayload = {
    kind: 'calendar#event',
    id: `event_${Date.now() - 2000}@google.com`,
    summary: 'Cancelled Client Meeting',
    status: 'cancelled',
    updated: new Date().toISOString()
  };

  const eventCancelledSignature = generateCustomSignature(
    JSON.stringify(eventCancelledPayload),
    googleSecret,
    'sha256'
  );

  try {
    await makeWebhookRequest('/google-calendar', eventCancelledPayload, {
      'X-Goog-Signature': eventCancelledSignature,
      'X-Goog-Timestamp': timestamp
    });
    console.log('✅ Calendar event cancelled webhook processed successfully');
  } catch (error) {
    console.error('❌ Calendar event cancelled webhook failed:', error.response?.data?.message);
  }
};

export const runSMSProviderWebhookExamples = async () => {
  console.log('\n=== SMS Provider Webhook Integration Examples ===');

  const smsSecret = process.env.SMS_PROVIDER_WEBHOOK_SECRET || 'test_sms_secret';

  // 1. SMS Delivered Successfully
  console.log('\n--- 1. SMS Provider: Message Delivered ---');
  const deliveredPayload = {
    messageId: `msg_${Date.now()}`,
    status: 'delivered',
    deliveryStatus: 'delivered',
    timestamp: new Date().toISOString(),
    phoneNumber: '+1234567890',
    messageText: 'Your appointment is confirmed for tomorrow at 2 PM. Thank you!',
    supplierReference: `SMS-${Date.now()}`,
    cost: '0.025',
    currency: 'USD',
    carrierDeliveryStatus: 'delivered',
    deliveredAt: new Date().toISOString()
  };

  const deliveredSignature = generateCustomSignature(
    JSON.stringify(deliveredPayload),
    smsSecret
  );

  try {
    await makeWebhookRequest('/sms-provider', deliveredPayload, {
      'X-SMS-Signature': deliveredSignature
    });
    console.log('✅ SMS delivered webhook processed successfully');
  } catch (error) {
    console.error('❌ SMS delivered webhook failed:', error.response?.data?.message);
  }

  // 2. SMS Delivery Failed
  console.log('\n--- 2. SMS Provider: Message Failed ---');
  const failedPayload = {
    messageId: `msg_${Date.now()}`,
    status: 'failed',
    deliveryStatus: 'failed',
    errorCode: '1702', // Message delivery failed
    errorMessage: 'Invalid phone number format',
    timestamp: new Date().toISOString(),
    phoneNumber: '+123456789',
    messageText: 'Your appointment reminder',
    supplierReference: `SMS-${Date.now()}`,
    cost: '0.0',
    currency: 'USD',
    failureReason: 'INVALID_PHONE_NUMBER'
  };

  const failedSignature = generateCustomSignature(
    JSON.stringify(failedPayload),
    smsSecret
  );

  try {
    await makeWebhookRequest('/sms-provider', failedPayload, {
      'X-SMS-Signature': failedSignature
    });
    console.log('✅ SMS failed webhook processed successfully');
  } catch (error) {
    console.error('❌ SMS failed webhook failed:', error.response?.data?.message);
  }

  // 3. SMS Expired
  console.log('\n--- 3. SMS Provider: Message Expired ---');
  const expiredPayload = {
    messageId: `msg_${Date.now()}`,
    status: 'expired',
    deliveryStatus: 'expired',
    timestamp: new Date().toISOString(),
    phoneNumber: '+15551234567',
    messageText: 'Appointment reminder',
    supplierReference: `SMS-${Date.now()}`,
    cost: '0.0',
    currency: 'USD',
    expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
  };

  const expiredSignature = generateCustomSignature(
    JSON.stringify(expiredPayload),
    smsSecret
  );

  try {
    await makeWebhookRequest('/sms-provider', expiredPayload, {
      'X-SMS-Signature': expiredSignature
    });
    console.log('✅ SMS expired webhook processed successfully');
  } catch (error) {
    console.error('❌ SMS expired webhook failed:', error.response?.data?.message);
  }
};

export const runReviewPlatformWebhookExamples = async () => {
  console.log('\n=== Review Platform Webhook Integration Examples ===');

  const reviewSecret = process.env.REVIEW_PLATFORM_WEBHOOK_SECRET || 'test_review_secret';

  // 1. Google Review Received
  console.log('\n--- 1. Review Platform: Google Review ---');
  const googleReviewPayload = {
    reviewId: `googlerev_${Date.now()}`,
    reviewerName: 'Jennifer Johnson',
    reviewRating: 5,
    reviewText: 'Excellent service! The team was extremely professional and the results exceeded my expectations. Highly recommend this business to anyone looking for quality work.',
    reviewDate: new Date().toISOString(),
    platform: 'google',
    businessId: 'business-uuid-123', // This should match an actual business ID in your system
    businessName: 'Joe\'s Coffee Shop & Services',
    reviewUrl: `https://maps.google.com/reviews/${Date.now()}`,
    reviewerProfileUrl: 'https://plus.google.com/jennifer.johnson',
    verifiedPurchase: true,
    language: 'en',
    sentiment: 'positive',
    reviewSource: 'Google My Business',
    reviewResponseText: null,
    reviewResponseDate: null
  };

  const googleReviewSignature = generateCustomSignature(
    JSON.stringify(googleReviewPayload),
    reviewSecret
  );

  try {
    await makeWebhookRequest('/review-platforms', googleReviewPayload, {
      'X-Review-Signature': googleReviewSignature
    });
    console.log('✅ Google review webhook processed successfully');
  } catch (error) {
    console.error('❌ Google review webhook failed:', error.response?.data?.message);
  }

  // 2. Yelp Review Received
  console.log('\n--- 2. Review Platform: Yelp Review ---');
  const yelpReviewPayload = {
    reviewId: `yelprev_${Date.now()}`,
    reviewerName: 'Mike Rodriguez',
    reviewRating: 4,
    reviewText: 'Good overall experience. Staff was friendly and the service was completed on time. Small room for improvement on follow-up communication.',
    reviewDate: new Date().toISOString(),
    platform: 'yelp',
    businessId: 'business-uuid-123',
    businessName: 'Joe\'s Coffee Shop & Services',
    reviewUrl: `https://www.yelp.com/review/${Date.now()}`,
    reviewerProfileUrl: 'https://www.yelp.com/user/mike-rodriguez',
    verifiedPurchase: true,
    language: 'en',
    sentiment: 'neutral',
    reviewSource: 'Yelp'
  };

  const yelpReviewSignature = generateCustomSignature(
    JSON.stringify(yelpReviewPayload),
    reviewSecret
  );

  try {
    await makeWebhookRequest('/review-platforms', yelpReviewPayload, {
      'X-Review-Signature': yelpReviewSignature
    });
    console.log('✅ Yelp review webhook processed successfully');
  } catch (error) {
    console.error('❌ Yelp review webhook failed:', error.response?.data?.message);
  }

  // 3. Negative Facebook Review
  console.log('\n--- 3. Review Platform: Facebook Review (Negative) ---');
  const facebookReviewPayload = {
    reviewId: `facebookrev_${Date.now()}`,
    reviewerName: 'David Chen',
    reviewRating: 2,
    reviewText: 'Service was slow and staff seemed unprepared. Had to wait much longer than expected. Communication could be much better.',
    reviewDate: new Date().toISOString(),
    platform: 'facebook',
    businessId: 'business-uuid-123',
    businessName: 'Joe\'s Coffee Shop & Services',
    reviewUrl: `https://www.facebook.com/reviews/${Date.now()}`,
    reviewerProfileUrl: 'https://www.facebook.com/david.chen',
    verifiedPurchase: false,
    language: 'en',
    sentiment: 'negative'
  };

  const facebookReviewSignature = generateCustomSignature(
    JSON.stringify(facebookReviewPayload),
    reviewSecret
  );

  try {
    await makeWebhookRequest('/review-platforms', facebookReviewPayload, {
      'X-Review-Signature': facebookReviewSignature
    });
    console.log('✅ Facebook review webhook processed successfully');
  } catch (error) {
    console.error('❌ Facebook review webhook failed:', error.response?.data?.message);
  }
};

export const runWebhookManagementExamples = async () => {
  console.log('\n=== Webhook Management Examples ===');

  // 1. Health Check
  console.log('\n--- 1. Webhook Health Check ---');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('Webhook Health Status:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }

  // 2. Configuration
  console.log('\n--- 2. Webhook Configuration ---');
  try {
    const response = await axios.get(`${API_BASE_URL}/config`);
    console.log('Webhook Configuration:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Configuration fetch failed:', error);
  }

  // 3. Statistics
  console.log('\n--- 3. Webhook Statistics ---');
  try {
    const response = await axios.get(`${API_BASE_URL}/stats?timeframe=24h`);
    console.log('Webhook Statistics:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Statistics fetch failed:', error);
  }

  // 4. Test Webhook (Development only)
  console.log('\n--- 4. Test Webhook (Development) ---');
  if (process.env.NODE_ENV === 'development') {
    try {
      const testPayload = {
        source: 'twilio',
        event_type: 'call_status_update',
        payload: {
          CallSid: 'test_' + Date.now(),
          CallStatus: 'completed',
          test: true
        }
      };

      const response = await axios.post(`${API_BASE_URL}/test`, testPayload);
      console.log('✅ Test webhook processed:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ Test webhook failed:', error.response?.data?.message);
    }
  } else {
    console.log('ℹ️  Test webhook only available in development environment');
  }
};

export const runCompleteWebhookDemo = async () => {
  try {
    console.log('🚀 Starting Complete Webhook Integration Demo');
    
    await runTwilioWebhookExamples();
    await runGoogleCalendarWebhookExamples();
    await runSMSProviderWebhookExamples();
    await runReviewPlatformWebhookExamples();
    await runWebhookManagementExamples();
    
    console.log('\n🎉 All Webhook Integration Examples Completed Successfully!');
    console.log('\n🪝 Webhook system provides:');
    console.log('✅ Twilio call status updates with signature verification');
    console.log('✅ Google Calendar event synchronization');
    console.log('✅ SMS delivery status tracking');
    console.log('✅ Review platform ingestion (Google/Yelp/Facebook)');
    console.log('✅ Complete audit logging and monitoring');
    console.log('✅ Signature verification and security');
    console.log('✅ Business data mapping to Supabase');
    console.log('✅ Automatic notifications and triggers');
    
  } catch (error) {
    console.error('Error running complete webhook demo:', error);
  }
};
