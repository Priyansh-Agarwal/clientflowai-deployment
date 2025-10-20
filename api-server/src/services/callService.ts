import { supabase } from '../config/supabase';
import { Call, CallInsert, CallUpdate } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';
import { formatPhoneNumber } from '../validation/callSchemas';

export class CallService {
  /**
   * Create a new call record
   */
  static async createCall(businessId: string, callData: CallInsert): Promise<Call> {
    try {
      // Format phone numbers
      const phoneNumber = formatPhoneNumber(callData.phone_number);
      const callerPhone = callData.caller_phone ? formatPhoneNumber(callData.caller_phone) : null;

      // Add business_id and prepare data for insertion
      const insertData: CallInsert = {
        ...callData,
        business_id: businessId,
        phone_number: phoneNumber,
        caller_phone: callerPhone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('calls')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create call: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        // Handle specific Supabase errors
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Call with this Twilio SID already exists');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      if (error instanceof Error && error.message.includes('Invalid phone number')) {
        throw new Error('Invalid phone number format');
      }
      throw error;
    }
  }

  /**
   * Update call record
   */
  static async updateCall(
    callId: string,
    businessId: string,
    updateData: CallUpdate
  ): Promise<Call> {
    try {
      // Format phone numbers if provided
      if (updateData.phone_number) {
        updateData.phone_number = formatPhoneNumber(updateData.phone_number);
      }
      if (updateData.caller_phone) {
        updateData.caller_phone = formatPhoneNumber(updateData.caller_phone);
      }

      const { data, error } = await supabase
        .from('calls')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Call not found');
        }
        throw new Error(`Failed to update call: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      if (error instanceof Error && error.message.includes('Invalid phone number')) {
        throw new Error('Invalid phone number format');
      }
      throw error;
    }
  }

  /**
   * Get calls with filtering and pagination
   */
  static async getCalls(
    businessId: string,
    filters: {
      customer_id?: string;
      direction?: string;
      status?: string;
      outcome?: string;
      twilio_call_sid?: string;
      start_date?: string;
      end_date?: string;
      min_duration?: number;
      max_duration?: number;
      search?: string;
      page: number;
      limit: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      has_recording?: boolean;
      has_transcript?: boolean;
      tags?: string;
    }
  ): Promise<{ calls: Call[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        customer_id,
        direction,
        status,
        outcome,
        twilio_call_sid,
        start_date,
        end_date,
        min_duration,
        max_duration,
        search,
        page,
        limit,
        sort_by = 'started_at',
        sort_order = 'desc',
        has_recording,
        has_transcript,
        tags,
      } = filters;
      
      // Start building the query
      let query = supabase
        .from('calls')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Apply filters
      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }
      
      if (direction) {
        query = query.eq('direction', direction);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (outcome) {
        query = query.eq('outcome', outcome);
      }
      
      if (twilio_call_sid) {
        query = query.eq('twilio_call_sid', twilio_call_sid);
      }

      // Date filtering
      if (start_date) {
        query = query.gte('started_at', start_date);
      }
      if (end_date) {
        query = query.lte('started_at', end_date);
      }

      // Duration filtering
      if (min_duration !== undefined) {
        query = query.gte('duration', min_duration);
      }
      if (max_duration !== undefined) {
        query = query.lte('duration', max_duration);
      }

      // Search functionality (phone numbers, caller names)
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`caller_phone.ilike.${searchTerm},caller_name.ilike.${searchTerm},phone_number.ilike.${searchTerm}`);
      }

      // Recording filtering
      if (has_recording !== undefined) {
        if (has_recording) {
          query = query.not('recording_url', 'is');

        } else {
          query = query.is('recording_url', null);
        }
      }

      // Transcript filtering
      if (has_transcript !== undefined) {
        if (has_transcript) {
          query = query.not('transcript', 'is', null);
        } else {
          query = query.is('transcript', null);
        }
      }

      // Tags filtering
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim());
        tagList.forEach(tag => {
          query = query.contains('metadata->tags', [tag]);
        });
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch calls: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        calls: data || [],
        total: count || 0,
        page,
        totalPages,
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get a single call by ID
   */
  static async getCallById(callId: string, businessId: string): Promise<Call> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Call not found');
        }
        throw new Error(`Failed to fetch call: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get call by Twilio Call SID
   */
  static async getCallByTwilioSid(twilioCallSid: string, businessId: string): Promise<Call> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('twilio_call_sid', twilioCallSid)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Call not found');
        }
        throw new Error(`Failed to fetch call by Twilio SID: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update call with recording information
   */
  static async updateCallRecording(
    callId: string,
    businessId: string,
    recordingUrl: string,
    duration?: number,
    metadata?: any
  ): Promise<Call> {
    try {
      const updateData: CallUpdate = {
        recording_url: recordingUrl,
        ...(duration && { duration }),
        metadata: {
          ...metadata,
          recording_uploaded_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update call recording: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update call transcript
   */
  static async updateCallTranscript(
    callId: string,
    businessId: string,
    transcript: any,
    transcriptionUrl?: string
  ): Promise<Call> {
    try {
      const updateData: CallUpdate = {
        transcript,
        ...(transcriptionUrl && { transcription_url: transcriptionUrl }),
        metadata: {
          transcription_updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update call transcript: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  static async getCallStats(businessId: string): Promise<{
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    totalDuration: number;
    averageDuration: number;
    callOutcomeBreakdown: Record<string, number>;
    callsByDirection: Record<string, number>;
    callsByStatus: Record<string, number>;
  }> {
    try {
      const { data: calls, error } = await supabase
        .from('calls')
        .select('outcome, direction, status, duration')
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to fetch call statistics: ${error.message}`);
      }

