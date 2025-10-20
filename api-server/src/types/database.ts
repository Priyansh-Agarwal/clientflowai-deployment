// Database types matching the Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          business_id: string
          external_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string
          phone_formatted: string | null
          address: Json | null
          date_of_birth: string | null
          gender: string | null
          preferences: Json | null
          tags: string[] | null
          notes: string | null
          lead_source: string | null
          status: string | null
          last_interaction_at: string | null
          total_spent: number | null
          lifetime_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          external_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone: string
          phone_formatted?: string | null
          address?: Json | null
          date_of_birth?: string | null
          gender?: string | null
          preferences?: Json | null
          tags?: string[] | null
          notes?: string | null
          lead_source?: string | null
          status?: string | null
          last_interaction_at?: string | null
          total_spent?: number | null
          lifetime_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          external_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string
          phone_formatted?: string | null
          address?: Json | null
          date_of_birth?: string | null
          gender?: string | null
          preferences?: Json | null
          tags?: string[] | null
          notes?: string | null
          lead_source?: string | null
          status?: string | null
          last_interaction_at?: string | null
          total_spent?: number | null
          lifetime_value?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          business_id: string
          customer_id: string | null
          service_id: string | null
          external_appointment_id: string | null
          customer_name: string
          customer_phone: string
          customer_email: string | null
          customer_notes: string | null
          service_name: string
          scheduled_at: string
          end_time: string
          duration: number
          status: string
          cancellation_reason: string | null
          cancellation_fee: number | null
          total_price: number | null
          payment_status: string | null
          payment_method: string | null
          reminder_sent: boolean | null
          confirmation_sent: boolean | null
          notes: string | null
          internal_notes: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          customer_id?: string | null
          service_id?: string | null
          external_appointment_id?: string | null
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          customer_notes?: string | null
          service_name: string
          scheduled_at: string
          end_time: string
          duration?: number | null
          status?: string | null
          cancellation_reason?: string | null
          cancellation_fee?: number | null
          total_price?: number | null
          payment_status?: string | null
          payment_method?: string | null
          reminder_sent?: boolean | null
          confirmation_sent?: boolean | null
          notes?: string | null
          internal_notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          customer_id?: string | null
          service_id?: string | null
          external_appointment_id?: string | null
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          customer_notes?: string | null
          service_name?: string
          scheduled_at?: string
          end_time?: string
          duration?: number | null
          status?: string | null
          cancellation_reason?: string | null
          cancellation_fee?: number | null
          total_price?: number | null
          payment_status?: string | null
          payment_method?: string | null
          reminder_sent?: boolean | null
          confirmation_sent?: boolean | null
          notes?: string | null
          internal_notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          business_id: string
          customer_id: string | null
          external_conversation_id: string | null
          thread_type: string
          channel: string
          status: string | null
          participants: Json | null
          metadata: Json | null
          last_message_at: string | null
          last_message_preview: string | null
          unread_count: number | null
          priority: string | null
          tags: string[] | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          customer_id?: string | null
          external_conversation_id?: string | null
          thread_type: string
          channel: string
          status?: string | null
          participants?: Json | null
          metadata?: Json | null
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count?: number | null
          priority?: string | null
          tags?: string[] | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          customer_id?: string | null
          external_conversation_id?: string | null
          thread_type?: string
          channel?: string
          status?: string | null
          participants?: Json | null
          metadata?: Json | null
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count?: number | null
          priority?: string | null
          tags?: string[] | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      conversation_messages: {
        Row: {
          id: string
          business_id: string
          conversation_id: string
          external_message_id: string | null
          sender_type: string
          sender_id: string | null
          sender_name: string | null
          sender_contact: string | null
          body: string
          message_type: string | null
          direction: string | null
          status: string | null
          attachments: Json | null
          metadata: Json | null
          read_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          conversation_id: string
          external_message_id?: string | null
          sender_type: string
          sender_id?: string | null
          sender_name?: string | null
          sender_contact?: string | null
          body: string
          message_type?: string | null
          direction?: string | null
          status?: string | null
          attachments?: Json | null
          metadata?: Json | null
          read_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          conversation_id?: string
          external_message_id?: string | null
          sender_type?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_contact?: string | null
          body?: string
          message_type?: string | null
          direction?: string | null
          status?: string | null
          attachments?: Json | null
          metadata?: Json | null
          read_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          business_id: string
          customer_id: string | null
          caller_phone: string | null
          caller_name: string | null
          twilio_call_sid: string | null
          twilio_account_sid: string | null
          phone_number: string
          direction: string
          status: string | null
          started_at: string
          ended_at: string | null
          duration: number | null
          outcome: string | null
          quality: Json | null
          transcript: Json | null
          recording_url: string | null
          transcription_url: string | null
          call_data: Json | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          customer_id?: string | null
          caller_phone?: string | null
          caller_name?: string | null
          twilio_call_sid?: string | null
          twilio_account_sid?: string | null
          phone_number: string
          direction: string
          status?: string | null
          started_at: string
          ended_at?: string | null
          duration?: number | null
          outcome?: string | null
          quality?: Json | null
          transcript?: Json | null
          recording_url?: string | null
          transcription_url?: string | null
          call_data?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          customer_id?: string | null
          caller_phone?: string | null
          caller_name?: string | null
          twilio_call_sid?: string | null
          twilio_account_sid?: string | null
          phone_number?: string
          direction?: string
          status?: string | null
          started_at?: string
          ended_at?: string | null
          duration?: number | null
          outcome?: string | null
          quality?: Json | null
          transcript?: Json | null
          recording_url?: string | null
          transcription_url?: string | null
          call_data?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          business_id: string
          customer_id: string | null
          external_review_id: string | null
          platform: string | null
          reviewer_name: string
          reviewer_email: string | null
          reviewer_phone: string | null
          rating: number
          title: string | null
          comment: string | null
          response: string | null
          response_date: string | null
          response_by: string | null
          status: string | null
          verified: boolean | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          customer_id?: string | null
          external_review_id?: string | null
          platform?: string | null
          reviewer_name: string
          reviewer_email?: string | null
          reviewer_phone?: string | null
          rating: number
          title?: string | null
          comment?: string | null
          response?: string | null
          response_date?: string | null
          response_by?: string | null
          status?: string | null
          verified?: boolean | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          customer_id?: string | null
          external_review_id?: string | null
          platform?: string | null
          reviewer_name?: string
          reviewer_email?: string | null
          reviewer_phone?: string | null
          rating?: number
          title?: string | null
          comment?: string | null
          response?: string | null
          response_date?: string | null
          response_by?: string | null
          status?: string | null
          verified?: boolean | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          business_id: string
          external_service_id: string | null
          name: string
          description: string | null
          category: string | null
          price: number
          duration_minutes: number | null
          is_active: boolean | null
          booking_required: boolean | null
          max_participants: number | null
          prerequisites: string | null
          cancellation_policy: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          external_service_id?: string | null
          name: string
          description?: string | null
          category?: string | null
          price: number
          duration_minutes?: number | null
          is_active?: boolean | null
          booking_required?: boolean | null
          max_participants?: number | null
          prerequisites?: string | null
          cancellation_policy?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          external_service_id?: string | null
          name?: string
          description?: string | null
          category?: string | null
          price?: number
          duration_minutes?: number | null
          is_active?: boolean | null
          booking_required?: boolean | null
          max_participants?: number | null
          prerequisites?: string | null
          cancellation_policy?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          phone_number: string | null
          title: string | null
          bio: string | null
          preferences: Json | null
          last_login_at: string | null
          email_verified: boolean | null
          phone_verified: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          title?: string | null
          bio?: string | null
          preferences?: Json | null
          last_login_at?: string | null
          email_verified?: boolean | null
          phone_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          title?: string | null
          bio?: string | null
          preferences?: Json | null
          last_login_at?: string | null
          email_verified?: boolean | null
          phone_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];

export type ConversationMessage = Database['public']['Tables']['conversation_messages']['Row'];
export type ConversationMessageInsert = Database['public']['Tables']['conversation_messages']['Insert'];
export type ConversationMessageUpdate = Database['public']['Tables']['conversation_messages']['Update'];

export type Call = Database['public']['Tables']['calls']['Row'];
export type CallInsert = Database['public']['Tables']['calls']['Insert'];
export type CallUpdate = Database['public']['Tables']['calls']['Update'];

export type Review = Database['public']['Tables']['reviews']['Row'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];

export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceInsert = Database['public']['Tables']['services']['Insert'];
export type ServiceUpdate = Database['public']['Tables']['services']['Update'];

// Analytics and Metrics types
export interface DashboardMetrics {
  totalCalls: number;
  answeredCalls: number;
  totalAppointments: number;
  confirmedAppointments: number;
  totalRevenue: number;
  callConversionRate: number;
  appointmentConversionRate: number;
  averageCallDuration: number;
  averageAppointmentValue: number;
}

export interface CallOutcomeDistribution {
  outcome: string;
  count: number;
  percentage: number;
}

export interface DailyMetrics {
  date: string;
  bookings: number;
  revenue: number;
  calls: number;
  appointments: number;
}

export interface MonthlyRevenueBreakdown {
  month: string;
  revenue: number;
  bookings: number;
  source: 'appointments' | 'services' | 'products';
}

export interface AnalyticsTimeRange {
  startDate: string;
  endDate: string;
  period: '7d' | '30d' | '90d' | '1y' | 'custom';
}

// Team Management types
export type TeamMember = Database['public']['Tables']['business_members']['Row'];
export type TeamMemberInsert = Database['public']['Tables']['business_members']['Insert'];
export type TeamMemberUpdate = Database['public']['Tables']['business_members']['Update'];

export interface TeamMemberWithProfile {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  permissions: string[] | null;
  joined_at: string;
  invited_by: string | null;
  status: string | null;
  // Profile data
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  title: string | null;
  last_login_at: string | null;
  email_verified: boolean | null;
  // Business context
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;
}

export interface TeamInvitation {
  email: string;
  role: string;
  business_id: string;
  invited_by: string;
  permissions?: string[];
  custom_message?: string;
}

export interface TeamRolePermissions {
  owner: string[];
  admin: string[];
  manager: string[];
  staff: string[];
  viewer: string[];
}

export interface TeamMemberStats {
  total_members: number;
  active_members: number;
  pending_invitations: number;
  role_distribution: Record<string, number>;
  recent_joiners: TeamMemberWithProfile[];
}

// File Upload and Notifications types
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type UploadedFile = Database['public']['Tables']['uploaded_files']['Row'];
export type UploadedFileInsert = Database['public']['Tables']['uploaded_files']['Insert'];
export type UploadedFileUpdate = Database['public']['Tables']['uploaded_files']['Update'];

export interface FileUploadResult {
  file_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_size_mb: number;
  file_type: string;
  mime_type: string;
  public_url: string;
  notification_id: string;
}

export interface NotificationStats {
  total_notifications: number;
  unread_count: number;
  read_count: number;
  notifications_by_type: Record<string, number>;
  recent_notifications: Notification[];
}

export interface FileUploadStats {
  total_files: number;
  total_size_mb: number;
  files_by_type: Record<string, number>;
  recent_uploads: Array<{
    file_name: string;
    file_size_mb: number;
    created_at: string;
  }>;
}

// Webhook Integration types
export type WebhookLog = Database['public']['Tables']['webhook_logs']['Row'];
export type WebhookLogInsert = Database['public']['Tables']['webhook_logs']['Insert'];
export type WebhookLogUpdate = Database['public']['Tables']['webhook_logs']['Update'];

export interface WebhookPayload {
  CallSid?: string;
  CallStatus?: string;
  CallDirection?: string;
  From?: string;
  To?: string;
  CallDuration?: string;
  RecordingUrl?: string;
  TranscriptionText?: string;
  FallbackUrl?: string;
  StatusCallback?: string;
  // Twilio webhook fields
  
  messageId?: string;
  status?: string;
  deliveryStatus?: string;
  errorCode?: string;
  timestamp?: string;
  // SMS Provider webhook fields
  
  eventId?: string;
  summary?: string;
  description?: string;
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  // Google Calendar webhook fields
  
  reviewId?: string;
  reviewerName?: string;
  reviewRating?: number;
  reviewText?: string;
  reviewDate?: string;
  platform?: string;
  businessId?: string;
  // Review Platform webhook fields
  
  [key: string]: any; // Additional fields for flexibility
}

export interface WebhookEvent {
  id: string;
  source: 'twilio' | 'google-calendar' | 'sms-provider' | 'review-platforms';
  event_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: WebhookPayload;
  processed_at?: string;
  error_message?: string;
  retries: number;
  business_id?: string;
  created_at: string;
}

export interface WebhookSignature {
  signature: string;
  timestamp: string;
  algorithm: string;
  valid: boolean;
}

export interface TwilioWebhookData {
  callSid: string;
  callStatus: string;
  callDirection: string;
  from: string;
  to: string;
  callDuration?: number;
  recordingUrl?: string;
  transcriptionText?: string;
  business_id?: string;
}

export interface SMSServiceWebhookData {
  messageId: string;
  status: string;
  deliveryStatus?: string;
  errorCode?: string;
  timestamp: string;
  business_id?: string;
}

export interface GoogleCalendarWebhookData {
  eventId: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  status: string;
  business_id?: string;
}

export interface ReviewPlatformWebhookData {
  reviewId: string;
  reviewerName: string;
  reviewRating: number;
  reviewText?: string;
  reviewDate: string;
  platform: string;
  businessId: string;
}
