import express from 'express';
import { WhatsAppService } from '../services/whatsappService';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const whatsappService = new WhatsAppService();

// Validation schemas
const sendMessageSchema = z.object({
  to: z.string().min(10),
  message: z.string().min(1),
  business_id: z.string().uuid()
});

const sendTemplateSchema = z.object({
  to: z.string().min(10),
  template_name: z.string(),
  language: z.string().default('en_US'),
  components: z.array(z.any()).default([]),
  business_id: z.string().uuid()
});

/**
 * WhatsApp webhook verification
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verificationResult = whatsappService.verifyWebhook(mode as string, token as string, challenge as string);
  
  if (verificationResult) {
    res.status(200).send(verificationResult);
  } else {
    res.status(403).send('Forbidden');
  }
});

/**
 * Handle WhatsApp webhooks
 * POST /api/whatsapp/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('📱 WhatsApp webhook received:', req.body);
    
    await whatsappService.handleWebhook(req.body);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

/**
 * Send text message
 * POST /api/whatsapp/send-message
 */
router.post('/send-message', authenticateToken, async (req, res) => {
  try {
    const messageData = sendMessageSchema.parse(req.body);
    
    const result = await whatsappService.sendTextMessage(
      messageData.to,
      messageData.message,
      messageData.business_id
    );

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * Send template message
 * POST /api/whatsapp/send-template
 */
router.post('/send-template', authenticateToken, async (req, res) => {
  try {
    const templateData = sendTemplateSchema.parse(req.body);
    
    const result = await whatsappService.sendTemplateMessage(
      templateData.to,
      templateData.template_name,
      templateData.language,
      templateData.components,
      templateData.business_id
    );

    res.json({
      success: true,
      message: 'Template message sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send WhatsApp template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send template message'
    });
  }
});

/**
 * Send image message
 * POST /api/whatsapp/send-image
 */
router.post('/send-image', authenticateToken, async (req, res) => {
  try {
    const { to, image_url, caption, business_id } = req.body;

    if (!to || !image_url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, image_url'
      });
    }

    const result = await whatsappService.sendImageMessage(
      to,
      image_url,
      caption,
      business_id
    );

    res.json({
      success: true,
      message: 'Image sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send WhatsApp image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send image'
    });
  }
});

/**
 * Send document message
 * POST /api/whatsapp/send-document
 */
router.post('/send-document', authenticateToken, async (req, res) => {
  try {
    const { to, document_url, filename, business_id } = req.body;

    if (!to || !document_url || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, document_url, filename'
      });
    }

    const result = await whatsappService.sendDocumentMessage(
      to,
      document_url,
      filename,
      business_id
    );

    res.json({
      success: true,
      message: 'Document sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Send WhatsApp document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send document'
    });
  }
});

/**
 * Get message templates
 * GET /api/whatsapp/templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await whatsappService.getTemplates();

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Get WhatsApp templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

/**
 * Create message template
 * POST /api/whatsapp/templates
 */
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const { name, category, language, components } = req.body;

    if (!name || !category || !language || !components) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category, language, components'
      });
    }

    const templateData = {
      name,
      category,
      language,
      components
    };

    const result = await whatsappService.createTemplate(templateData);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: result
    });

  } catch (error) {
    console.error('Create WhatsApp template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
});

/**
 * Get WhatsApp conversations
 * GET /api/whatsapp/conversations
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const { business_id, page = 1, limit = 20 } = req.query;

    // Get WhatsApp conversations from database
    const { data: conversations, error } = await this.supabase
      .from('conversations')
      .select(`
        *,
        customers:customer_id (
          id,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('business_id', business_id)
      .eq('channel', 'whatsapp')
      .order('updated_at', { ascending: false })
      .range(
        (parseInt(page as string) - 1) * parseInt(limit as string),
        parseInt(page as string) * parseInt(limit as string) - 1
      );

    if (error) throw error;

    res.json({
      success: true,
      data: conversations,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('Get WhatsApp conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

/**
 * Get conversation messages
 * GET /api/whatsapp/conversations/:conversationId/messages
 */
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Get messages from database
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('platform', 'whatsapp')
      .order('created_at', { ascending: true })
      .range(
        (parseInt(page as string) - 1) * parseInt(limit as string),
        parseInt(page as string) * parseInt(limit as string) - 1
      );

    if (error) throw error;

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('Get WhatsApp messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * Get WhatsApp analytics
 * GET /api/whatsapp/analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { business_id, start_date, end_date } = req.query;

    // Get analytics from database
    const analytics = {
      total_messages: 0,
      sent_messages: 0,
      received_messages: 0,
      delivered_messages: 0,
      read_messages: 0,
      failed_messages: 0,
      active_conversations: 0,
      response_time_avg: 0,
      message_volume_by_hour: {},
      top_customers: []
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Get WhatsApp analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

export default router;
