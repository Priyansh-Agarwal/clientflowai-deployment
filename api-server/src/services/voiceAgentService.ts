import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

interface VoiceCall {
  callSid: string;
  from: string;
  to: string;
  callStatus: string;
  businessId: string;
  customerId?: string;
  recordingUrl?: string;
  transcriptionText?: string;
  duration?: number;
}

interface ConversationContext {
  customerName?: string;
  businessName: string;
  callPurpose: string;
  previousInteractions: any[];
  currentStep: string;
  collectedData: Record<string, any>;
}

export class VoiceAgentService {
  private supabase: any;
  private openaiApiKey: string;
  private twilioAccountSid: string;
  private twilioAuthToken: string;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openaiApiKey = process.env.OPENAI_API_KEY!;
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!;
  }

  /**
   * Handle incoming voice call
   */
  async handleIncomingCall(callData: VoiceCall): Promise<string> {
    try {
      // Get business information
      const business = await this.getBusinessInfo(callData.businessId);
      if (!business) {
        return this.generateErrorResponse('Business not found');
      }

      // Check if customer exists
      const customer = await this.findCustomerByPhone(callData.from, callData.businessId);
      
      // Create conversation context
      const context: ConversationContext = {
        businessName: business.business_name,
        callPurpose: 'incoming_inquiry',
        previousInteractions: customer ? await this.getCustomerHistory(customer.id) : [],
        currentStep: 'greeting',
        collectedData: {}
      };

      if (customer) {
        context.customerName = `${customer.first_name} ${customer.last_name}`;
      }

      // Generate TwiML response
      return this.generateTwiMLResponse(context);

    } catch (error) {
      console.error('Error handling incoming call:', error);
      return this.generateErrorResponse('System error occurred');
    }
  }

  /**
   * Process voice input and generate response
   */
  async processVoiceInput(
    callSid: string, 
    speechResult: string, 
    confidence: number
  ): Promise<string> {
    try {
      // Get call context from database
      const callContext = await this.getCallContext(callSid);
      if (!callContext) {
        return this.generateErrorResponse('Call context not found');
      }

      // Use OpenAI to process the speech and determine next action
      const aiResponse = await this.processWithAI(speechResult, callContext);
      
      // Update call context
      await this.updateCallContext(callSid, {
        lastInput: speechResult,
        lastResponse: aiResponse.response,
        currentStep: aiResponse.nextStep,
        collectedData: { ...callContext.collectedData, ...aiResponse.collectedData }
      });

      // Generate TwiML based on AI response
      return this.generateActionTwiML(aiResponse);

    } catch (error) {
      console.error('Error processing voice input:', error);
      return this.generateErrorResponse('Sorry, I didn\'t understand that. Could you please repeat?');
    }
  }

  /**
   * Process speech with OpenAI
   */
  private async processWithAI(speech: string, context: ConversationContext): Promise<any> {
    const systemPrompt = `You are an AI voice agent for ${context.businessName}. 
    
    Current conversation context:
    - Customer: ${context.customerName || 'Unknown'}
    - Current step: ${context.currentStep}
    - Collected data: ${JSON.stringify(context.collectedData)}
    
    Your role is to:
    1. Understand customer intent (appointment booking, support, general inquiry)
    2. Collect necessary information
    3. Provide helpful responses
    4. Guide them to the next appropriate action
    
    Available actions:
    - collect_info: Gather customer details
    - book_appointment: Schedule an appointment
    - transfer_to_human: Connect to staff
    - provide_info: Answer questions
    - end_call: Conclude the conversation
    
    Respond with JSON:
    {
      "intent": "appointment_booking|support|general_inquiry",
      "response": "Your spoken response to the customer",
      "nextStep": "greeting|collecting_info|booking|transferring|ending",
      "action": "collect_info|book_appointment|transfer_to_human|provide_info|end_call",
      "collectedData": {"key": "value"},
      "confidence": 0.95
    }`;

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Customer said: "${speech}"` }
        ],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        intent: 'general_inquiry',
        response: 'I understand you need help. Let me connect you with our team.',
        nextStep: 'transferring',
        action: 'transfer_to_human',
        collectedData: {},
        confidence: 0.5
      };
    }
  }

  /**
   * Generate TwiML response for incoming call
   */
  private generateTwiMLResponse(context: ConversationContext): string {
    const greeting = context.customerName 
      ? `Hello ${context.customerName}, thank you for calling ${context.businessName}. How can I help you today?`
      : `Hello, thank you for calling ${context.businessName}. I'm your AI assistant. How can I help you today?`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${greeting}</Say>
    <Gather input="speech" action="/api/voice/process-speech" method="POST" 
            speechTimeout="3" timeout="10" language="en-US">
        <Say voice="alice">Please tell me what you need help with.</Say>
    </Gather>
    <Say voice="alice">I didn't hear anything. Let me connect you with our team.</Say>
    <Dial>+1234567890</Dial>
</Response>`;
  }

  /**
   * Generate TwiML for specific actions
   */
  private generateActionTwiML(aiResponse: any): string {
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    switch (aiResponse.action) {
      case 'collect_info':
        twiml += `<Say voice="alice">${aiResponse.response}</Say>
                  <Gather input="speech" action="/api/voice/process-speech" method="POST" 
                          speechTimeout="3" timeout="10" language="en-US">
                      <Say voice="alice">Please provide that information.</Say>
                  </Gather>`;
        break;

      case 'book_appointment':
        twiml += `<Say voice="alice">${aiResponse.response}</Say>
                  <Gather input="speech" action="/api/voice/process-speech" method="POST" 
                          speechTimeout="3" timeout="10" language="en-US">
                      <Say voice="alice">What day and time would work for you?</Say>
                  </Gather>`;
        break;

      case 'transfer_to_human':
        twiml += `<Say voice="alice">${aiResponse.response}</Say>
                  <Dial>+1234567890</Dial>`;
        break;

      case 'provide_info':
        twiml += `<Say voice="alice">${aiResponse.response}</Say>
                  <Gather input="speech" action="/api/voice/process-speech" method="POST" 
                          speechTimeout="3" timeout="10" language="en-US">
                      <Say voice="alice">Is there anything else I can help you with?</Say>
                  </Gather>`;
        break;

      case 'end_call':
        twiml += `<Say voice="alice">${aiResponse.response}</Say>
                  <Hangup/>`;
        break;

      default:
        twiml += `<Say voice="alice">I'm sorry, I didn't understand. Let me connect you with our team.</Say>
                  <Dial>+1234567890</Dial>`;
    }

    twiml += '</Response>';
    return twiml;
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${message}</Say>
    <Hangup/>
</Response>`;
  }

  /**
   * Get business information
   */
  private async getBusinessInfo(businessId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Find customer by phone number
   */
  private async findCustomerByPhone(phone: string, businessId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .eq('business_id', businessId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get customer interaction history
   */
  private async getCustomerHistory(customerId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return [];
    return data || [];
  }

  /**
   * Get call context from database
   */
  private async getCallContext(callSid: string): Promise<ConversationContext | null> {
    const { data, error } = await this.supabase
      .from('call_contexts')
      .select('*')
      .eq('call_sid', callSid)
      .single();

    if (error) return null;
    return data.context;
  }

  /**
   * Update call context in database
   */
  private async updateCallContext(callSid: string, updates: Partial<ConversationContext>): Promise<void> {
    const { error } = await this.supabase
      .from('call_contexts')
      .upsert({
        call_sid: callSid,
        context: updates,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Record call completion
   */
  async recordCallCompletion(callData: VoiceCall): Promise<void> {
    try {
      // Update call record
      const { error: callError } = await this.supabase
        .from('calls')
        .upsert({
          id: callData.callSid,
          business_id: callData.businessId,
          customer_id: callData.customerId,
          phone_number: callData.from,
          status: callData.callStatus,
          duration: callData.duration,
          recording_url: callData.recordingUrl,
          transcription: callData.transcriptionText,
          created_at: new Date().toISOString()
        });

      if (callError) throw callError;

      // Create notification if call was successful
      if (callData.callStatus === 'completed') {
        await this.supabase
          .from('notifications')
          .insert({
            business_id: callData.businessId,
            type: 'call_completed',
            title: 'Call Completed',
            message: `Call with ${callData.from} completed successfully`,
            priority: 'normal'
          });
      }

    } catch (error) {
      console.error('Error recording call completion:', error);
    }
  }
}
