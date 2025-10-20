// Complete conversation management examples for the ClientFlow API

const API_BASE_URL = 'http://localhost:3001/api';
const AUTH_TOKEN = 'your-jwt-token-here';

// Utility function for authenticated requests
async function makeConversationRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Request failed'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Request to ${endpoint} failed:`, error);
    throw error;
  }
}

// 1. Create a new conversation thread
export async function createConversation() {
  const conversationData = {
    customer_id: 'existing-customer-uuid', // Optional if customer exists
    thread_type: 'customer_support',
    channel: 'sms',
    status: 'open',
    priority: 'normal',
    tags: ['support', 'priority'],
    assigned_to: 'agent-uuid', // Optional
    participants: {
      customer: {
        name: 'John Doe',
        contact: '+15551234567',
        role: 'customer'
      },
      agents: [
        {
          id: 'agent-uuid',
          name: 'Sarah Agent',
          role: 'agent'
        }
      ]
    },
    metadata: {
      source_url: 'https://example.com/contact',
      campaign: 'spring-promotion',
      reference_id: 'ticket-456'
    }
  };

  const result = await makeConversationRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify(conversationData)
  });

  console.log('Conversation created:', result.data);
  return result.data;
}

// 2. Create conversation without existing customer
export async function createConversationNewCustomer() {
  const conversationData = {
    thread_type: 'sales_inquiry',
    channel: 'email',
    status: 'open',
    priority: 'high',
    participants: {
      customer: {
        name: 'Jane Smith',
        contact: 'jane@example.com',
        role: 'customer'
      }
    },
    metadata: {
      source_url: 'https://example.com/contact-form',
      campaign: 'sales-inquiry',
      reference_id: 'lead-789'
    }
  };

  const result = await makeConversationRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify(conversationData)
  });

  console.log('New customer conversation created:', result.data);
  return result.data;
}

// 3. Send messages in conversation
export async function sendConversationMessages(conversationId: string) {
  // Customer's initial inbound message
  const customerMessage = await makeConversationRequest(`/conversations/${conversationId}/messages`, {
    sanitizer: 'customer',
    sender_name: 'John Doe',
    sender_contact: '+15551234567',
    body: 'Hi, I need help with my account billing. I was charged twice for the same service.',
    direction: 'inbound',
    message_type: 'text',
    metadata: {
      delivery_report: {
        provider: 'twilio',
        provider_message_id: 'twilio-msg-123'
      }
    }
  };

  console.log('Customer message sent:', customerMessage.data);

  // Agent's response
  const agentMessage = await makeConversationRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      sender_type: 'agent',
      sender_name: 'Sarah Agent',
      body: 'Hi John! I apologize for the billing issue. I can see the duplicate charge on your account. Let me investigate this for you right away.',
      direction: 'outbound',
      message_type: 'text',
      metadata: {
        automation: {
          trigger: 'customer_message_received',
          action_taken: 'agent_response_sent'
        }
      }
    })
  });

  console.log('Agent message sent:', agentMessage.data);

  // Agent sends attachment (billing statement)
  const attachmentMessage = await makeConversationRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      sender_type: 'agent',
      sender_name: 'Sarah Agent',
      body: 'I\'ve found the issue in your billing statement. Here\'s a copy for your reference:',
      direction: 'outbound',
      message_type: 'text',
      attachments: [
        {
          type: 'document',
          url: 'https://example.com/downloads/billing-statement.pdf',
          filename: 'billing-statement-jan-2024.pdf',
          size: 245760,
          mime_type: 'application/pdf'
        }
      ]
    })
  });

  console.log('Message with attachment sent:', attachmentMessage.data);

  return {
    customerMessage: customerMessage.data,
    agentMessage: agentMessage.data,
    attachmentMessage: attachmentMessage.data
  };
}

// 4. Get conversation statistics
export async function getConversationStats() {
  const stats = await makeConversationRequest('/conversations/stats');
  
  console.log('Conversation Statistics:', {
    totalConversations: stats.data.totalConversations,
    openConversations: stats.data.openConversations,
    totalMessages: stats.data.totalMessages,
    channelBreakdown: stats.data.channelBreakdown
  });

  return stats.data;
}

