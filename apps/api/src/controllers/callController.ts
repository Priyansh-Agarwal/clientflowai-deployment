import { Request, Response } from 'express';
import { CallService } from '../services/callService';
import { StorageService } from '../services/storageService';
import { 
  CreateCallInput, 
  UpdateCallInput,
  GetCallsQuery,
  TwilioWebhookInput
} from '../validation/callSchemas';
import { validateTwilioSignature } from '../validation/callSchemas';

export class CallController {
  /**
   * POST /calls - Create a new call record
   */
  static async createCall(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const callData: CreateCallInput = req.body;

      // Validate required fields
      if (!callData.phone_number || !callData.direction || !callData.started_at) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'phone_number, direction, and started_at are required'
        });
        return;
      }

      const call = await CallService.createCall(businessId, callData);

      res.status(201).json({
        success: true,
        message: 'Call created successfully',
        data: call
      });
    } catch (error) {
      console.error('Create call error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Invalid phone number')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create call'
      });
    }
  }

  /**
   * PUT /calls/:id - Update a call record
   */
  static async updateCall(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;
      const updateData: UpdateCallInput = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid call ID',
          message: 'Call ID must be a valid UUID'
        });
        return;
      }

      const call = await CallService.updateCall(id, businessId, updateData);

      res.status(200).json({
        success: true,
        message: 'Call updated successfully',
        data: call
      });
    } catch (error) {
      console.error('Update call error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Call not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Invalid phone number')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update call'
      });
    }
  }

  /**
   * GET /calls/:id - Get a single call by ID
   */
  static async getCallById(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid call ID',
          message: 'Call ID must be a valid UUID'
        });
        return;
      }

      const call = await CallService.getCallById(id, businessId);

      res.status(200).json({
        success: true,
        data: call
      });
    } catch (error) {
      console.error('Get call by ID error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Call not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch call'
      });
    }
  }

  /**
   * GET /calls - Get calls with filtering and pagination
   */
  static async getCalls(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const query: GetCallsQuery = req.query;

      // Ensure reasonable limits
      const limit = Math.min(query.limit, 100);
      const page = Math.max(query.page, 1);

      const filters = {
        customer_id: query.customer_id,
        direction: query.direction,
        status: query.status,
        outcome: query.outcome,
        twilio_call_sid: query.twilio_call_sid,
        start_date: query.start_date,
        end_date: query.end_date,
        min_duration: query.min_duration,
        max_duration: query.max_duration,
        search: query.search<｜tool▁calls▁begin｜>
        page,
        limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
        has_recording: query.has_recording,
        has_transcript: query.has_transcript,
        tags: query.tags,
      };

      const result = await CallService.getCalls(businessId, filters);

      res.status(200).json({
        success: true,
        data: {
          calls: result.calls,
          pagination: {
            current_page: result.page,
            total_pages: result.totalPages,
            total_count: result.total,
            per_page: limit,
            has_next: result.page < result.totalPages,
            has_prev: result.page > 1,
          }
        }
      });
    } catch (error) {
      console.error('Get calls error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch calls'
      });
    }
  }

  /**
   * POST /calls/:id/recording - Upload call recording file
   */
  static async uploadCallRecording(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: callId } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(callId)) {
        res.status(400).json({
          error: 'Invalid call ID',
          message: 'Call ID must be a valid UUID'
        });
        return;
      }

      // Check if file exists
      if (!req.file) {
        res.status(400).json({
          error: 'No file provided',
          message: 'Recording file is required'
        });
        return;
      }

      // Get call to verify it exists and belongs to business
      const call = await CallService.getCallById(callId, businessId);

      // Upload file to Supabase Storage
      const { url: recordingUrl, path: recordingPath } = await StorageService.uploadCallRecording(
        callId,
        businessId,
        req.file.buffer,
        req.file.filename || req.file.originalname,
        req.file.mimetype,
        {
          file_size: req.file.size,
          file_hash: req.file.hash,
          duration: req.file.metadata?.duration,
          channels: req.file.metadata?.channels,
          sample_rate: req.file.metadata?.sample_rate,
          uploaded_at: new Date().toISOString(),
        }
      );

      // Update call record with recording URL
      const updatedCall = await CallService.updateCallRecording(
        callId,
        businessId,
        recordingUrl,
        req.file.metadata?.duration,
        {
          recording_path: recordingPath,
          ...req.file.metadata
        }
      );

      res.status(200).json({
        success: true,
        message: 'Recording uploaded successfully',
        data: {
          call_id: callId,
          recording_url: recordingUrl,
          recording_path: recordingPath,
          file_metadata: req.file.metadata
        }
      });

    } catch (error) {
      console.error('Upload recording error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Call not found')) {
          res.status(404).json({
            error: 'Not found',
            message: 'Call not found'
          });
          return;
        }
        if (error.message.includes('Failed to upload')) {
          res.status(500).json({
            error: 'Upload failed',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to upload recording'
      });
    }
  }

  /**
   * GET /calls/:id/recording - Get call recording (with signed URL)
   */
  static async getCallRecording(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: callId } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(callId)) {
        res.status(400).json({
          error: 'Invalid call ID',
          message: 'Call ID must be a valid UUID'
        });
        return;
      }

      // Get call details
      const call = await CallService.getCallById(callId, businessId);

      if (!call.recording_url) {
        res.status(404).json({
          error: 'Not found',
          message: 'No recording found for this call'
        });
        return;
      }

      // Verify file access permissions
      const filePath = call.metadata?.recording_path;
      if (filePath && !(await StorageService.verifyFileAccess(filePath, businessId))) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this recording'
        });
        return;
      }

      // Return recording URL (public URL if small, signed URL if private)
      const response = {
        call_id: callId,
        has_recording: true,
        recording_url: call.recording_url,
        duration: call.duration,
        uploaded_at: call.metadata?.recording_uploaded_at
      };

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      console.error('Get recording error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Call not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get recording'
      });
    }
  }

  /**
   * PUT /calls/:id/transcript - Update call transcript
   */
  static async updateCallTranscript(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: callId } = req.params;
      const { transcript, transcription_url } = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(callId)) {
        res.status(400).json({
          error: 'Invalid call ID',
          message: 'Call ID must be a valid UUID'
        });
        return;
      }

      if (!transcript || !transcript.segments || !Array.isArray(transcript.segments)) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Transcript with segments array is required'
        });
        return;
      }

      const call = await CallService.updateCallTranscript(callId, businessId, transcript, transcription_url);

      res.status(200).json({
        success: true,
        message: 'Transcript updated successfully',
        data: call
      });

    } catch (error) {
      console.error('Update transcript error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Call not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update transcript'
      });
    }
  }

  /**
   * GET /calls/stats - Get call statistics
   */
  static async getCallStats(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;

      const stats = await CallService.getCallStats(businessId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get call stats error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch call statistics'
      });
    }
  }

  /**
   * DELETE /calls/:id - Delete a call
   */
  static async deleteCall(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: callId } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(callId)) {
        res.status(400).json({
          error: 'Invalid call ID',
          message: 'Call ID must be a valid UUID'
        });
        return;
      }

      await CallService.deleteCall(callId, businessId);

      res.status(200).json({
        success: true,
        message: 'Call deleted successfully'
      });
    } catch (error) {
      console.error('Delete call error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Call not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete call'
      });
    }
  }

  /**
   * POST /calls/webhook/twilio - Twilio webhook handler
   */
  static async handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.body.business_id;
      
      if (!businessId) {
        res.status(400).json({
          error: 'Missing business_id',
          message: 'business_id is required in webhook payload'
        });
        return;
      }

      const webhookData: TwilioWebhookInput = req.body;

      // Validate required fields
      if (!webhookData.CallSid || !webhookData.AccountSid) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'CallSid and AccountSid are required'
        });
        return;
      }

      // Try to find existing call by Twilio SID
      let call;
      try {
        call = await CallService.getCallByTwilioSid(webhookData.CallSid, businessId);
        
        // Update existing call
        const updateData = {
          status: webhookData.CallStatus,
          direction: webhookData.Direction,
          duration: webhookData.Duration || undefined,
          ended_at: webhookData.EndTime || undefined,
          recording_url: webhookData.RecordingUrl || undefined,
          metadata: {
            twilio_webhook_data: webhookData,
            last_webhook_at: new Date().toISOString(),
            ...call.metadata
          }
        };

        const updatedCall = await CallService.updateCall(call.id, businessId, updateData);
        
        res.status(200).json({
          success: true,
          message: 'Call updated successfully',
          data: { call_id: updatedCall.id, action: 'updated' }
        });
        
      } catch (notFoundError) {
        // Create new call if not found
        const newCallData = {
          twilio_call_sid: webhookData.CallSid,
          twilio_account_sid: webhookData.AccountSid,
          phone_number: webhookData.To,
          caller_phone: webhookData.From,
          direction: webhookData.Direction,
          status: webhookData.CallStatus,
          started_at: webhookData.StartTime || new Date().toISOString(),
          duration: webhookData.Duration || undefined,
          ended_at: webhookData.EndTime || undefined,
          recording_url: webhookData.RecordingUrl || undefined,
          call_data: {
            twilio_data: webhookData
          },
          metadata: {
            created_via_webhook: true,
            webhook_data: webhookData,
            created_at: new Date().toISOString()
          }
        };

        const newCall = await CallService.createCall(businessId, newCallData);
        
        res.status(201).json({
          success: true,
          message: 'Call created successfully',
          data: { call_id: newCall.id, action: 'created' }
        });
      }

    } catch (error) {
      console.error('Twilio webhook error:', error);

      res.status(500).json({
        error: 'Webhook processing failed',
        message: 'Failed to process Twilio webhook'
      });
    }
  }
}
