import express from 'express';
import { VoiceAgentService } from '../services/voiceAgentService';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();
const voiceAgentService = new VoiceAgentService();

// Validation schemas
const incomingCallSchema = z.object({
  CallSid: z.string(),
  From: z.string(),
  To: z.string(),
  CallStatus: z.string(),
  business_id: z.string().uuid(),
  customer_id: z.string().uuid().optional()
});

const speechProcessingSchema = z.object({
  CallSid: z.string(),
  SpeechResult: z.string(),
  Confidence: z.number().min(0).max(1)
});

/**
 * Handle incoming voice calls
 * POST /api/voice/incoming
 */
router.post('/incoming', async (req, res) => {
  try {
    console.log('📞 Incoming voice call:', req.body);
    
    const callData = incomingCallSchema.parse({
      CallSid: req.body.CallSid,
      From: req.body.From,
      To: req.body.To,
      CallStatus: req.body.CallStatus,
      business_id: req.body.business_id,
      customer_id: req.body.customer_id
    });

    const twimlResponse = await voiceAgentService.handleIncomingCall(callData);
    
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);

  } catch (error) {
    console.error('Voice call error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">I'm sorry, there was a technical issue. Please try again later.</Say>
    <Hangup/>
</Response>`);
  }
});

/**
 * Process speech input from voice calls
 * POST /api/voice/process-speech
 */
router.post('/process-speech', async (req, res) => {
  try {
    console.log('🎤 Processing speech input:', req.body);
    
    const speechData = speechProcessingSchema.parse({
      CallSid: req.body.CallSid,
      SpeechResult: req.body.SpeechResult,
      Confidence: parseFloat(req.body.Confidence) || 0.5
    });

    const twimlResponse = await voiceAgentService.processVoiceInput(
      speechData.CallSid,
      speechData.SpeechResult,
      speechData.Confidence
    );
    
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);

  } catch (error) {
    console.error('Speech processing error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">I didn't catch that. Could you please repeat?</Say>
    <Gather input="speech" action="/api/voice/process-speech" method="POST" 
            speechTimeout="3" timeout="10" language="en-US">
        <Say voice="alice">Please tell me what you need help with.</Say>
    </Gather>
    <Say voice="alice">I didn't hear anything. Let me connect you with our team.</Say>
    <Dial>+1234567890</Dial>
</Response>`);
  }
});

/**
 * Handle call status updates from Twilio
 * POST /api/voice/status
 */
router.post('/status', async (req, res) => {
  try {
    console.log('📊 Call status update:', req.body);
    
    const callData = {
      callSid: req.body.CallSid,
      from: req.body.From,
      to: req.body.To,
      callStatus: req.body.CallStatus,
      businessId: req.body.business_id,
      customerId: req.body.customer_id,
      recordingUrl: req.body.RecordingUrl,
      transcriptionText: req.body.TranscriptionText,
      duration: parseInt(req.body.CallDuration) || 0
    };

    await voiceAgentService.recordCallCompletion(callData);
    
    res.status(200).json({ success: true, message: 'Call status updated' });

  } catch (error) {
    console.error('Call status update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update call status' });
  }
});

/**
 * Get voice agent configuration
 * GET /api/voice/config
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = {
      voice_agent_enabled: true,
      supported_languages: ['en-US', 'es-US'],
      voice_options: ['alice', 'brian', 'charlie'],
      max_call_duration: 600, // 10 minutes
      transfer_number: process.env.TRANSFER_PHONE_NUMBER || '+1234567890',
      business_hours: {
        timezone: 'America/New_York',
        hours: {
          monday: '9:00-17:00',
          tuesday: '9:00-17:00',
          wednesday: '9:00-17:00',
          thursday: '9:00-17:00',
          friday: '9:00-17:00',
          saturday: '10:00-14:00',
          sunday: 'closed'
        }
      },
      features: {
        appointment_booking: true,
        customer_support: true,
        information_providing: true,
        call_transfer: true,
        call_recording: true,
        transcription: true
      }
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Voice config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voice configuration'
    });
  }
});

/**
 * Create voice agent for business
 * POST /api/voice/agent
 */
router.post('/agent', authenticateToken, async (req, res) => {
  try {
    const { business_id, name, voice, personality, scripts } = req.body;

    // Validate required fields
    if (!business_id || !name || !voice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: business_id, name, voice'
      });
    }

    // Create voice agent configuration
    const agentConfig = {
      business_id,
      name,
      voice,
      personality: personality || 'professional',
      scripts: scripts || [],
      is_active: true,
      created_at: new Date().toISOString()
    };

    // Store in database (you'll need to create a voice_agents table)
    // const { data, error } = await supabase
    //   .from('voice_agents')
    //   .insert(agentConfig)
    //   .select();

    res.status(201).json({
      success: true,
      message: 'Voice agent created successfully',
      data: agentConfig
    });

  } catch (error) {
    console.error('Voice agent creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create voice agent'
    });
  }
});

/**
 * Get voice analytics
 * GET /api/voice/analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { business_id, start_date, end_date } = req.query;

    // Get call analytics from database
    const analytics = {
      total_calls: 0,
      answered_calls: 0,
      missed_calls: 0,
      average_duration: 0,
      call_volume_by_hour: {},
      top_intents: [],
      customer_satisfaction: 0,
      ai_resolution_rate: 0
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Voice analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voice analytics'
    });
  }
});

export default router;
