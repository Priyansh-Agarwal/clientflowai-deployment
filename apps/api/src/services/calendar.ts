import { google } from 'googleapis';
import { prisma } from '../lib/prisma';
import logger from '../middleware/logger';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface UpsertEventParams {
  orgId: string;
  appointmentId: string;
  event: CalendarEvent;
  calendarId?: string;
}

export class CalendarService {
  private static getGoogleCalendar() {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(Buffer.from(process.env.GOOGLE_SVC_ACCOUNT_JSON!, 'base64').toString()),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    return google.calendar({ version: 'v3', auth });
  }

  static async upsertEvent({ orgId, appointmentId, event, calendarId = 'primary' }: UpsertEventParams) {
    try {
      const calendar = this.getGoogleCalendar();
      
      const eventData = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC',
        },
        location: event.location,
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName,
        })),
        extendedProperties: {
          private: {
            orgId,
            appointmentId,
            ...event.metadata,
          },
        },
      };

      let googleEvent;
      
      if (event.id) {
        // Update existing event
        googleEvent = await calendar.events.update({
          calendarId,
          eventId: event.id,
          requestBody: eventData,
        });
        
        logger.info('Google Calendar event updated', {
          eventId: event.id,
          appointmentId,
          orgId,
        });
      } else {
        // Create new event
        googleEvent = await calendar.events.insert({
          calendarId,
          requestBody: eventData,
        });
        
        logger.info('Google Calendar event created', {
          eventId: googleEvent.data.id,
          appointmentId,
          orgId,
        });
      }

      // Update appointment with Google Calendar event ID
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          meta: {
            googleEventId: googleEvent.data.id,
            calendarId,
            ...event.metadata,
          },
        },
      });

      return {
        id: googleEvent.data.id,
        htmlLink: googleEvent.data.htmlLink,
        status: googleEvent.data.status,
      };
    } catch (error) {
      logger.error('Failed to upsert Google Calendar event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId,
        orgId,
      });
      throw error;
    }
  }

  static async deleteEvent(orgId: string, appointmentId: string, eventId: string, calendarId = 'primary') {
    try {
      const calendar = this.getGoogleCalendar();
      
      await calendar.events.delete({
        calendarId,
        eventId,
      });

      // Remove Google Calendar event ID from appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (appointment?.meta) {
        const meta = appointment.meta as any;
        delete meta.googleEventId;
        delete meta.calendarId;

        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { meta },
        });
      }

      logger.info('Google Calendar event deleted', {
        eventId,
        appointmentId,
        orgId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete Google Calendar event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId,
        appointmentId,
        orgId,
      });
      throw error;
    }
  }

  static async syncAppointmentToCalendar(appointmentId: string) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          contact: true,
          org: true,
        },
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const event: CalendarEvent = {
        title: `Meeting with ${appointment.contact.firstName} ${appointment.contact.lastName || ''}`.trim(),
        description: `Appointment for ${appointment.org.name}`,
        start: appointment.startsAt,
        end: appointment.endsAt,
        location: appointment.location || undefined,
        attendees: appointment.contact.email ? [{
          email: appointment.contact.email,
          displayName: `${appointment.contact.firstName} ${appointment.contact.lastName || ''}`.trim(),
        }] : undefined,
        metadata: {
          appointmentId,
          orgId: appointment.orgId,
          contactId: appointment.contactId,
        },
      };

      // Check if appointment already has a Google Calendar event
      const existingEventId = (appointment.meta as any)?.googleEventId;
      
      if (existingEventId) {
        event.id = existingEventId;
      }

      return await this.upsertEvent({
        orgId: appointment.orgId,
        appointmentId,
        event,
      });
    } catch (error) {
      logger.error('Failed to sync appointment to calendar', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appointmentId,
      });
      throw error;
    }
  }

  static async handleWebhookNotification(notification: any) {
    try {
      // Handle Google Calendar webhook notifications
      // This would typically involve verifying the webhook signature
      // and processing the notification to sync changes back to our database
      
      logger.info('Google Calendar webhook notification received', {
        notification,
      });

      // Implementation would depend on the specific webhook payload
      // For now, just log the notification
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to handle Google Calendar webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notification,
      });
      throw error;
    }
  }
}