      const totalCalls = calls.length;
      const answeredCalls = calls.filter(c => c.outcome === 'completed').length;
      const missedCalls = calls.filter(c => c.outcome === 'missed' || c.outcome === 'no-answer').length;
      
      let totalDuration = 0;
      let durationCount = 0;
      
      calls.forEach(call => {
        if (call.duration) {
          totalDuration += call.duration;
          durationCount++;
        }
      });

      const averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;

      // Breakdown by outcome
      const callOutcomeBreakdown: Record<string, number> = {};
      calls.forEach(call => {
        if (call.outcome) {
          callOutcomeBreakdown[call.outcome] = (callOutcomeBreakdown[call.outcome] || 0) + 1;
        }
      });

      // Breakdown by direction
      const callsByDirection: Record<string, number> = {};
      calls.forEach(call => {
        callsByDirection[call.direction] = (callsByDirection[call.direction] || 0) + 1;
      });

      // Breakdown by status
      const callsByStatus: Record<string, number> = {};
      calls.forEach(call => {
        if (call.status) {
          callsByStatus[call.status] = (callsByStatus[call.status] || 0) + 1;
        }
      });

      return {
        totalCalls,
        answeredCalls,
        missedCalls,
        totalDuration,
        averageDuration,
        callOutcomeBreakdown,
        callsByDirection,
        callsByStatus,
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete call (soft delete by marking as deleted in metadata)
   */
  static async deleteCall(callId: string, businessId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({
          metadata: {
            deleted: true,
            deleted_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', callId)
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to delete call: ${error.message}`);
      }

      // Verify the call was updated successfully
      const { data, error: checkError } = await supabase
        .from('calls')
        .select('id')
        .eq('id', callId)
        .eq('business_id', businessId)
        .eq('metadata->deleted', true)
        .single();

      if (checkError) {
        throw new Error('Call not found');
      }
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Bulk update calls
   */
  static async bulkUpdateCalls(
    businessId: string,
    callIds: string[],
    updateData: Partial<CallUpdate>
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .in('id', callIds)
        .eq('business_id', businessId)
        .select('id');

      if<｜tool▁call▁begin｜>error) {
        throw new Error(`Failed to bulk update calls: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}
