import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointmentService';
import { SMSService } from '../services/smsService';
import { 
  CreateAppointmentInput, 
  UpdateAppointmentInput, 
  UpdateAppointmentStatusInput,
  GetAppointmentsQuery 
} from '../validation/appointmentSchemas';

export class AppointmentController {
  /**
   * POST /appointments - Create a new appointment
   */
  static async createAppointment(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const appointmentData: CreateAppointmentInput = req.body;

      // Check for conflicts
      const hasConflict = await AppointmentService.checkConflicts(
        businessId,
        appointmentData.scheduled_at,
        appointmentData.duration || 60
      );

      if (hasConflict) {
        res.status(409).json({
          error: 'Conflict',
          message: 'Another appointment is already scheduled at this time'
        });
        return;
      }

      const appointment = await AppointmentService.createAppointment(businessId, appointmentData);

      // Send confirmation SMS if status is confirmed
      if (appointment.status === 'confirmed') {
        try {
          await SMSService.sendConfirmation(appointment);
        } catch (smsError) {
          console.warn('Failed to send confirmation SMS:', smsError);
          // Don't fail the appointment creation if SMS fails
        }
      }

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Create appointment error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Appointment conflict')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Referenced customer not found')) {
          res.status(400).json({
            error: 'Invalid reference',
            message: error.message
          });
          return;
        }
        if (error.message.includes('must be scheduled for a future time')) {
          res.status(400).json({
            error: 'Invalid time',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create appointment'
      });
    }
  }

  /**
   * GET /appointments - Get paginated list of appointments with filtering
   */
  static async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const query: GetAppointmentsQuery = (req as any).validatedQuery;

      // Ensure reasonable limits
      const limit = Math.min(query.limit, 100);
      const page = Math.max(query.page, 1);

      const filters = {
        start_date: query.start_date,
        end_date: query.end_date,
        status: query.status,
        customer_id: query.customer_id,
        customer_search: query.customer_search,
        service_id: query.service_id,
        payment_status: query.payment_status,
        page,
        limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
        include_cancelled: query.include_cancelled,
      };

      const result = await AppointmentService.getAppointments(businessId, filters);

      res.status(200).json({
        success: true,
        data: {
          appointments: result.appointments,
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
      console.error('Get appointments error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch appointments'
      });
    }
  }

  /**
   * GET /appointments/:id - Get a single appointment by ID
   */
  static async getAppointmentById(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid appointment ID',
          message: 'Appointment ID must be a valid UUID'
        });
        return;
      }

      const appointment = await AppointmentService.getAppointmentById(id, businessId);

      res.status(200).json({
        success: true,
        data: appointment
      });
    } catch (error) {
      console.error('Get appointment by ID error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Appointment not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch appointment'
      });
    }
  }

  /**
   * PUT /appointments/:id - Update an appointment
   */
  static async updateAppointment(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;
      const updateData: UpdateAppointmentInput = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid appointment ID',
          message: 'Appointment ID must be a valid UUID'
        });
        return;
      }

      // Check for conflicts if schedule is changing
      if (updateData.scheduled_at || updateData.duration !== undefined) {
        const currentAppointment = await AppointmentService.getAppointmentById(id, businessId);
        
        const scheduledAt = updateData.scheduled_at || currentAppointment.scheduled_at;
        const duration = updateData.duration || currentAppointment.duration;

        const hasConflict = await AppointmentService.checkConflicts(
          businessId,
          scheduledAt,
          duration,
          id // Exclude current appointment from conflict check
        );

        if (hasConflict) {
          res.status(409).json({
            error: 'Conflict',
            message: 'Another appointment is already scheduled at this time'
          });
          return;
        }

        // Send rescheduled notification if time or duration changed
        try {
          if (updateData.scheduled_at) {
            await SMSService.sendRescheduledNotification(currentAppointment);
          }
        } catch (smsError) {
          console.warn('Failed to send reschedule notification:', smsError);
        }
      }

      const appointment = await AppointmentService.updateAppointment(id, businessId, updateData);

      res.status(200).json({
        success: true,
        message: 'Appointment updated successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Update appointment error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Appointment not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Appointment conflict')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update appointment'
      });
    }
  }

  /**
   * PUT /appointments/:id/status - Update appointment status with SMS notifications
   */
  static async updateAppointmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;
      const statusData: UpdateAppointmentStatusInput = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid appointment ID',
          message: 'Appointment ID must be a valid UUID'
        });
        return;
      }

      // Get current appointment for SMS notifications
      const currentAppointment = await AppointmentService.getAppointmentById(id, businessId);

      // Update status
      const appointment = await AppointmentService.updateAppointmentStatus(
        id,
        businessId,
        statusData.status,
        statusData.cancellation_reason,
        statusData.cancellation_fee,
        statusData.notes
      );

      // Send appropriate SMS notifications based on status change
      try {
        switch (statusData.status) {
          case 'confirmed':
            await SMSService.sendConfirmation(appointment);
            break;
          
          case 'cancelled':
            await SMSService.sendCancelledSMS(appointment, statusData.cancellation_reason);
            break;
          
          case 'completed':
            // No SMS needed for completion
            break;
          
          case 'no_show':
            // Could send a follow-up SMS here
            break;
        }
      } catch (smsError) {
        console.warn('Failed to send status notification SMS:', smsError);
        // Don't fail the status update if SMS fails
      }

      res.status(200).json({
        success: true,
        message: 'Appointment status updated successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Update appointment status error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Appointment not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update appointment status'
      });
    }
  }

  /**
   * DELETE /appointments/:id - Cancel an appointment
   */
  static async deleteAppointment(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid appointment ID',
          message: 'Appointment ID must be a valid UUID'
        });
        return;
      }

      // Get appointment for SMS notification before deletion
      const appointment = await AppointmentService.getAppointmentById(id, businessId);

      // Mark as cancelled
      await AppointmentService.deleteAppointment(id, businessId);

      // Send cancellation SMS
      try {
        await SMSService.sendCancelledSMS(appointment, 'Cancelled by appointment manager');
      } catch (smsError) {
        console.warn('Failed to send cancellation SMS:', smsError);
      }

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully'
      });
    } catch (error) {
      console.error('Delete appointment error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Appointment not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to cancel appointment'
      });
    }
  }
}
