import { supabase } from '../config/supabase';
import { Appointment, AppointmentInsert, AppointmentUpdate } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';
import { calculateEndTime } from '../validation/appointmentSchemas';
import moment from 'moment';

export class AppointmentService {
  /**
   * Create a new appointment
   */
  static async createAppointment(businessId: string, appointmentData: AppointmentInsert): Promise<Appointment> {
    try {
      // Calculate end time if not provided
      const durationMinutes = appointmentData.duration || 60;
      const endTime = calculateEndTime(appointmentData.scheduled_at, durationMinutes);

      // Add business_id and prepare data for insertion
      const insertData: AppointmentInsert = {
        ...appointmentData,
        business_id: businessId,
        end_time: endTime,
        status: 'pending', // Default status
        reminder_sent: false,
        confirmation_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create appointment: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        // Handle specific Supabase errors
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Appointment conflict: Another appointment exists at this time');
        }
        if (error.code === '23503') { // Foreign key constraint violation
          throw new Error('Referenced customer or service not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update an appointment (excluding status)
   */
  static async updateAppointment(
    appointmentId: string,
    businessId: string,
    updateData: AppointmentUpdate
  ): Promise<Appointment> {
    try {
      // Calculate new end time if scheduled_at or duration changed
      let endTime = updateData.end_time;
      if (updateData.scheduled_at || updateData.duration !== undefined) {
        // We need to get the current appointment to calculate end time correctly
        const { data: currentAppointment } = await supabase
          .from('appointments')
          .select('scheduled_at, duration')
          .eq('id', appointmentId)
          .eq('business_id', businessId)
          .single();

        if (currentAppointment) {
          const scheduledAt = updateData.scheduled_at || currentAppointment.scheduled_at;
          const duration = updateData.duration || currentAppointment.duration || 60;
          endTime = calculateEndTime(scheduledAt, duration);
        }
      }

      const { data, error } = await supabase
        .from('appointments')
        .update({
          ...updateData,
          end_time: endTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Appointment not found');
        }
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Appointment conflict: Another appointment exists at this time');
        }
        throw new Error(`Failed to update appointment: ${error.message}`);
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
   * Update appointment status with special handling
   */
  static async updateAppointmentStatus(
    appointmentId: string,
    businessId: string,
    status: string,
    cancellationReason?: string,
    cancellationFee?: number,
    notes?: string
  ): Promise<Appointment> {
    try {
      const updateData: AppointmentUpdate = {
        status,
        cancellation_reason: cancellationReason,
        cancellation_fee: cancellationFee,
        notes: notes ? `${notes}` : undefined,
        updated_at: new Date().toISOString(),
      };

      // Update confirmation_sent flag when status becomes confirmed
      if (status === 'confirmed') {
        updateData.confirmation_sent = true;
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Appointment not found');
        }
        throw new Error(`Failed to update appointment status: ${error.message}`);
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
   * Delete an appointment (soft delete by status update)
   */
  static async deleteAppointment(appointmentId: string, businessId: string): Promise<void> {
    try {
      // Instead of hard delete, we'll mark as cancelled
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Deleted by user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId)
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to delete appointment: ${error.message}`);
      }

      // Verify the appointment was updated successfully
      const { data, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('id', appointmentId)
        .eq('business_id', businessId)
        .eq('status', 'cancelled')
        .single();

      if (checkError) {
        throw new Error('Appointment not found');
      }
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get a single appointment by ID
   */
  static async getAppointmentById(appointmentId: string, businessId: string): Promise<Appointment> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Appointment not found');
        }
        throw new Error(`Failed to fetch appointment: ${error.message}`);
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
   * Get appointments with advanced filtering
   */
  static async getAppointments(
    businessId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      status?: string;
      customer_id?: string;
      customer_search?: string;
      service_id?: string;
      page: number;
      limit: number;
      sort_by?: string;
     未order?: 'asc' | 'desc';
      payment_status?: string;
      include_cancelled?: boolean;
    }
  ): Promise<{ appointments: Appointment[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        start_date,
        end_date,
        status,
        customer_id,
        customer_search,
        service_id,
        page,
        limit,
        sort_by = 'scheduled_at',
        sort_order = 'asc',
        payment_status,
        include_cancelled = false,
      } = filters;

      // Start building the query
      let query = supabase
        .from('appointments')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Date filtering
      if (start_date) {
        query = query.gte('scheduled_at', start_date);
      }
      if (end_date) {
        query = query.lte('end_time', end_date);
      }

      // Status filtering
      if (status) {
        query = query.eq('status', status);
      } else if (!include_cancelled) {
        query = query.neq('status', 'cancelled');
      }

      // Customer filtering
      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }
      
      if (customer_search && customer_search.trim()) {
        const searchTerm = `%${customer_search.trim()}%`;
        query = query.or(`customer_name.ilike.${searchTerm},customer_phone.ilike.${searchTerm}`);
      }

      // Service filtering
      if (service_id) {
        query = query.eq('service_id', service_id);
      }

      // Payment status filtering
      if (payment_status) {
        query = query.eq('payment_status', payment_status);
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch appointments: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        appointments: data || [],
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
   * Check for appointment conflicts
   */
  static async checkConflicts(
    businessId: string,
    scheduled_at: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      const endTime = moment(scheduled_at).add(duration, 'minutes').toISOString();

      let query = supabase
        .from('appointments')
        .select('id')
        .eq('business_id', businessId)
        .neq('status', 'cancelled')
        .or(`and(scheduled_at.lt.${endTime},end_time.gt.${scheduled_at})`);

      // Exclude current appointment if updating
      if (excludeAppointmentId) {
        query = query.neq('id', excludeAppointmentId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to check conflicts: ${error.message}`);
      }

      // If we find any appointments, there's a conflict
      return data && data.length > 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get upcoming appointments for reminders
   */
  static async getUpcomingAppointments(businessId: string, hoursAhead: number = 24): Promise<Appointment[]> {
    try {
      const now = new Date().toISOString();
      const futureTime = moment().add(hoursAhead, 'hours').toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_at', now)
        .lte('scheduled_at', futureTime)
        .eq('reminder_sent', false)
        .order('scheduled_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch upcoming appointments: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Mark appointment reminders as sent
   */
  static async markReminderSent(appointmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ reminder_sent: true, updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) {
        throw new Error(`Failed to mark reminder sent: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}
