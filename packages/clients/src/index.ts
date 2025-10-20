import axios, { AxiosInstance } from 'axios';
import { ApiResponse, Business, Customer, Workflow } from '@clientflow/types';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, apiKey?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    });
  }

  // Business endpoints
  async getBusinesses(): Promise<ApiResponse<Business[]>> {
    const response = await this.client.get('/api/businesses');
    return response.data;
  }

  // Customer endpoints
  async getCustomers(businessId?: string): Promise<ApiResponse<Customer[]>> {
    const response = await this.client.get('/api/customers', {
      params: businessId ? { business_id: businessId } : {},
    });
    return response.data;
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Customer>> {
    const response = await this.client.post('/api/customers', customer);
    return response.data;
  }

  // Automation endpoints
  async getWorkflows(): Promise<ApiResponse<Workflow[]>> {
    const response = await this.client.get('/api/automation/workflows');
    return response.data;
  }

  async triggerWorkflow(workflowId: string, data: any): Promise<ApiResponse> {
    const response = await this.client.post(`/api/automation/trigger/${workflowId}`, data);
    return response.data;
  }

  // Voice endpoints
  async getVoiceConfig(): Promise<ApiResponse> {
    const response = await this.client.get('/api/voice/config');
    return response.data;
  }

  // WhatsApp endpoints
  async sendWhatsAppMessage(to: string, message: string, businessId: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/whatsapp/send-message', {
      to,
      message,
      business_id: businessId,
    });
    return response.data;
  }
}

export const createApiClient = (baseURL: string, apiKey?: string) => new ApiClient(baseURL, apiKey);

