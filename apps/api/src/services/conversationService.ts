import { supabase } from '../config/supabase';
import { Conversation, ConversationInsert, ConversationUpdate, ConversationMessage, ConversationMessageInsert } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';
import { generateConversationPreview, sanitizeMessageBody, calculateConversationPriority } from '../validation/conversationSchemas';

export class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(businessId: string, conversationData: ConversationInsert): Promise<Conversation> {
    try {
      // Add business_id and prepare data for insertion
      const insertData: ConversationInsert = {
        ...conversationData,
        business_id: businessId,
        unread_count: 0,
        status: conversationData.status || 'open',
        priority: conversationData.priority || 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

  return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        // Handle specific Supabase errors
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Conversation with this external ID already exists');
        }
        if (error.code === '23503') { // Foreign key constraint violation
          throw new Error('Referenced customer not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get conversations with filtering and pagination
   */
  static async getConversations(
    businessId: string,
    filters: {
      customer_id?: string;
      channel?: string;
      status?: string;
      priority?: string;
      assigned_to?: string;
      thread_type?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
      tags?: string;
      page: number;
      limit: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): Promise<{ conversations: Conversation[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        customer_id,
        channel,
        status,
        priority,
        assigned_to,
        thread_type,
        start_date,
        end_date,
        search,
        tags,
        page,
        limit,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = filters;
      
      // Start building the query
      let query = supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Apply filters
      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }
      
      if (channel) {
        query = query.eq('channel', channel);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (priority) {
        query = query.eq('priority', priority);
      }
      
      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to);
      }
      
      if (thread_type) {
        query = query.eq('thread_type', thread_type);
      }

      // Date filtering
      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      if (end_date) {
        query = query.lte('last_message_at', end_date).or(`last_message_at.is.null,created_at.lte.${end_date}`);
      }

      // Search functionality
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`last_message_preview.ilike.${searchTerm}`);
      }

      // Tag filtering
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim());
        tagList.forEach(tag => {
          query = query.contains('tags', [tag]);
        });
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch conversations: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        conversations: data || [],
        total: count || 0,
        page,
        totalPages,
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get a single conversation by ID
   */
  static async getConversationById(conversationId: string, businessId: string): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Conversation not found');
        }
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update a conversation
   */
  static async updateConversation(
    conversationId: string,
    businessId: string,
    updateData: ConversationUpdate
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Conversation not found');
        }
        throw new Error(`Failed to update conversation: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(
    conversationId: string,
    businessId: string,
    filters: {
      sender_type?: string;
      message_type?: string;
      direction?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      search?: string;
      page: number;
      limit: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): Promise<{ messages: ConversationMessage[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        sender_type,
        message_type,
        direction,
        status,
        start_date,
        end_date,
        search,
        page,
        limit,
        sort_by = 'created_at',
        sort_order = 'asc',
      } = filters;

      // Start building the query
      let query = supabase
        .from('conversation_messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .eq('business_id', businessId);

      // Apply filters
      if (sender_type) {
        query = query.eq('sender_type', sender_type);
      }
      
      if (message_type) {
        query = query.eq('message_type', message_type);
      }
      
      if (direction) {
        query = query.eq('direction', direction);
      }
      
      if (status) {
        query = query.eq('status', status);
      }

      // Date filtering
      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      if (end_date) {
        query = query.lte('created_at', end_date);
      }

      // Search in message body
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.ilike('body', searchTerm);
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch conversation messages: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        messages: data || [],
        total: count || 0,
        page,
        totalPages,
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a new message in a conversation
   */
  static async createConversationMessage(
    conversationId: string,
    businessId: string,
    messageData: ConversationMessageInsert
  ): Promise<ConversationMessage> {
    try {
      // Sanitize message body
      const sanitizedBody = sanitizeMessageBody(messageData.body);
      
      // Generate message preview
      const preview = generateConversationPreview(sanitizedBody);

      // Add conversation_id and business_id
      const insertData: ConversationMessageInsert = {
        ...messageData,
        body: sanitizedBody,
        conversation_id: conversationId,
        business_id: businessId,
        status: messageData.status || 'sent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Start transaction-like operations
      const { data: message, error: messageError } = await supabase
        .from('conversation_messages')
        .insert(insertData)
        .select()
        .single();

      if (messageError) {
        throw new Error(`Failed to create message: ${messageError.message}`);
      }

      // Update conversation's last message info
      const updateConversationData: ConversationUpdate = {
        last_message_at: message.created_at,
        last_message_preview: preview,
        updated_at: new Date().toISOString(),
      };

      // Calculate new unread count
      if (message.direction === 'inbound') {
        // We need to increment unread_count, not set to 1
        // For now, we'll fetch current count and increment
        const { data: currentConv } = await supabase
          .from('conversations')
          .select('unread_count')
          .eq('id', conversationId)
          .eq('business_id', businessId)
          .single();
        
        updateConversationData.unread_count = (currentConv?.unread_count || 0) + 1;
      }

      // Update conversation priority based on activity
      if (message.direction === 'inbound') {
        const newPriority = calculateConversationPriority(message.created_at, 1);
        updateConversationData.priority = newPriority;
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update(updateConversationData)
        .eq('id', conversationId)
        .eq('business_id', businessId);

      if (updateError) {
        console.warn('Failed to update conversation with new message info:', updateError.message);
        // Don't fail the message creation if conversation update fails
      }

      return message;
    } catch (error) {
      if (error instanceof PostgrestError) {
        if (error.code === '23503') { // Foreign key constraint violation
          throw new Error('Conversation not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Mark conversation messages as read
   */
  static async markMessagesAsRead(conversationId: string, businessId: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Mark messages as read
      const { error: messagesError } = await supabase
        .from('conversation_messages')
        .update({ read_at: now })
        .eq('conversation_id', conversationId)
        .eq('business_id', businessId)
        .is('read_at', null); // Only update unread messages

      if (messagesError) {
        throw new Error(`Failed to mark messages as read: ${messagesError.message}`);
      }

      // Update conversation unread count to 0
      const { error: conversationError } = await supabase
        .from('conversations')
        .update({ 
          unread_count: 0, 
          updated_at: now 
        })
        .eq('id', conversationId)
        .eq('business_id', businessId);

      if (conversationError) {
        throw new Error(`Failed to update conversation unread count: ${conversationError.message}`);
      }
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(businessId: string): Promise<{
    totalConversations: number;
    openConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    channelBreakdown: Record<string, number>;
  }> {
    try {
      // Get conversation counts
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('status, channel')
        .eq('business_id', businessId);

      if (convError) throw new Error(`Failed to fetch conversation stats: ${convError.message}`);

      // Get message count
      const { count: messageCount, error: msgError } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if (msgError) throw new Error(`Failed to fetch message count: ${msgError.message}`);

      // Calculate statistics
      const totalConversations = conversations.length;
      const openConversations = conversations.filter(c => c.status === 'open').length;
      
      const channelBreakdown = conversations.reduce((acc: Record<string, number>, conv) => {
        acc[conv.channel] = (acc[conv.channel] || 0) + 1;
        return acc;
      }, {});

      return {
        totalConversations,
        openConversations,
        totalMessages: messageCount || 0,
        averageResponseTime: 0, // Would need more complex calculation
        channelBreakdown
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete conversation (soft delete by marking as closed)
   */
  static async deleteConversation(conversationId: string, businessId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to close conversation: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Assign conversation to agent
   */
  static async assignConversation(
    conversationId: string,
    businessId: string,
    agentId: string
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          assigned_to: agentId,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Conversation not found');
        }
        throw new Error(`Failed to assign conversation: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}
