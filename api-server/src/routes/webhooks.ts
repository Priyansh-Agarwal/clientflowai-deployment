import { Router, Request, Response } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();

/**
 * @route   POST /webhooks/twilio
 * @desc    Receive call status updates from Twilio webhooks
 * @access  Public (Twilio webhook authentication via signature)
 * @headers X-Twilio-Signature: HMAC-SHA1 signature for verification
 * @body    Twilio webhook payload including CallSid, CallStatus, CallDirection, etc.
 * 
 * Updates call records in Supabase based on Twilio call status changes.
 * Verifies webhook signature using TWILIO_AUTH_TOKEN environment variable.
 */
router.post('/twilio', WebhookController.handleTwilioWebhook);

/**
 * @route   POST /webhooks/google-calendar
 * @desc    Listen for calendar events from Google Calendar webhooks 
 * @access  Public (Google webhook authentication via signature)
 * @headers X-Goog-Signature: HMAC-SHA256 signature for verification
 * @headers X-Goog-Timestamp: Timestamp for replay protection
 * @body    Google Calendar Event object with event details, attendees, times
 * 
 * Synchronizes Google Calendar events to appointment records in Supabase.
 * Creates new appointments or updates existing ones based on calendar changes.
 */
router.post('/google-calendar', WebhookController.handleGoogleCalendarWebhook);

/**
 * @route   POST /webhooks/sms-provider
 * @desc    Receive delivery reports from SMS provider webhooks
 * @access  Public (SMS provider webhook authentication via signature)
 * @headers X-SMS-Signature or X-Signature: Custom HMAC signature for verification
 * @body    SMS delivery status payload with messageId, status, delivery info
 * 
 * Updates conversation message status based on SMS delivery reports.
 * Tracks delivery status (sent/delivered/failed/rejected) in conversation_messages table.
 */
router.post('/sms-provider', WebhookController.handleSMSProviderWebhook);

/**
 * @route   POST /webhooks/review-platforms
 * @desc    Ingest new reviews from Google/Yelp webhook subscriptions
 * @access  Public (Review platform webhook authentication via signature)
 * @headers X-Review-Signature or X-Signature: Custom HMAC signature for verification
 * @body    Review platform payload with review details, ratings, business info
 * 
 * Inserts new reviews into Supabase reviews table from external platforms.
 * Automatically triggers notifications for new reviews via database triggers.
 */
router.post('/review-platforms', WebhookController.handleReviewPlatformWebhook);

/**
 * @route   GET /webhooks/health
 * @desc    Webhook system health check endpoint
 * @access  Public
 * 
 * Provides health status of webhook processing system.
 */
router.get('/health', WebhookController.healthCheck);

/**
 * @route   GET /webhooks/logs
 * @desc    Get webhook processing audit logs (admin access required)
 * @access  Private (admin authentication required)
 * @query   page?, limit?, source?, status?, start_date?, end_date?
 * 
 * Retrieves webhook processing logs with filtering and pagination.
 */
router.get('/logs', WebhookController.getWebhookLogs);

/**
 * @route   POST /webhooks/test
 * @desc    Test webhook processing endpoint (development only)
 * @access  Public (only available in development environment)
 * @body    { source, event_type, payload? }
 * 
 * Allows testing webhook processing logic in development environment.
 */
router.post('/test', WebhookController.testWebhook);

/**
 * @route   GET /webhooks/config
 * @desc    Get webhook configuration information
 * @access  Public
 * 
 * Returns webhook endpoint URLs and configuration info for external services.
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const webhookConfig = {
      endpoints: {
        twilio: {
          url: `${req.protocol}://${req.get('host')}/api/webhooks/twilio`,
          method: 'POST',
          auth_type: 'signature_verification',
          required_headers: ['X-Twilio-Signature'],
          signature_algorithm: 'HMAC-SHA1'
        },
        google_calendar: {
          url: `${req.protocol}://${req.get('host')}/api/webhooks/google-calendar`,
          method: 'POST',
          auth_type: 'signature_verification',
          required_headers: ['X-Goog-Signature', 'X-Goog-Timestamp'],
          signature_algorithm: 'HMAC-SHA256'
        },
        sms_provider: {
          url: `${req.protocol}://${req.get('host')}/api/webhooks/sms-provider`,
          method: 'POST',
          auth_type: 'signature_verification',
          required_headers: ['X-SMS-Signature', 'X-Signature'],
          signature_algorithm: 'HMAC-SHA256'
        },
        review_platforms: {
          url: `${req.protocol}://${req.get('host')}/api/webhooks/review-platforms`,
          method: 'POST',
          auth_type: 'signature_verification',
          required_headers: ['X-Review-Signature', 'X-Signature'],
          signature_algorithm: 'HMAC-SHA256'
        }
      },
      health_check: `${req.protocol}://${req.get('host')}/api/webhooks/health`,
      version: '1.0.0'
    };

    res.status(200).json({
      success: true,
      data: webhookConfig
    });
  } catch (error) {
    console.error('Webhook config error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve webhook configuration'
    });
  }
});

/**
 * @route   GET /webhooks/stats
 * @desc    Get webhook processing statistics
 * @access  Public
 * @query   timeframe? (24h, 7d, 30d, 90d)
 * 
 * Returns webhook processing statistics.
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as string) || '24h';
    
    if (!['24h', '7d', '30d', '90d'].includes(timeframe)) {
      res.status(400).json({
        error: 'Invalid timeframe',
        message: 'Timeframe must be one of: 24h, 7d, 30d, 90d'
      });
      return;
    }

    const { supabaseServiceRole } = await import('../config/supabase');
    
    // Get webhook statistics
    const { data: logs, error } = await supabaseServiceRole
      .from('webhook_logs')
      .select('source, status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      throw new Error(`Failed to fetch webhook stats: ${error.message}`);
    }

    const stats = {
      timeframe,
      total_webhooks: logs?.length || 0,
      successful: logs?.filter(log => log.status === 'completed').length || 0,
      failed: logs?.filter(log => log.status === 'failed').length || 0,
      success_rate: 0,
      generated_at: new Date().toISOString()
    };

    if (stats.total_webhooks > 0) {
      stats.success_rate = parseFloat(((stats.successful / stats.total_webhooks) * 100).toFixed(2));
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Webhook stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve webhook statistics'
    });
  }
});

export default router;