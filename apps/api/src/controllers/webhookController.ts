import { Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { WebhookSignatureVerifier } from '../validation/webhookSchemas';

export class WebhookController {
  /**
   * POST /webhooks/twilio - Receive call status updates from Twilio
   */
  static async handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.get('X-Twilio-Signature') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      // Verify webhook signature if configured
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const webhookUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
      if (twilioAuthToken && signature) {
        const isValidSignature = WebhookSignatureVerifier.verifyTwilioSignature(
          JSON.stringify(req.body),
          signature,
          twilioAuthToken,
          webhookUrl
        );

        if (!isValidSignature) {
          console.warn('Invalid Twilio webhook signature received');
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid webhook signature'
          });
          return;
        }
      } else {
        console.warn('Twilio webhook received without signature verification');
      }

      // Process Twilio webhook
      const result = await WebhookService.processTwilioWebhook(
        req.body,
        signature,
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          callUpdated: result.callUpdated
        });
      } else {
        res.status(400).json({
          error: 'Webhook processing failed',
          message: result.message
        });
      }
    } catch (error) {
      console.error('Twilio webhook controller error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /webhooks/google-calendar - Listen for calendar events from Google Calendar
   */
  static async handleGoogleCalendarWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.get('X-Goog-Signature') || '';
      const timestamp = req.get('X-Goog-Timestamp') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      // Verify webhook signature if configured
      const googleSecret = process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET;
      
      if (googleSecret && signature && timestamp) {
        const isValidSignature = WebhookSignatureVerifier.verifyGoogleSignature(
          JSON.stringify(req.body),
          signature,
          googleSecret,
          timestamp
        );

        if (!isValidSignature) {
          console.warn('Invalid Google Calendar webhook signature received');
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid webhook signature'
          });
          return;
        }

        // Verify timestamp to prevent replay attacks
        const isValidTimestamp = WebhookSignatureVerifier.verifyTimestamp(timestamp, 300); // 5 minutes
        
        if (!isValidTimestamp) {
          console.warn('Google Calendar webhook timestamp too old');
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Webhook timestamp too old'
          });
          return;
        }
      } else {
        console.warn('Google Calendar webhook received without signature verification');
      }

      // Process Google Calendar webhook
      const result = await WebhookService.processGoogleCalendarWebhook(
        req.body,
        signature,
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          appointmentSynced: result.appointmentSynced
        });
      } else {
        res.status(400).json({
          error: 'Webhook processing failed',
          message: result.message
        });
      }
    } catch (error) {
      console.error('Google Calendar webhook controller error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /webhooks/sms-provider - Receive delivery reports from SMS provider
   */
  static async handleSMSProviderWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.get('X-SMS-Signature') || req.get('X-Signature') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      // Verify webhook signature if configured
      const smsSecret = process.env.SMS_PROVIDER_WEBHOOK_SECRET;
      
      if (smsSecret && signature) {
        const isValidSignature = WebhookSignatureVerifier.verifyCustomSignature(
          JSON.stringify(req.body),
          signature,
          smsSecret,
          'sha256'
        );

        if (!isValidSignature) {
          console.warn('Invalid SMS provider webhook signature received');
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid webhook signature'
          });
          return;
        }
      } else {
        console.warn('SMS provider webhook received without signature verification');
      }

      // Process SMS provider webhook
      const result = await WebhookService.processSMSWebhook(
        req.body,
        signature,
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          messageUpdated: result.messageUpdated
        });
      } else {
        res.status(400).json({
          error: 'Webhook processing failed',
          message: result.message
        });
      }
    } catch (error) {
      console.error('SMS provider webhook controller error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /webhooks/review-platforms - Ingest new reviews from Google/Yelp
   */
  static async handleReviewPlatformWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.get('X-Review-Signature') || req.get('X-Signature') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      // Verify webhook signature if configured
      const reviewSecret = process.env.REVIEW_PLATFORM_WEBHOOK_SECRET;
      
      if (reviewSecret && signature) {
        const isValidSignature = WebhookSignatureVerifier.verifyCustomSignature(
          JSON.stringify(req.body),
          signature,
          reviewSecret,
          'sha256'
        );

        if (!isValidSignature) {
          console.warn('Invalid review platform webhook signature received');
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid webhook signature'
          });
          return;
        }
      } else {
        console.warn('Review platform webhook received without signature verification');
      }

      // Process review platform webhook
      const result = await WebhookService.processReviewPlatformWebhook(
        req.body,
        signature,
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          reviewCreated: result.reviewCreated
        });
      } else {
        res.status(400).json({
          error: 'Webhook processing failed',
          message: result.message
        });
      }
    } catch (error) {
      console.error('Review platform webhook controller error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /webhooks/health - Webhook system health check
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        system_status: 'healthy',
        webhooks_enabled: {
          twilio: !!process.env.TWILIO_AUTH_TOKEN,
          google_calendar: !!process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET,
          sms_provider: !!process.env.SMS_PROVIDER_WEBHOOK_SECRET,
          review_platforms: !!process.env.REVIEW_PLATFORM_WEBHOOK_SECRET
        },
        signature_verification: {
          enabled: true,
          algorithms_supported: ['sha1', 'sha256']
        },
        database_connection: true,
        last_checked: new Date().toISOString(),
        version: '1.0.0'
      };

      // Basic connectivity tests
      try {
        const { supabaseServiceRole } = await import('../config/supabase');
        // Test database connection with a simple query
        const { error } = await supabaseServiceRole.from('businesses').select('id').limit(1);
        if (error) {
          healthStatus.database_connection = false;
          healthStatus.system_status = 'degraded';
        }
      } catch (error) {
        healthStatus.database_connection = false;
        healthStatus.system_status = 'unhealthy';
      }

      const statusCode = healthStatus.system_status === 'healthy' ? 200 : 
                        healthStatus.system_status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: healthStatus.system_status === 'healthy',
        data: healthStatus
      });
    } catch (error) {
      console.error('Webhook health check error:', error);
      
      res.status(503).json({
        success: false,
        data: {
          system_status: 'unhealthy',
          error: 'Health check failed',
          last_checked: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /webhooks/logs - Get webhook processing logs (admin only)
   */
  static async getWebhookLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        source,
        status,
        start_date,
        end_date
      } = req.query;

      const queryParams: any = {
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100)
      };

      if (source) queryParams.source = source;
      if (status) queryParams.status = status;
      if (start_date) queryParams.start_date = start_date;
      if (end_date) queryParams.end_date = end_date;

      // This would typically require admin authentication
      const { supabaseServiceRole } = await import('../config/supabase');

      let dbQuery = supabaseServiceRole
        .from('webhook_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (source) {
        dbQuery = dbQuery.eq('source', source);
      }

      if (status) {
        dbQuery = dbQuery.eq('status', status);
      }

      if (start_date) {
        dbQuery = dbQuery.gte('created_at', start_date);
      }

      if (end_date) {
        dbQuery = dbQuery.lte('created_at', end_date);
      }

      // Pagination
      const from = (queryParams.page - 1) * queryParams.limit;
      const to = from + queryParams.limit - 1;
      dbQuery = dbQuery.range(from, to);

      const { data, error, count } = await dbQuery;

      if (error) {
        throw new Error(`Failed to fetch webhook logs: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / queryParams.limit);

      res.status(200).json({
        success: true,
        data: {
          logs: data || [],
          pagination: {
            current_page: queryParams.page,
            total_pages: totalPages,
            total_count: count || 0,
            per_page: queryParams.limit,
            has_next: queryParams.page < totalPages,
            has_prev: queryParams.page > 1
          }
        },
        metadata: {
          filters: queryParams,
          requested_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get webhook logs error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /webhooks/test - Test webhook endpoint (development only)
   */
  static async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Test endpoint only available in development'
        });
        return;
      }

      const { source, event_type, payload } = req.body;

      if (!source || !event_type) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'source and event_type are required'
        });
        return;
      }

      // Log test webhook event
      const { supabaseServiceRole } = await import('../config/supabase');
      
      const testLog = {
        source: `${source}_test`,
        event_type: event_type,
        payload: payload || req.body,
        signature: 'test-signature',
        ip_address: req.ip || 'test',
        user_agent: req.get('User-Agent') || 'test',
        status: 'completed',
        processed_at: new Date().toISOString(),
        retries: 0
      };

      const { data, error } = await supabaseServiceRole
        .from('webhook_logs')
        .insert(testLog)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to log test webhook: ${error.message}`);
      }

      res.status(200).json({
        success: true,
        message: 'Test webhook processed successfully',
        data: {
          log_id: data.id,
          test_data: testLog
        }
      });
    } catch (error) {
      console.error('Test webhook error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