// 5. Advanced conversation filtering and search
export async function advancedConversationSearch() {
  const today = new Date().toISOString().split('T')[0];
  
  // Get urgent conversations from today
  const urgentToday = await makeConversationRequest(`/conversations?priority=urgent&start_date=${today}T00:00:00Z&end_date=${today}T23:59:59Z&limit=20`);
  console.log('Urgent conversations today:', urgentToday.data);

  // Get SMS conversations with unread messages
  const smsUnread = await makeConversationRequest('/conversations?channel=sms&status=open&sort_by=last_message_at&sort_order=desc&limit:10');
  console.log('SMS conversations with unread messages:', smsUnread.data);

  // Search conversations by content
  const billingSearch = await makeConversationRequest('/conversations?search=billing&limit=15');
  console.log('Billing-related conversations:', billingSearch.data);

  // Get conversations by tags
  const taggedConversations = await makeConversationRequest('/conversations?tags=urgent,refund&sort_by=created_at&sort_order=desc');
  console.log('Tagged conversations:', taggedConversations.data);

  // Get conversations assigned to specific agent
  const agentConversations = await makeConversationRequest('/conversations?assigned_to=agent-uuid&status=active&limit=25');
  console.log('Agent assigned conversations:', agentConversations.data);

  return {
    urgentToday: urgentToday.data,
    smsUnread: smsUnread.data,
    billingSearch: billingSearch.data,
    taggedConversations: taggedConversations.data,
    agentConversations: agentConversations.data
  };
}

