import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Contact {
  id: string;
  orgId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deals?: Deal[];
  appointments?: Appointment[];
}

export interface Deal {
  id: string;
  orgId: string;
  contactId: string;
  title: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'won' | 'lost';
  valueCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
}

export interface Appointment {
  id: string;
  orgId: string;
  contactId: string;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'canceled';
  location?: string;
  createdAt: string;
  contact?: Contact;
}

export interface Message {
  id: string;
  orgId: string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email' | 'whatsapp';
  toAddr: string;
  fromAddr: string;
  body: string;
  meta?: Record<string, any>;
  createdAt: string;
}

export interface Activity {
  id: string;
  orgId: string;
  contactId?: string;
  dealId?: string;
  type: 'note' | 'call' | 'sms' | 'email' | 'task';
  content: string;
  meta?: Record<string, any>;
  createdAt: string;
}

// API client class
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Set authentication token
  setToken(token: string) {
    this.token = token;
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
  }

  // Get headers for requests
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make HTTP request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
          message: data.message,
        };
      }

      return {
        success: true,
        data: data.data || data,
        pagination: data.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health check
  async health(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // User endpoints
  async getMe(): Promise<ApiResponse<{
    user: any;
    currentOrg: any;
    memberships: any[];
  }>> {
    return this.request('/api/crm/me');
  }

  // Contact endpoints
  async getContacts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
  }): Promise<ApiResponse<Contact[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/crm/contacts${query ? `?${query}` : ''}`);
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.request(`/api/crm/contacts/${id}`);
  }

  async createContact(data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    tags?: string[];
  }): Promise<ApiResponse<Contact>> {
    return this.request('/api/crm/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<ApiResponse<Contact>> {
    return this.request(`/api/crm/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(id: string): Promise<ApiResponse> {
    return this.request(`/api/crm/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  // Deal endpoints
  async getDeals(params?: {
    page?: number;
    limit?: number;
    stage?: string;
    contactId?: string;
  }): Promise<ApiResponse<Deal[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/crm/deals${query ? `?${query}` : ''}`);
  }

  async createDeal(data: {
    contactId: string;
    title: string;
    stage?: 'lead' | 'qualified' | 'proposal' | 'won' | 'lost';
    valueCents: number;
    currency?: string;
  }): Promise<ApiResponse<Deal>> {
    return this.request('/api/crm/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<ApiResponse<Deal>> {
    return this.request(`/api/crm/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDeal(id: string): Promise<ApiResponse> {
    return this.request(`/api/crm/deals/${id}`, {
      method: 'DELETE',
    });
  }

  // Message endpoints
  async getMessages(params?: {
    page?: number;
    limit?: number;
    contactId?: string;
    channel?: string;
  }): Promise<ApiResponse<Message[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/crm/messages${query ? `?${query}` : ''}`);
  }

  async sendMessage(data: {
    contactId: string;
    channel: 'sms' | 'email';
    body: string;
    subject?: string;
  }): Promise<ApiResponse<Message>> {
    return this.request('/api/crm/messages/outbound', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Activity endpoints
  async getActivities(params?: {
    page?: number;
    limit?: number;
    contactId?: string;
    dealId?: string;
    type?: string;
  }): Promise<ApiResponse<Activity[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/crm/activities${query ? `?${query}` : ''}`);
  }

  async createActivity(data: {
    contactId?: string;
    dealId?: string;
    type: 'note' | 'call' | 'sms' | 'email' | 'task';
    content: string;
    meta?: Record<string, any>;
  }): Promise<ApiResponse<Activity>> {
    return this.request('/api/crm/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Appointment endpoints
  async getAppointments(params?: {
    page?: number;
    limit?: number;
    contactId?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<ApiResponse<Appointment[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/api/crm/appointments${query ? `?${query}` : ''}`);
  }

  async createAppointment(data: {
    contactId: string;
    startsAt: string;
    endsAt: string;
    status?: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'canceled';
    location?: string;
  }): Promise<ApiResponse<Appointment>> {
    return this.request('/api/crm/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<ApiResponse<Appointment>> {
    return this.request(`/api/crm/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAppointment(id: string): Promise<ApiResponse> {
    return this.request(`/api/crm/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  // Automation endpoints
  async getAutomationPresets(): Promise<ApiResponse<any[]>> {
    return this.request('/api/automations/presets');
  }

  async getAutomationPreset(type: string): Promise<ApiResponse<any>> {
    return this.request(`/api/automations/presets/${type}`);
  }

  async runAutomation(data: {
    type: 'booking' | 'reminder' | 'review' | 'nurture' | 'dunning' | 'sla';
    orgId: string;
    payload: Record<string, any>;
  }): Promise<ApiResponse<{ jobId: string }>> {
    return this.request('/api/automations/run', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async testAutomation(data: {
    type: string;
    config: Record<string, any>;
    testData?: Record<string, any>;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/automations/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Initialize token from Supabase session
export const initializeApiClient = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  }
};

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.access_token) {
    apiClient.setToken(session.access_token);
  } else {
    apiClient.clearToken();
  }
});

export default apiClient;