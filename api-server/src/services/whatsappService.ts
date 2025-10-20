import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

interface WhatsAppMessage {
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

interface WhatsAppWebhook {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppService {
  private supabase: any;
  private accessToken: string;
  private phoneNumberId: string;
  private verifyToken: string;
  private baseUrl: string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN!;
    this.baseUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}`;
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(message: WhatsAppMessage): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/messages`, message, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('WhatsApp send message error:', error);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(to: string, text: string, businessId: string): Promise<any> {
    try {
      const message: WhatsAppMessage = {
        to,
        type: 'text',
        text: { body: text }
      };

      const result = await this.sendMessage(message);

      // Store message in database
      await this.storeMessage({
        business_id: businessId,
        customer_phone: to,
        message_id: result.messages[0].id,
        direction: 'outbound',
        content: text,
        type: 'text',
        status: 'sent',
        platform: 'whatsapp'
      });

      return result;
    } catch (error) {
      console.error('Send text message error:', error);
      throw error;
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    language: string = 'en_US',
    components: any[] = [],
    businessId: string
  ): Promise<any> {
    try {
      const message: WhatsAppMessage = {
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components
        }
      };

      const result = await this.sendMessage(message);

      // Store message in database
      await this.storeMessage({
        business_id: businessId,
        customer_phone: to,
        message_id: result.messages[0].id,
        direction: 'outbound',
        content: `Template: ${templateName}`,
        type: 'template',
        status: 'sent',
        platform: 'whatsapp'
      });

      return result;
    } catch (error) {
      console.error('Send template message error:', error);
      throw error;
    }
  }

  /**
   * Send image message
   */
  async sendImageMessage(
    to: string, 
    imageUrl: string, 
    caption?: string,
    businessId?: string
  ): Promise<any> {
    try {
      const message: WhatsAppMessage = {
        to,
        type: 'image',
        image: {
          link: imageUrl,
          caption
        }
      };

      const result = await this.sendMessage(message);

      if (businessId) {
        await this.storeMessage({
          business_id: businessId,
          customer_phone: to,
          message_id: result.messages[0].id,
          direction: 'outbound',
          content: caption || 'Image message',
          type: 'image',
          status: 'sent',
          platform: 'whatsapp'
        });
      }

      return result;
    } catch (error) {
      console.error('Send image message error:', error);
      throw error;
    }
  }

  /**
   * Send document message
   */
  async sendDocumentMessage(
    to: string, 
    documentUrl: string, 
    filename: string,
    businessId?: string
  ): Promise<any> {
    try {
      const message: WhatsAppMessage = {
        to,
        type: 'document',
        document: {
          link: documentUrl,
          filename
        }
      };

      const result = await this.sendMessage(message);

      if (businessId) {
        await this.storeMessage({
          business_id: businessId,
          customer_phone: to,
          message_id: result.messages[0].id,
          direction: 'outbound',
          content: `Document: ${filename}`,
          type: 'document',
          status: 'sent',
          platform: 'whatsapp'
        });
      }

      return result;
    } catch (error) {
      console.error('Send document message error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(webhookData: WhatsAppWebhook): Promise<void> {
    try {
      for (const entry of webhookData.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const value = change.value;

            // Handle incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await this.handleIncomingMessage(message, value.metadata);
              }
            }

            // Handle message status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                await this.handleMessageStatus(status);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Handle webhook error:', error);
    }
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(message: any, metadata: any): Promise<void> {
    try {
      const customerPhone = message.from;
      const messageText = message.text?.body || '';
      const messageId = message.id;

      // Find or create customer
      const customer = await this.findOrCreateCustomer(customerPhone, metadata);

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(customer.id, customer.business_id);

      // Store message
      await this.storeMessage({
        business_id: customer.business_id,
        customer_id: customer.id,
        conversation_id: conversation.id,
        customer_phone: customerPhone,
        message_id: messageId,
        direction: 'inbound',
        content: messageText,
        type: message.type,
        status: 'received',
        platform: 'whatsapp'
      });

      // Trigger automation workflows
      await this.triggerAutomationWorkflows(customer, messageText, conversation);

    } catch (error) {
      console.error('Handle incoming message error:', error);
    }
  }

  /**
   * Handle message status update
   */
  private async handleMessageStatus(status: any): Promise<void> {
    try {
      // Update message status in database
      const { error } = await this.supabase
        .from('messages')
        .update({
          status: status.status,
          updated_at: new Date().toISOString()
        })
        .eq('message_id', status.id);

      if (error) throw error;

    } catch (error) {
      console.error('Handle message status error:', error);
    }
  }

  /**
   * Find or create customer
   */
  private async findOrCreateCustomer(phone: string, metadata: any): Promise<any> {
    // Try to find existing customer
    const { data: existingCustomer } = await this.supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new customer
    const { data: newCustomer, error } = await this.supabase
      .from('customers')
      .insert({
        phone,
        first_name: 'WhatsApp User',
        last_name: '',
        source: 'whatsapp',
        business_id: metadata.phone_number_id // You'll need to map this properly
      })
      .select()
      .single();

    if (error) throw error;
    return newCustomer;
  }

  /**
   * Find or create conversation
   */
  private async findOrCreateConversation(customerId: string, businessId: string): Promise<any> {
    // Try to find existing conversation
    const { data: existingConversation } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('channel', 'whatsapp')
      .eq('status', 'open')
      .single();

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const { data: newConversation, error } = await this.supabase
      .from('conversations')
      .insert({
        customer_id: customerId,
        business_id: businessId,
        thread_type: 'customer_support',
        channel: 'whatsapp',
        status: 'open',
        priority: 'normal'
      })
      .select()
      .single();

    if (error) throw error;
    return newConversation;
  }

  /**
   * Store message in database
   */
  private async storeMessage(messageData: any): Promise<void> {
    const { error } = await this.supabase
      .from('messages')
      .insert({
        ...messageData,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Trigger automation workflows
   */
  private async triggerAutomationWorkflows(customer: any, message: string, conversation: any): Promise<void> {
    try {
      // Trigger WhatsApp message processing workflow
      const workflowData = {
        customer_id: customer.id,
        business_id: customer.business_id,
        conversation_id: conversation.id,
        message_text: message,
        platform: 'whatsapp',
        timestamp: new Date().toISOString()
      };

      // Call n8n webhook
      await axios.post(`${process.env.N8N_BASE_URL}/webhook/whatsapp-message-processing`, workflowData);

    } catch (error) {
      console.error('Trigger automation workflows error:', error);
    }
  }

  /**
   * Verify webhook
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Get message templates
   */
  async getTemplates(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/message_templates`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Get templates error:', error);
      throw error;
    }
  }

  /**
   * Create message template
   */
  async createTemplate(templateData: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/message_templates`, templateData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Create template error:', error);
      throw error;
    }
  }
}