// 6. Conversation management workflow
export async function conversationManagementWorkflow(conversationId: string) {
  // Get conversation details
  const conversation = await makeConversationRequest(`/conversations/${conversationId}`);
  console.log('Conversation details:', conversation.data);

  // Assign conversation to agent
  const assignResponse = await makeConversationRequest(`/conversations/${conversationId}/assign`, {
    method: 'PUT',
    body: JSON.stringify({
      agent_id: 'agent-uuid'
    })
  });
  console.log('Conversation assigned:', assignResponse.data);

  // Update conversation priority
  const updateResponse = await makeConversationRequest(`/conversations/${conversationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'active',
      priority: 'high',
      tags: ['escalated', 'billing']
    })
  });
  console.log('Conversation updated:', updateResponse.data);

  // Mark conversation as read
  const readResponse = await makeConversationRequest(`/conversations/${conversationId}/read`, {
    method: 'PUT'
  });
  console.log('Messages marked as read:', readResponse.data);

  return {
    conversation: conversation.data,
    assignResponse: assignResponse.data,
    updateResponse: updateResponse.data,
    readResponse: readResponse.data
  };
}

// 7. Message filtering and pagination
export async function messageManagement(conversationId: string) {
  // Get recent inbound messages
  const inboundMessages = await makeConversationRequest(`/conversations/${conversationId}/messages?sender_type=customer&direction=inbound&limit=20&sort_by=created_at&sort_order=desc`);
  console.log('Recent inbound messages:', inboundMessages.data);

  // Get unread messages
  const unreadMessages = await makeConversationRequest(`/conversations/${conversationId}/messages?read_at=null&limit=50`);
  console.log('Unread messages:', unreadMessages.data);

  // Search messages by content
  const searchMessages = await makeConversationRequest(`/conversations/${conversationId}/messages?search=billing&limit=10`);
  console.log('Messages containing "billing":', searchMessages.data);

  // Get messages with attachments
  const attachmentMessages = await makeConversationRequest(`/conversations/${conversationId}/messages?message_type=image,document&limit=10`);
  console.log('Messages with attachments:', attachmentMessages.data);

  return {
    inboundMessages: inboundMessages.data,
    unreadMessages: unreadMessages.data,
    searchMessages: searchMessages.data
  };
}

// 8. Multi-channel conversation examples
export async function multiChannelConversations() {
  // SMS conversation
  const smsConversation = await makeConversationRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify({
      thread_type: 'customer_support',
      channel: 'sms',
      priority: 'normal',
      participants: {
        customer: {
          name: 'Mike Johnson',
          contact: '+15559876543',
          role: 'customer'
        }
      }
    })
  });

  // Email conversation
  const emailConversation = await makeConversationRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify({
      thread_type: 'technical_support',
      channel: 'email',
      priority: 'high',
      participants: {
        customer: {
          name: 'Alex Chen',
          contact: 'alex@example.com',
          role: 'customer'
        }
      }
    })
  });

  // WhatsApp conversation
  const whatsappConversation = await makeConversationRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify({
      thread_type: 'appointment_booking',
      channel: 'whatsapp',
      priority: 'normal',
      participants: {
        customer: {
          name: 'Sarah Williams',
          contact: '+15551234567',
          role: 'customer'
        }
      }
    })
  });

  console.log('Multi-channel conversations created:', {
    sms: smsConversation.data,
    email: emailConversation.data,
    whatsapp: whatsappConversation.data
  });

  return {
    sms: smsConversation.data,
    email: emailConversation.data,
    whatsapp: whatsappConversation.data
  };
}

// 9. Error handling and edge cases
export async function errorHandlingExamples() {
  try {
    // Try to create conversation with invalid channel
    await makeConversationRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        thread_type: 'customer_support',
        channel: 'invalid_channel', // Invalid channel
        priority: 'normal'
      })
    });
  } catch (error) {
    console.log('Invalid channel error (expected):', error.message);
  }

  try {
    // Try to create message without required fields
    await makeConversationRequest('/conversations/valid-conversation-id/messages', {
      method: 'POST',
      body: JSON.stringify({
        // Missing sender_type, body, direction
        sender_name: 'John Doe'
      })
    });
  } catch (error) {
    console.log('Missing required fields error (expected):', error.message);
  }

  try {
    // Try to access non-existent conversation
    await makeConversationRequest('/conversations/00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.log('Non-existent conversation error (expected):', error.message);
  }

  try {
    // Try invalid UUID format
    await makeConversationRequest('/conversations/invalid-uuid-format');
  } catch (error) {
    console.log('Invalid UUID format error (expected):', error.message);
  }
}

// 10. Performance testing and bulk operations
export async function bulkConversationOperations() {
  const conversations = [];
  
  // Create multiple conversations
  for (let i = 1; i <= 5; i++) {
    try {
      const conversation = await makeConversationRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          thread_type: 'general_question',
          channel: 'sms',
          priority: 'normal',
          participants: {
            customer: {
              name: `Customer ${i}`,
              contact: `+1555123456${i}`,
              role: 'customer'
            }
          },
          metadata: {
            batch: 'performance_test',
            iteration: i
          }
        })
      });
      
      conversations.push(conversation.data);
    } catch (error) {
      console.error(`Failed to create conversation ${i}:`, error);
    }
  }

  console.log(`${conversations.length} conversations created in batch`);

  // Send messages to each conversation
  for (const conversation of conversations) {
    try {
      await makeConversationRequest(`/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          sender_type: 'customer',
          sender_name: conversation.participants.customer.name,
          body: `Test message ${Date.now()}`,
          direction: 'inbound',
          message_type: 'text'
        })
      });
    } catch (error) {
      console.error(`Failed to send message to conversation ${conversation.id}:`, error);
    }
  }

  console.log('Bulk operations completed');

  return conversations;
}

// Export all examples for easy testing
export default {
  createConversation,
  createConversationNewCustomer,
  sendConversationMessages,
  getConversationStats,
  advancedConversationSearch,
  conversationManagementWorkflow,
  messageManagement,
  multiChannelConversations,
  errorHandlingExamples,
  bulkConversationOperations
};

// Usage instructions for Node.js environment
if (typeof window === 'undefined') {
  console.log('💬 Conversation Management API Examples Loaded');
  console.log('Available functions:');
  console.log('- createConversation()');
  console.log('- createConversationNewCustomer()');
  console.log('- sendConversationMessages(conversationId)');
  console.log('- getConversationStats()');
  console.log('- advancedConversationSearch()');
  console.log('- conversationManagementWorkflow(conversationId)');
  console.log('- messageManagement(conversationId)');
  console.log('- multiChannelConversations()');
  console.log('- errorHandlingExamples()');
  console.log('- bulkConversationOperations()');
  console.log('\nTo run examples:');
  console.log('1. Set AUTH_TOKEN variable with valid JWT');
  console.log('2. Call the desired function, e.g., await createConversation()');
}
