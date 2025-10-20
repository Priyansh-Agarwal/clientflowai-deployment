import { Router } from 'express';
import { CallController } from '../controllers/callController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, validateQuery } from '../middleware/validation';
import { uploadRecordingMulter, verifyTwilioSignature, extractAudioMetadata, validateCallRecording, sanitizeFileUpload } from '../middleware/fileUpload';
import { 
  CreateCallInput, 
  UpdateCallInput,
  GetCallsQuery,
  TwilioWebhookInput
} from '../validation/callSchemas';

const router = Router();

/**
 * @route   POST /calls
 * @desc    Create a new call record
 * @access  Private (authenticated users)
 * @body    { customer_id?, caller_phone?, caller_name?, twilio_call_sid?, twilio_account_sid?, phone_number, direction, status?, started_at, ended_at?, duration?, outcome?, quality?, transcript?, recording_url?, transcription_url?, call_data?, metadata? }
 */
router.post('/', 
  authenticateToken,
  validateRequest(CreateCallInput),
  CallController.createCall
);

/**
 * @route   GET /calls
 * @desc    Get paginated list of calls with filtering
 * @access  Private (authenticated users)
 * @query   customer_id?, direction?, status?, outcome?, twilio_call_sid?, start_date?, end_date?, min_duration?, max_duration?, search?, page?, limit?, sort_by?, sort_order?, has_recording?, has_transcript?, tags?
 */
router.get('/', 
  authenticateToken,
  validateQuery(GetCallsQuery),
  CallController.getCalls
);

/**
 * @route   GET /calls/stats
 * @desc    Get call statistics
 * @access  Private (authenticated users)
 */
router.get('/stats',
  authenticateToken,
  CallController.getCallStats
);

/**
 * @route   GET /calls/:id
 * @desc    Get a single call by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', 
  authenticateToken,
  CallController.getCallById
);

/**
 * @route   PUT /calls/:id
 * @desc    Update a call record (outcome, duration, transcript)
 * @access  Private (authenticated users)
 * @body    { customer_id?, caller_phone?, caller_name?, direction?, status?, started_at?, ended_at?, duration?, outcome?, quality?, transcript?, call_data?, metadata? }
 */
router.put('/:id', 
  authenticateToken,
  validateRequest(UpdateCallInput),
  CallController.updateCall
);

/**
 * @route   PUT /calls/:id/transcript
 * @desc    Update call transcript
 * @access  Private (authenticated users)
 * @body    { transcript: { segments: [{ speaker, start_time, end_time, text, confidence? }], duration?, language?, provider? }, transcription_url? }
 */
router.put('/:id/transcript',
  authenticateToken,
  CallController.updateCallTranscript
);

/**
 * @route   GET /calls/:id/recording
 * @desc    Get call recording URL
 * @access  Private (authenticated users)
 */
router.get('/:id/recording',
  authenticateToken,
  CallController.getCallRecording
);

/**
 * @route   POST /calls/:id/recording
 * @desc    Upload call recording file with verification
 * @access  Private (authenticated users)
 * @body    Multipart form data with recording file + call verification fields
 */
router.post('/:id/recording',
  authenticateToken,
  uploadRecordingMulter.single('recording'),
  sanitizeFileUpload,
  extractAudioMetadata,
  validateCallRecording,
  CallController.uploadCallRecording
);

/**
 * @route   DELETE /calls/:id
 * @desc    Delete a call record
 * @access  Private (authenticated users)
 */
router.delete('/:id', 
  authenticateToken,
  CallController.deleteCall
);

/**
 * @route   POST /calls/webhook/twilio
 * @desc    Twilio webhook handler for call status and recording updates
 * @access  Public (verified via Twilio signature)
 * @body    Twilio webhook payload with business_id
 */
router.post('/webhook/twilio',
  // Verify Twilio signature for webhook authenticity
  (req, res, next) => {
    // Skip signature verification in development
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Development mode: skipping Twilio signature verification');
      return next();
    }
    
    // Verify Twilio signature in production
    const signature = req.headers['x-twilio-signature'];
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!signature || !authToken) {
      return res.status(401).json({
        error: 'Twilio signature verification failed',
        message: 'Missing signature or authorization token'
      });
    }
    
    // Get the request URL and body for verification
    const protocol = req.secure ? 'https' : 'http';
    const url = `${protocol}://${req.get('host')}${req.originalUrl}`;
    
    // For multipart/form-data from Twilio, we need to verify differently
    const crypto = require('crypto');
    const body = req.body ? JSON.stringify(req.body) : '';
    
    const computedSignature = crypto
      .createHmac('sha1', authToken)
      .update(url + body)
      .digest('base64');
    
    if (signature !== computedSignature) {
      return res.status(403).json({
        error: 'Twilio signature verification failed',
        message: 'Invalid signature'
      });
    }
    
    next();
  },
  CallController.handleTwilioWebhook
);

/**
 * @route   POST /calls/webhook/twilio/recording
 * @desc    Twilio webhook handler specifically for recording completion
 * @access  Public (verified via Twilio signature)
 * @body    Twilio recording webhook payload with CallSid and business metadata
 */
router.post('/webhook/twilio/recording',
  // Apply same Twilio verification as above
  (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Development mode: skipping Twilio signature verification');
      return next();
    }
    
    const signature = req.headers['x-twilio-signature'];
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!signature || !authToken) {
      return res.status(401).json({
        error: 'Twilio signature verification failed',
        message: 'Missing signature or authorization token'
      });
    }
    
    const protocol = req.secure ? 'https' : 'http';
    const url = `${protocol}://${req.get('host')}${req.originalUrl}`;
    
    const crypto = require('crypto');
    const body = req.body ? JSON.stringify(req.body) : '';
    
    const computedSignature = crypto
      .createHmac('sha1', authToken)
      .update(url + body)
      .digest('base64');
    
    if (signature !== computedSignature) {
      return res.status(403).json({
        error: 'Twilio signature verification failed',
        message: 'Invalid signature'
      });
    }
    
    next();
  },

  CallController.handleTwilioRecordingWebhook
);

export default router;
