import { supabase, supabaseServiceRole } from '../config/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import {
  WebhookPayload,
  WebhookEvent,
  TwilioWebhookData,
  SMSServiceWebhookData,
  GoogleCalendarWebhookData,
  ReviewPlatformWebhookData,
  WebhookLogInsert
} from '../types/database';
import {
  TwilioWebhookSchema,
  SMSProviderWebhookSchema,
  GoogleCalendarWebhookSchema,
  ReviewPlatformWebhookSchema,
  TwilioWebhookPayload,
  SMSProviderWebhookPayload,
  GoogleCalendarWebhookPayload,
  ReviewPlatformWebhookPayload
} from '../validation/webhookSchemas';

export class WebhookService {
  /**
   * Process Twilio webhook - Update call records
   */
  static async processTwilioWebhook(
    payload: TwilioWebhookPayload,
    signature: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string; callUpdated?: boolean }> {
    try {
      // Validate payload
      const validatedPayload = TwilioWebhookSchema.parse(payload);
      
      // Log webhook event
      const webhookLogId = await this.logWebhookEvent(
        'twilio',
        'call_status_update',
        validatedPayload,
        signature,
        ipAddress,
        userAgent
      );

      // Find business by phone number
      const businessId = await this.resolveBusinessByTwilioData(validatedPayload);
      
      if (!businessId) {
        await this.markWebhookFailed(webhookLogId, 'Business not found for phone number');
        return {
          success: false,
          message: 'Business not found for provided phone number'
        };
      }

      // Find or create call record
      const callRecord = await this.findOrCreateCallRecord(validatedPayload, businessId);

      // Update call record with new status
      const updateData: any = {
        status: this.mapTwilioStatus(validatedPayload.CallStatus),
        call_duration: validatedPayload.CallDuration ? parseInt(validatedPayload.CallDuration) : null,
        recording_url: validatedPayload.RecordingUrl,
        transcript: validatedPayload.TranscriptionText,
        webhook_updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseServiceRole
        .from('calls')
        .update(updateData)
        .eq('id', callRecord.id);

      if (updateError) {
        await this.markWebhookFailed(webhookLogId, `Failed to update call: ${updateError.message}`);
        throw new Error(`Failed to update call record: ${updateError.message}`);
      }

      // Create notification for significant status changes
      if (validatedPayload.CallStatus === 'answered' || validatedPayload.CallStatus === 'completed') {
        await this.createCallStatusNotification(businessId, callRecord.id, validatedPayload.CallStatus);
      }

      await this.markWebhookCompleted(webhookLogId);

      return {
        success: true,
        message: 'Call record updated successfully',
        callUpdated: true
      };
    } catch (error) {
      console.error('Twilio webhook processing error:', error);
      
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      
      return { success: false, message: 'Unknown error processing webhook' };
    }
  }

  /**
   * Process SMS Provider webhook - Update message status in conversations
   */
  static async processSMSWebhook(
    payload: SMSProviderWebhookPayload,
    signature: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string; messageUpdated?: boolean }> {
    try {
      // Validate payload
      const validatedPayload = SMSProviderWebhookSchema.parse(payload);
      
      // Log webhook event
      const webhookLogId = await this.logWebhookEvent(
        'sms-provider',
        'delivery_status_update',
        validatedPayload,
        signature,
        ipAddress,
        userAgent
      );

      // Find business by phone number or other identifiers
      const businessId = await this.resolveBusinessByMessageData(validatedPayload);
      
      if (!businessId) {
        await this.markWebhookFailed(webhookLogId, 'Business not found for message');
        return {
          success: false,
          message: 'Business not found for message'
        };
      }

      // Find conversation message
      const { data: conversationMessage, error: messageError } = await supabaseServiceRole
        .from('conversation_messages')
        .select('id, conversation_id, external_message_id')
        .eq('external_message_id', validatedPayload.messageId)
        .eq('business_id', businessId)
        .single();

      if (messageError || !conversationMessage) {
        await this.markWebhookFailed(webhookLogId, 'Message not found in conversations');
        return {
          success: false,
          message: 'Message not found in conversations'
        };
      }

      // Update message status
      const updateData: any = {
        status: this.mapSMSStatus(validatedPayload.status),
        delivery_status: validatedPayload.deliveryStatus,
        error_code: validatedPayload.errorCode,
        delivered_at: validatedPayload.status === 'delivered' ? new Date().toISOString() : null,
        webhook_updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseServiceRole
        .from('conversation_messages')
        .update(updateData)
        .eq('id', conversationMessage.id);

      if (updateError) {
        await this.markWebhookFailed(webhookLogId, `Failed to update message: ${updateError.message}`);
        throw new Error(`Failed to update message status: ${updateError.message}`);
      }

      // Create notification for delivery issues
      if (validatedPayload.status === 'failed' || validatedPayload.status === 'rejected') {
        await this.createDeliveryFailureNotification(
          businessId, 
          conversationMessage.conversation_id,
          validatedPayload.errorCode || 'Unknown error'
        );
      }

      await this.markWebhookCompleted(webhookLogId);

      return {
        success: true,
        message: 'Message status updated successfully',
        messageUpdated: true
      };
    } catch (error) {
      console.error('SMS webhook processing error:', error);
      
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      
      return { success: false, message: 'Unknown error processing webhook' };
    }
  }

  /**
   * Process Google Calendar webhook - Sync calendar events to appointments
   */
  static async processGoogleCalendarWebhook(
    payload: GoogleCalendarWebhookPayload,
    signature: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string; appointmentSynced?: boolean }> {
    try {
      // Validate payload
      const validatedPayload = GoogleCalendarWebhookSchema.parse(payload);
      
      // Log webhook event
      const webhookLogId = await this.logWebhookEvent(
        'google-calendar',
        'calendar_event_sync',
        validatedPayload,
        signature,
        ipAddress,
        userAgent
      );

      // Find business by calendar integration
      const businessId = await this.resolveBusinessByCalendarData(validatedPayload);
      
      if (!businessId) {
        await this.markWebhookFailed(webhookLogId, 'Business not found for calendar integration');
        return {
          success: false,
          message: 'Business calendar integration not found'
        };
      }

      // Handle calendar update
      if (validatedPayload.status === 'cancelled') {
        return await this.handleCalendarCancellation(validatedPayload, businessId, webhookLogId);
      }

      // Sync calendar event to appointment
      const appointmentData: any = {
        business_id: businessId,
        customer_name: validatedPayload.summary,
        customer_phone: null,
        customer_email: await this.extractCustomerEmail(validatedPayload),
        service_name: 'Calendar Event',
        scheduled_at: new Date(validatedPayload.start?.dateTime || Date.now()).toISOString(),
        duration: this.calculateEventDuration(validatedPayload.start, validatedPayload.end),
        status: this.mapCalendarStatus(validatedPayload.status),
        source: 'google_calendar',
        external_event_id: validatedPayload.id,
        notes: validatedPayload.description || '',
        google_event_data: validatedPayload,
        updated_at: new Date().toISOString()
      };

      // Check if appointment already exists
      const { data: existingAppointment } = await supabaseServiceRole
        .from('appointments')
        .select('id')
        .eq('external_event_id', validatedPayload.id)
        .eq('business_id', businessId)
        .maybeSingle();

      let result;
      if (existingAppointment) {
        // Update existing appointment
        const { error: updateError } = await supabaseServiceRole
          .from('appointments')
          .update(appointmentData)
          .eq('id', existingAppointment.id);

        if (updateError) {
          await this.markWebhookFailed(webhookLogId, `Failed to update appointment: ${updateError.message}`);
          throw new Error(`Failed to update appointment: ${updateError.message}`);
        }

        result = { ...appointmentData, id: existingAppointment.id };
      } else {
        // Create new appointment
        const { data: newAppointment, error: insertError } = await supabaseServiceRole
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (insertError) {
          await this.markWebhookFailed(webhookLogId, `Failed to create appointment: ${insertError.message}`);
          throw new Error(`Failed to create appointment: ${insertError.message}`);
        }

        result = newAppointment;
      }

      // Create notification
      await this.createCalendarSyncNotification(businessId, result.id, 'calendar_event_synced');

      await this.markWebhookCompleted(webhookLogId);

      return {
        success: true,
        message: 'Calendar event synced to appointment successfully',
        appointmentSynced: true
      };
    } catch (error) {
      console.error('Google Calendar webhook processing error:', error);
      
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      
      return { success: false, message: 'Unknown error processing webhook' };
    }
  }

  /**
   * Process Review Platform webhook - Insert new reviews
   */
  static async processReviewPlatformWebhook(
    payload: ReviewPlatformWebhookPayload,
    signature: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string; reviewCreated?: boolean }> {
    try {
      // Validate payload
      const validatedPayload = ReviewPlatformWebhookSchema.parse(payload);
      
      // Log webhook event
      const webhookLogId = await this.logWebhookEvent(
        'review-platforms',
        'new_review_received',
        validatedPayload,
        signature,
        ipAddress,
        userAgent
      );

      // Verify business exists
      const { data: business, error: businessError } = await supabaseServiceRole
        .from('businesses')
        .select('id, name')
        .eq('id', validatedPayload.businessId)
        .single();

      if (businessError || !business) {
        await this.markWebhookFailed(webhookLogId, 'Invalid business ID provided');
        return {
          success: false,
          message: 'Invalid business ID provided'
        };
      }

      // Check if review already exists
      const { data: existingReview } = await supabaseServiceRole
        .from('reviews')
        .select('id')
        .eq('platform', validatedPayload.platform)
        .eq('external_review_id', validatedPayload.reviewId)
        .eq('business_id', validatedPayload.businessId)
        .maybeSingle();

      if (existingReview) {
        await this.markWebhookFailed(webhookLogId, 'Review already exists');
        return {
          success: false,
          message: 'Review already exists'
        };
      }

      // Create new review
      const reviewData: any = {
        business_id: validatedPayload.businessId,
        platform: validatedPayload.platform,
        external_review_id: validatedPayload.reviewId,
        reviewer_name: validatedPayload.reviewerName,
        rating: validatedPayload.reviewRating,
        comment: validatedPayload.reviewText,
        review_date: new Date(validatedPayload.reviewDate).toISOString(),
        review_url: validatedPayload.reviewUrl,
        reviewer_profile_url: validatedPayload.reviewerProfileUrl,
        verified_purchase: validatedPayload.verifiedPurchase,
        language: validatedPayload.language,
        sentiment: validatedPayload.sentiment,
        source_data: validatedPayload,
        created_at: new Date().toISOString()
      };

      const { data: newReview, error: insertError } = await supabaseServiceRole
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();

      if (insertError) {
        await this.markWebhookFailed(webhookLogId, `Failed to create review: ${insertError.message}`);
        throw new Error(`Failed to create review: ${insertError.message}`);
      }

      // Trigger notification will be automatically created by database trigger
      await this.markWebhookCompleted(webhookLogId);

      return {
        success: true,
        message: 'Review created successfully',
        reviewCreated: true
      };
    } catch (error) {
      console.error('Review platform webhook processing error:', error);
      
      if (error instanceof Error) {
        return { success: false, message: error.message };
      }
      
      return { success: false, message: 'Unknown error processing webhook' };
    }
  }

  /**
   * Log webhook event for audit trail
   */
  private static async logWebhookEvent(
    source: string,
    eventType: string,
    payload: any,
    signature: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<string> {
    const webhookLog: WebhookLogInsert = {
      source,
      event_type: eventType,
      payload,
      signature,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'processing',
      retries: 0
    };

    const { data, error } = await supabaseServiceRole
      .from('webhook_logs')
      .insert(webhookLog)
      .select()
      .single();

    if (error) {
      console.error('Failed to log webhook event:', error);
      return 'unknown-log-id';
    }

    return data.id;
  }

  /**
   * Mark webhook as completed
   */
  private static async markWebhookCompleted(webhookLogId: string): Promise<void> {
    await supabaseServiceRole
      .from('webhook_logs')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookLogId);
  }

  /**
   * Mark webhook as failed
   */
  private static async markWebhookFailed(webhookLogId: string, errorMessage: string): Promise<void> {
    await supabaseServiceRole
      .from('webhook_logs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookLogId);
  }

  /**
   * Resolve business ID from Twilio data
   */
  private static async resolveBusinessByTwilioData(data: TwilioWebhookPayload): Promise<string | null> {
    // Implementation would typically involve looking up business by phone numbers
    // For now, returning a placeholder
    const phoneNumber = data.From || data.To;
    if (phoneNumber) {
      // This would be a database lookup in production
      return 'default-business-id'; // Placeholder
    }
    return null;
  }

  /**
   * Resolve business ID from SMS message data
   */
  private static async resolveBusinessByMessageData(data: SMSProviderWebhookPayload): Promise<string | null> {
    // Implementation would typically involve looking up business by phone numbers or configuration
    return 'default-business-id'; // Placeholder
  }

  /**
   * Resolve business ID from calendar data
   */
  private static async resolveBusinessByCalendarData(data: GoogleCalendarWebhookPayload): Promise<string | null> {
    // Implementation would typically involve looking up business by calendar integration
    return 'default-business-id'; // Placeholder
  }

  /**
   * Find or create call record from Twilio data
   */
  private static async findOrCreateCallRecord(
    data: TwilioWebhookPayload,
    businessId: string
  ): Promise<any> {
    const { data: existingCall } = await supabaseServiceRole
      .from('calls')
      .select('*')
      .eq('call_sid', data.CallSid)
      .eq('business_id', businessId)
      .maybeSingle();

    if (existingCall) {
      return existingCall;
    }

    // Create new call record
    const newCall = {
      business_id: businessId,
      call_sid: data.CallSid,
      customer_phone: data.From,
      business_phone: data.To,
      direction: data.CallDirection,
      status: this.mapTwilioStatus(data.CallStatus),
      started_at: new Date().toISOString(),
      duration: data.CallDuration ? parseInt(data.CallDuration) : null,
      recording_url: data.RecordingUrl,
      transcript: data.TranscriptionText,
      source: 'twilio',
      external_metadata: data
    };

    const { data: createdCall, error } = await supabaseServiceRole
      .from('calls')
      .insert(newCall)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create call record: ${error.message}`);
    }

    return createdCall;
  }

  /**
   * Map Twilio status to internal status
   */
  private static mapTwilioStatus(twilioStatus?: string): string {
    const statusMap: Record<string, string> = {
      'ringing': 'ringing',
      'initiated': 'initiated', 
      'answered': 'completed',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no_answer'
    };
    
    return statusMap[twilioStatus || ''] || 'unknown';
  }

  /**
   * Map SMS status to internal status
   */
  private static mapSMSStatus(smsStatus: string): string {
    const statusMap: Record<string, string> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'failed': 'failed',
      'rejected': 'failed',
      'expired': 'failed',
      'unknown': 'unknown'
    };
    
    return statusMap[smsStatus] || 'unknown';
  }

  /**
   * Map calendar status to appointment status
   */
  private static mapCalendarStatus(calendarStatus?: string): string {
    const statusMap: Record<string, string> = {
      'confirmed': 'confirmed',
      'tentative': 'pending',
      'cancelled': 'cancelled'
    };
    
    return statusMap[calendarStatus || ''] || 'pending';
  }

  /**
   * Create notification for call status
   */
  private static async createCallStatusNotification(businessId: string, callId: string, status: string): Promise<void> {
    // Implementation would create appropriate notifications
    console.log(`Notification created for call ${callId} status: ${status}`);
  }

  /**
   * Create notification for delivery failure
   */
  private static async createDeliveryFailureNotification(businessId: string, conversationId: string, errorCode: string): Promise<void> {
    // Implementation would create appropriate notifications
    console.log(`Delivery failure notification created for conversation ${conversationId}: ${errorCode}`);
  }

  /**
   * Create notification for calendar sync
   */
  private static async createCalendarSyncNotification(businessId: string, appointmentId: string, eventType: string): Promise<void> {
    // Implementation would create appropriate notifications
    console.log(`Calendar sync notification created for appointment ${appointmentId}: ${eventType}`);
  }

  /**
   * Handle calendar cancellation
   */
  private static async handleCalendarCancellation(payload: GoogleCalendarWebhookPayload, businessId: string, webhookLogId: string): Promise<any> {
    const { data: appointment } = await supabaseServiceRole
      .from('appointments')
      .select('id, status')
      .eq('external_event_id', payload.id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (appointment && appointment.status !== 'cancelled') {
      await supabaseServiceRole
        .from('appointments')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', appointment.id);

      await this.createCalendarSyncNotification(businessId, appointment.id, 'calendar_event_cancelled');
    }

    await this.markWebhookCompleted(webhookLogId);

    return {
      success: true,
      message: 'Calendar cancellation processed',
      appointmentSynced: !!appointment
    };
  }

  /**
   * Extract customer email from calendar event
   */
  private static async extractCustomerEmail(payload: GoogleCalendarWebhookPayload): Promise<string | null> {
    // Try to get email from attendees or organizer
    const attendees = payload.attendees || [];
    const email = attendees.find(attendee => attendee.email !== payload.organizer?.email)?.email;
    return email || null;
  }

  /**
   * Calculate event duration from start and end times
   */
  private static calculateEventDuration(start?: any, end?: any): number {
    if (!start?.dateTime || !end?.dateTime) {
      return 60; // Default 1 hour
    }
    
    const startTime = new Date(start.dateTime).getTime();
    const endTime = new Date(end.dateTime).getTime();
    const durationMinutes = (endTime - startTime) / (1000 * 60);
    
    return Math.max(durationMinutes, 15); // Min 15 minutes
  }
}
