export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_scripts: {
        Row: {
          business_id: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          objection_handling: Json | null
          personality: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          objection_handling?: Json | null
          personality?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          objection_handling?: Json | null
          personality?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_scripts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          business_id: string
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          duration: number | null
          id: string
          notes: string | null
          reminder_sent: boolean | null
          scheduled_at: string
          service_type: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          duration?: number | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_at: string
          service_type: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          duration?: number | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_at?: string
          service_type?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_hours: Json | null
          calendar_id: string | null
          created_at: string | null
          id: string
          name: string
          phone_number: string | null
          review_link: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          business_hours?: Json | null
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone_number?: string | null
          review_link?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          business_hours?: Json | null
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          review_link?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          business_id: string
          caller_name: string | null
          caller_phone: string
          converted: boolean | null
          created_at: string | null
          duration: number | null
          id: string
          objection_notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          recording_url: string | null
          transcript: string | null
        }
        Insert: {
          business_id: string
          caller_name?: string | null
          caller_phone: string
          converted?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: string
          objection_notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          recording_url?: string | null
          transcript?: string | null
        }
        Update: {
          business_id?: string
          caller_name?: string | null
          caller_phone?: string
          converted?: boolean | null
          created_at?: string | null
          duration?: number | null
          id?: string
          objection_notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          recording_url?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          channel: Database["public"]["Enums"]["conversation_channel"]
          created_at: string | null
          customer_contact: string
          customer_name: string | null
          direction: string
          id: string
          message: string
        }
        Insert: {
          business_id: string
          channel: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string | null
          customer_contact: string
          customer_name?: string | null
          direction: string
          id?: string
          message: string
        }
        Update: {
          business_id?: string
          channel?: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string | null
          customer_contact?: string
          customer_name?: string | null
          direction?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          bookings: number | null
          business_id: string
          calls_answered: number | null
          conversions: number | null
          created_at: string | null
          date: string
          id: string
          revenue: number | null
          total_calls: number | null
        }
        Insert: {
          bookings?: number | null
          business_id: string
          calls_answered?: number | null
          conversions?: number | null
          created_at?: string | null
          date: string
          id?: string
          revenue?: number | null
          total_calls?: number | null
        }
        Update: {
          bookings?: number | null
          business_id?: string
          calls_answered?: number | null
          conversions?: number | null
          created_at?: string | null
          date?: string
          id?: string
          revenue?: number | null
          total_calls?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          business_id: string
          comment: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          rating: number | null
        }
        Insert: {
          appointment_id?: string | null
          business_id: string
          comment?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          rating?: number | null
        }
        Update: {
          appointment_id?: string | null
          business_id?: string
          comment?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_business_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_business_role: {
        Args: {
          _business_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "staff"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      call_outcome:
        | "booked"
        | "no_answer"
        | "follow_up"
        | "not_interested"
        | "wrong_number"
      conversation_channel: "sms" | "email" | "whatsapp"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "staff"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      call_outcome: [
        "booked",
        "no_answer",
        "follow_up",
        "not_interested",
        "wrong_number",
      ],
      conversation_channel: ["sms", "email", "whatsapp"],
    },
  },
} as const
