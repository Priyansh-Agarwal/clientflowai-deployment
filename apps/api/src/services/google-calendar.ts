import { google } from 'googleapis';
import { createJobLogger } from '../config/logger';
import { redactString } from '../utils/redaction';

const isSandboxMode = !process.env.GOOGLE_SVC_ACCOUNT_JSON;

let auth: any = null;
let calendar: any = null;

if (process.env.GOOGLE_SVC_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_SVC_ACCOUNT_JSON, 'base64').toString()
    );
    
    auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    calendar = google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('Failed to initialize Google Calendar auth:', error);
  }
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface GoogleCalendarWebhookPayload {
  id: string;
  resourceId: string;
  resourceUri: string;
  token: string;
  type: string;
  address: string;
  expiration: string;
  orgId?: string;
}

export class GoogleCalendarService {
  private logger = createJobLogger('google-calendar-service', 'google-calendar-service');

  /**
   * Create or update calendar event
   */
  async upsertEvent(
    calendarId: string,
    event: CalendarEvent,
    orgId: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    this.logger.info('Upserting calendar event', {
      calendarId: redactString(calendarId),
      eventId: event.id,
      summary: redactString(event.summary),
      orgId,
      sandboxMode: isSandboxMode,
    });

    if (isSandboxMode) {
      this.logger.warn('Google Calendar sandbox mode - event not created', {
        calendarId: redactString(calendarId),
        summary: redactString(event.summary),
        orgId,
      });
      
      return {
        success: true,
        eventId: `sandbox_event_${Date.now()}`,
      };
    }

    if (!calendar) {
      this.logger.error('Google Calendar not initialized');
      return {
        success: false,
        error: 'Google Calendar service not configured',
      };
    }

    try {
      const eventData = {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees?.map(attendee => ({
          email: redactString(attendee.email),
          displayName: attendee.displayName,
        })),
        reminders: event.reminders,
        extendedProperties: {
          private: {
            orgId,
          },
        },
      };

      let response;
      if (event.id) {
        // Update existing event
        response = await calendar.events.update({
          calendarId,
          eventId: event.id,
          requestBody: eventData,
        });
      } else {
        // Create new event
        response = await calendar.events.insert({
          calendarId,
          requestBody: eventData,
        });
      }

      this.logger.info('Calendar event upserted successfully', {
        eventId: response.data.id,
        calendarId: redactString(calendarId),
        summary: redactString(event.summary),
        orgId,
      });

      return {
        success: true,
        eventId: response.data.id,
      };
    } catch (error: any) {
      this.logger.error('Failed to upsert calendar event', {
        error: error.message,
        code: error.code,
        calendarId: redactString(calendarId),
        eventId: event.id,
        orgId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(
    calendarId: string,
    eventId: string,
    orgId: string
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.info('Deleting calendar event', {
      calendarId: redactString(calendarId),
      eventId,
      orgId,
      sandboxMode: isSandboxMode,
    });

    if (isSandboxMode) {
      this.logger.warn('Google Calendar sandbox mode - event not deleted', {
        calendarId: redactString(calendarId),
        eventId,
        orgId,
      });
      
      return { success: true };
    }

    if (!calendar) {
      this.logger.error('Google Calendar not initialized');
      return {
        success: false,
        error: 'Google Calendar service not configured',
      };
    }

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      });

      this.logger.info('Calendar event deleted successfully', {
        eventId,
        calendarId: redactString(calendarId),
        orgId,
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to delete calendar event', {
        error: error.message,
        code: error.code,
        calendarId: redactString(calendarId),
        eventId,
        orgId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set up push notification channel
   */
  async createWatchChannel(
    calendarId: string,
    webhookUrl: string,
    orgId: string
  ): Promise<{ success: boolean; channelId?: string; resourceId?: string; error?: string }> {
    this.logger.info('Creating watch channel', {
      calendarId: redactString(calendarId),
      webhookUrl: redactString(webhookUrl),
      orgId,
      sandboxMode: isSandboxMode,
    });

    if (isSandboxMode) {
      this.logger.warn('Google Calendar sandbox mode - watch channel not created');
      return {
        success: true,
        channelId: `sandbox_channel_${Date.now()}`,
        resourceId: `sandbox_resource_${Date.now()}`,
      };
    }

    if (!calendar) {
      this.logger.error('Google Calendar not initialized');
      return {
        success: false,
        error: 'Google Calendar service not configured',
      };
    }

    try {
      const response = await calendar.events.watch({
        calendarId,
        requestBody: {
          id: `clientflow-${orgId}-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
          token: orgId, // Use orgId as token for identification
        },
      });

      this.logger.info('Watch channel created successfully', {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        calendarId: redactString(calendarId),
        orgId,
      });

      return {
        success: true,
        channelId: response.data.id,
        resourceId: response.data.resourceId,
      };
    } catch (error: any) {
      this.logger.error('Failed to create watch channel', {
        error: error.message,
        code: error.code,
        calendarId: redactString(calendarId),
        orgId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Stop push notification channel
   */
  async stopWatchChannel(
    channelId: string,
    resourceId: string,
    orgId: string
  ): Promise<{ success: boolean; error?: string }> {
    this.logger.info('Stopping watch channel', {
      channelId,
      resourceId,
      orgId,
      sandboxMode: isSandboxMode,
    });

    if (isSandboxMode) {
      this.logger.warn('Google Calendar sandbox mode - watch channel not stopped');
      return { success: true };
    }

    if (!calendar) {
      this.logger.error('Google Calendar not initialized');
      return {
        success: false,
        error: 'Google Calendar service not configured',
      };
    }

    try {
      await calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId,
        },
      });

      this.logger.info('Watch channel stopped successfully', {
        channelId,
        resourceId,
        orgId,
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to stop watch channel', {
        error: error.message,
        code: error.code,
        channelId,
        resourceId,
        orgId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify webhook token
   */
  verifyWebhookToken(token: string, orgId: string): boolean {
    if (isSandboxMode) {
      this.logger.warn('Google Calendar sandbox mode - skipping token verification');
      return true;
    }

    const isValid = token === orgId;
    
    this.logger.debug('Google Calendar webhook token verification', {
      verified: isValid,
      token: redactString(token),
      orgId,
    });

    return isValid;
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: any): GoogleCalendarWebhookPayload | null {
    try {
      const payload: GoogleCalendarWebhookPayload = {
        id: body.id,
        resourceId: body.resourceId,
        resourceUri: body.resourceUri,
        token: body.token,
        type: body.type,
        address: body.address,
        expiration: body.expiration,
        orgId: body.token, // We use token as orgId
      };

      this.logger.debug('Parsed Google Calendar webhook payload', {
        id: payload.id,
        resourceId: payload.resourceId,
        type: payload.type,
        orgId: payload.orgId,
      });

      return payload;
    } catch (error: any) {
      this.logger.error('Failed to parse Google Calendar webhook payload', {
        error: error.message,
        body: redactString(JSON.stringify(body)),
      });
      return null;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !isSandboxMode && !!calendar;
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; sandboxMode: boolean } {
    return {
      configured: this.isConfigured(),
      sandboxMode: isSandboxMode,
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
