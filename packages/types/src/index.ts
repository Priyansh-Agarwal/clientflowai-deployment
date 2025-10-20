// Database types
export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          business_name: string;
          slug: string;
          phone: string;
          email: string;
          address: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          slug: string;
          phone?: string;
          email?: string;
          address?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          slug?: string;
          phone?: string;
          email?: string;
          address?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          first_name: string;
          last_name: string;
          phone: string;
          email: string;
          source: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          first_name: string;
          last_name?: string;
          phone?: string;
          email?: string;
          source?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          email?: string;
          source?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// Business types
export interface Business {
  id: string;
  business_name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Voice Agent types
export interface VoiceCall {
  callSid: string;
  from: string;
  to: string;
  callStatus: string;
  businessId: string;
  customerId?: string;
  recordingUrl?: string;
  transcriptionText?: string;
  duration?: number;
}

// WhatsApp types
export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'image' | 'document' | 'template';
  text?: {
    body: string;
  };
  image?: {
    link: string;
    caption?: string;
  };
  document?: {
    link: string;
    filename: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

// Automation types
export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  triggers: string[];
  last_run: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  data: any;
  result?: any;
  error?: string;
}

