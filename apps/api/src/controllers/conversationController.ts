import { Request, Response } from 'express';
import { ConversationService } from '../services/conversationService';
import { 
  CreateConversationInput, 
  CreateMessageInput, 
  UpdateConversationInput,
  GetConversationsQuery,
  GetMessagesQuery
} from '../validation/conversationSchemas';
import { z } from 'zod';

export class ConversationController {
  /**
   * POST /conversations - Create a new conversation
   */
  static async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const conversationData: CreateConversationInput = req.body;

      // Ensure required fields are provided
      if (!conversationData.thread_type || !conversationData.channel) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'thread_type and channel are required'
        });
        return;
      }

      const conversation = await ConversationService.createConversation(businessId, conversationData);

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation
      });
    } catch (error) {
      console.error('Create conversation error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create conversation'
      });
    }
  }

  /**
   * GET /conversations - Get conversations with filtering
   */
  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const query: GetConversationsQuery = (req as any).validatedQuery;

      // Ensure reasonable limits
      const limit = Math.min(query.limit, 100);
      const page = Math.max(query.page, 1);

      const filters = {
        customer_id: query.customer_id,
        channel: query.channel,
        status: query.status,
        priority: query.priority,
        assigned_to: query.assigned_to,
        thread_type: query.thread_type,
        start_date: query.start_date,
        end_date: query.end_date,
        search: query.search,
        tags: query.tags,
        page,
        limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      };

      const result = await ConversationService.getConversations(businessId, filters);

      res.status(200).json({
        success: true,
        data: {
          conversations: result.conversations,
          pagination: {
            current_page: result.page,
            total_pages: result.totalPages,
            total_count: result.total,
            per_page: limit,
            has_next: result.page < result.totalPages,
            has_prev: result.page > 1,
          }
        }
      });
    } catch (error) {
      console.error('Get conversations error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch conversations'
      });
    }
  }

  /**
   * GET /conversations/:id - Get a single conversation by ID
   */
  static async getConversationById(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid conversation ID',
          message: 'Conversation ID must be a valid UUID'
        });
        return;
      }

      const conversation = await ConversationService.getConversationById(id, businessId);

      res.status(200).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Get conversation by ID error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Conversation not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch conversation'
      });
    }
  }

  /**
   * PUT /conversations/:id - Update a conversation
   */
  static async updateConversation(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;
      const updateData: UpdateConversationInput = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid conversation ID',
          message: 'Conversation ID must be a valid UUID'
        });
        return;
      }

      const conversation = await ConversationService.updateConversation(id, businessId, updateData);

      res.status(200).json({
        success: true,
        message: 'Conversation updated successfully',
        data: conversation
      });
    } catch (error) {
      console.error('Update conversation error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Conversation not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update conversation'
      });
    }
  }

  /**
   * GET /conversations/:id/messages - Get messages for a conversation
   */
  static async getConversationMessages(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: conversationId } = req.params;
      const query: GetMessagesQuery = (req as any).validatedQuery;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        res.status(400).json({
          error: 'Invalid conversation ID',
          message: 'Conversation ID must be a valid UUID'
        });
        return;
      }

      // Ensure reasonable limits for messages
      const limit = Math.min(query.limit, 200); // Allow more messages per page
      const page = Math.max(query.page, 1);

      const filters = {
        sender_type: query.sender_type,
        message_type: query.message_type,
        direction: query.direction,
        status: query.status,
        start_date: query.start_date,
        end_date: query.end_date,
        search: query.search,
        page,
        limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      };

      const result = await ConversationService.getConversationMessages(conversationId, businessId, filters);

      // Mark messages as read if user is viewing them
      if (query.sender_type !== 'customer' && req.user?.id) {
        try {
          await ConversationService.markMessagesAsRead(conversationId, businessId, req.user.id);
        } catch (markError) {
          console.warn('Failed to mark messages as read:', markError);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          messages: result.messages,
          pagination: {
            current_page: result.page,
            total_pages: result.totalPages,
            total_count: result.total,
            per_page: limit,
            has_next: result.page < result.totalPages,
            has_prev: result.page > 1,
          }
        }
      });
    } catch (error) {
      console.error('Get conversation messages error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch conversation messages'
      });
    }
  }

  /**
   * POST /conversations/:id/messages - Create a new message in conversation
   */
  static async createConversationMessage(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: conversationId } = req.params;
      const messageData: CreateMessageInput = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        res.status(400).json({
          error: 'Invalid conversation ID',
          message: 'Conversation ID must be a valid UUID'
        });
        return;
      }

      // Ensure required fields
      if (!messageData.sender_type || !messageData.body || !messageData.direction) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'sender_type, body, and direction are required'
        });
        return;
      }

      // If sender is an agent, populate sender_id and sender_name
      if (messageData.sender_type === 'agent' && req.user) {
        messageData.sender_id = req.user.id;
        messageData.sender_name = req.user.email || 'Agent';
      }

      const message = await ConversationService.createConversationMessage(
        conversationId,
        businessId,
        messageData
      );

      res.status(201).json({
        success: true,
        message: 'Message created successfully',
        data: message
      });
    } catch (error) {
      console.error('Create conversation message error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Conversation not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Failed to create message')) {
          res.status(400).json({
            error: 'Failed to create message',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create message'
      });
    }
  }

  /**
   * PUT /conversations/:id/read - Mark conversation messages as read
   */
  static async markConversationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: conversationId } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        res.status(400).json({
          error: 'Invalid conversation ID',
          message: 'Conversation ID must be a valid UUID'
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User ID is required'
        });
        return;
      }

      await ConversationService.markMessagesAsRead(conversationId, businessId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Messages marked as read successfully'
      });
    } catch (error) {
      console.error('Mark conversation as read error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to mark messages as read'
      });
    }
  }

  /**
   * PUT /conversations/:id/assign - Assign conversation to agent
   */
  static async assignConversation(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: conversationId } = req.params;
      
      // Validate request body
      const assignSchema = z.object({
        agent_id: z.string().uuid('Invalid agent ID format')
      });
      
      const { agent_id } = assignSchema.parse(req.body);

      // Validate UUID format for conversation ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        res.status(400).json({
          error: 'Invalid conversation ID',
          message: 'Conversation ID must be a valid UUID'
        });
        return;
      }

      const conversation = await ConversationService.assignConversation(
        conversationId,
        businessId,
        agent_id
      );

      res.status(200).json({
        success: true,
        message: 'Conversation assigned successfully',
        data: conversation
      });
    } catch (error) {
      console.error('Assign conversation error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Conversation not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to assign conversation'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
        return;
      }
      
      console.error('Assign conversation error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Conversation not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to assign conversation'
      });
    }
  }

  /**
   * DELETE /conversations/:id - Close/delete a conversation
   */
  static async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id: conversationId } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        res.status(400).json({
          error: 'Invalid conversation ID',
          message: 'Conversation ID must be a valid UUID'
        });
        return;
      }

      await ConversationService.deleteConversation(conversationId, businessId);

      res.status(200).json({
        success: true,
        message: 'Conversation closed successfully'
      });
    } catch (error) {
      console.error('Delete conversation error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to close conversation'
      });
    }
  }

  /**
   * GET /conversations/stats - Get conversation statistics
   */
  static async getConversationStats(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;

      const stats = await ConversationService.getConversationStats(businessId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get conversation stats error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch conversation statistics'
      });
    }
  }
}
