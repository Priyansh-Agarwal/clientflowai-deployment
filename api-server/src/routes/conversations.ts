import { Router } from 'express';
import { ConversationController } from '../controllers/conversationController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, validateQuery } from '../middleware/validation';
import { 
  createConversationSchema, 
  createMessageSchema,
  updateConversationSchema,
  getConversationsSchema,
  getMessagesSchema
} from '../validation/conversationSchemas';

const router = Router();

// All conversation routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /conversations
 * @desc    Create a new conversation thread
 * @access  Private (authenticated users)
 * @body    { customer_id?, thread_type, channel, status?, priority?, tags?, assigned_to?, metadata? }
 */
router.post('/', 
  validateRequest(createConversationSchema),
  ConversationController.createConversation
);

/**
 * @route   GET /conversations
 * @desc    Get paginated list of conversations with filtering
 * @access  Private (authenticated users)
 * @query   customer_id?, channel?, status?, priority?, assigned_to?, thread_type?, start_date?, end_date?, search?, tags?, page?, limit?, sort_by?, sort_order?
 */
router.get('/', 
  validateQuery(getConversationsSchema),
  ConversationController.getConversations
);

/**
 * @route   GET /conversations/stats
 * @desc    Get conversation statistics
 * @access  Private (authenticated users)
 */
router.get('/stats',
  ConversationController.getConversationStats
);

/**
 * @route   GET /conversations/:id
 * @desc    Get a single conversation by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', 
  ConversationController.getConversationById
);

/**
 * @route   PUT /conversations/:id
 * @desc    Update a conversation
 * @access  Private (authenticated users)
 * @body    { customer_id?, thread_type?, channel?, status?, priority?, tags?, assigned_to?, participants?, metadata? }
 */
router.put('/:id', 
  validateRequest(updateConversationSchema),
  ConversationController.updateConversation
);

/**
 * @route   PUT /conversations/:id/read
 * @desc    Mark conversation messages as read
 * @access  Private (authenticated users)
 */
router.put('/:id/read',
  ConversationController.markConversationAsRead
);

/**
 * @route   PUT /conversations/:id/assign
 * @desc    Assign conversation to agent
 * @access  Private (authenticated users)
 * @body    { agent_id }
 */
router.put('/:id/assign',
  ConversationController.assignConversation
);

/**
 * @route   DELETE /conversations/:id
 * @desc    Close/delete a conversation
 * @access  Private (authenticated users)
 */
router.delete('/:id', 
  ConversationController.deleteConversation
);

/**
 * @route   GET /conversations/:id/messages
 * @desc    Get all messages for a conversation ordered by created_at
 * @access  Private (authenticated users)
 * @query   sender_type?, message_type?, direction?, status?, start_date?, end_date?, search?, page?, limit?, sort_by?, sort_order?
 */
router.get('/:id/messages',
  validateQuery(getMessagesSchema),
  ConversationController.getConversationMessages
);

/**
 * @route   POST /conversations/:id/messages
 * @desc    Append a message to the conversation thread
 * @access  Private (authenticated users)
 * @body    { sender_type, sender_id?, sender_name?", sender_contact?, body, message_type?, direction, status?, attachments?, metadata? }
 */
router.post('/:id/messages',
  validateRequest(createMessageSchema),
  ConversationController.createConversationMessage
);

export default router;
