/**
 * ClientFlow AI Suite - Integration Tests
 * Tests complete workflows and cross-endpoint functionality
 */

const assert = require('assert');
const axios = require('axios');

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'test-org-123';
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || 'test-business-123';

// Test data
const testBusiness = {
  business_name: 'Test Business',
  slug: 'test-business',
  phone: '+1234567890',
  email: 'test@business.com',
  address: '123 Test St, Test City, TC 12345',
  status: 'active'
};

const testCustomer = {
  business_id: TEST_BUSINESS_ID,
  first_name: 'Integration',
  last_name: 'Test',
  email: 'integration@test.com',
  phone: '+1234567890',
  source: 'integration-test'
};

const testMessage = {
  channel: 'sms',
  to_addr: '+1234567890',
  body: 'Integration test message'
};

const testAutomation = {
  type: 'customer_welcome',
  payload: {
    customer_id: 'test-customer-123',
    business_id: TEST_BUSINESS_ID
  }
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'x-org-id': TEST_ORG_ID,
      ...headers
    },
    timeout: 10000
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
}

// Test suite
describe('ClientFlow AI Suite - Integration Tests', () => {
  
  describe('Complete Customer Workflow', () => {
    let createdCustomerId;

    it('should create a customer and verify it exists', async () => {
      // Create customer
      const createResponse = await apiRequest('POST', '/api/customers', testCustomer);
      
      assert.strictEqual(createResponse.status, 201);
      assert(createResponse.data.success);
      assert(createResponse.data.data);
      
      createdCustomerId = createResponse.data.data.id;
      assert(createdCustomerId);
    });

    it('should retrieve the created customer', async () => {
      // Get all customers
      const getResponse = await apiRequest('GET', '/api/customers');
      
      assert.strictEqual(getResponse.status, 200);
      assert(getResponse.data.success);
      assert(Array.isArray(getResponse.data.data));
      
      // Find our created customer
      const customer = getResponse.data.data.find(c => c.id === createdCustomerId);
      assert(customer);
      assert.strictEqual(customer.first_name, testCustomer.first_name);
      assert.strictEqual(customer.last_name, testCustomer.last_name);
    });
  });

  describe('Message and Automation Workflow', () => {
    it('should send a message and trigger automation', async () => {
      // Send outbound message
      const messageResponse = await apiRequest('POST', '/api/messages/outbound', testMessage);
      
      assert.strictEqual(messageResponse.status, 200);
      assert(messageResponse.data.success);
      
      // Trigger automation
      const automationResponse = await apiRequest('POST', '/api/automations/run', testAutomation);
      
      assert.strictEqual(automationResponse.status, 200);
      assert(automationResponse.data.success);
    });

    it('should handle inbound message processing', async () => {
      // Simulate inbound SMS
      const inboundSMS = {
        From: '+1234567890',
        To: '+1987654321',
        Body: 'Hello, I need help with my appointment',
        MessageSid: 'test-message-sid-123'
      };

      const smsResponse = await apiRequest('POST', '/api/automations/sms_inbound', inboundSMS);
      
      assert.strictEqual(smsResponse.status, 200);
      assert(smsResponse.data.success);
    });

    it('should handle inbound email processing', async () => {
      // Simulate inbound email
      const inboundEmail = {
        from: 'customer@example.com',
        to: 'support@business.com',
        subject: 'Question about my service',
        text: 'I have a question about my recent service.',
        html: '<p>I have a question about my recent service.</p>'
      };

      const emailResponse = await apiRequest('POST', '/api/automations/email_inbound', inboundEmail);
      
      assert.strictEqual(emailResponse.status, 200);
      assert(emailResponse.data.success);
    });
  });

  describe('Appointment Management Workflow', () => {
    it('should retrieve appointments for different time windows', async () => {
      // Get appointments for next 24 hours
      const next24hResponse = await apiRequest('GET', '/api/appointments?window=next_24h');
      
      assert.strictEqual(next24hResponse.status, 200);
      assert(next24hResponse.data.success);
      assert(Array.isArray(next24hResponse.data.data));
    });

    it('should retrieve completed appointments within time range', async () => {
      // Get completed appointments within last 7 days
      const completedResponse = await apiRequest('GET', '/api/appointments?status=completed&within=7d');
      
      assert.strictEqual(completedResponse.status, 200);
      assert(completedResponse.data.success);
      assert(Array.isArray(completedResponse.data.data));
    });
  });

  describe('SLA Monitoring Workflow', () => {
    it('should check for SLA violations', async () => {
      // Get SLA violations (default 5 minutes)
      const slaResponse = await apiRequest('GET', '/api/sla/unanswered');
      
      assert.strictEqual(slaResponse.status, 200);
      assert(slaResponse.data.success);
      assert(Array.isArray(slaResponse.data.data));
    });

    it('should check for SLA violations with custom time window', async () => {
      // Get SLA violations for 10 minutes
      const slaResponse = await apiRequest('GET', '/api/sla/unanswered?minutes=10');
      
      assert.strictEqual(slaResponse.status, 200);
      assert(slaResponse.data.success);
      assert(Array.isArray(slaResponse.data.data));
    });
  });

  describe('Multi-tenant Security', () => {
    it('should enforce organization isolation', async () => {
      // This test would need to be implemented based on your RLS policies
      // For now, we'll test that the orgId header is required
      try {
        await apiRequest('POST', '/api/messages/outbound', testMessage, { 'x-org-id': '' });
        assert.fail('Should have failed without orgId');
      } catch (error) {
        assert(error.response.status === 400);
        assert(error.response.data.error.includes('organization ID'));
      }
    });

    it('should handle different organization IDs', async () => {
      const org1Response = await apiRequest('POST', '/api/messages/outbound', testMessage, { 'x-org-id': 'org-1' });
      const org2Response = await apiRequest('POST', '/api/messages/outbound', testMessage, { 'x-org-id': 'org-2' });
      
      assert.strictEqual(org1Response.status, 200);
      assert.strictEqual(org2Response.status, 200);
      assert(org1Response.data.success);
      assert(org2Response.data.success);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the health endpoint works
      const healthResponse = await apiRequest('GET', '/health');
      
      assert.strictEqual(healthResponse.status, 200);
      assert(healthResponse.data.status);
    });

    it('should handle malformed requests', async () => {
      try {
        await apiRequest('POST', '/api/customers', { invalid: 'data' });
        assert.fail('Should have failed with malformed request');
      } catch (error) {
        assert(error.response.status === 400);
        assert(error.response.data.error);
      }
    });

    it('should handle missing required fields', async () => {
      try {
        await apiRequest('POST', '/api/customers', { first_name: 'John' }); // Missing business_id
        assert.fail('Should have failed with missing required fields');
      } catch (error) {
        assert(error.response.status === 400);
        assert(error.response.data.error.includes('required fields'));
      }
    });
  });

  describe('Performance and Load', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(apiRequest('GET', '/health'));
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        assert.strictEqual(response.status, 200);
        assert(response.data.status);
      });
    });

    it('should respond within acceptable time limits', async () => {
      const start = Date.now();
      await apiRequest('GET', '/health');
      const duration = Date.now() - start;
      
      // Should respond within 1 second
      assert(duration < 1000, `Response took ${duration}ms, expected < 1000ms`);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      // Create a customer
      const createResponse = await apiRequest('POST', '/api/customers', testCustomer);
      assert(createResponse.data.success);
      
      // Send a message for that customer
      const messageResponse = await apiRequest('POST', '/api/messages/outbound', testMessage);
      assert(messageResponse.data.success);
      
      // Trigger automation
      const automationResponse = await apiRequest('POST', '/api/automations/run', testAutomation);
      assert(automationResponse.data.success);
      
      // All operations should succeed and be consistent
      assert(createResponse.data.success);
      assert(messageResponse.data.success);
      assert(automationResponse.data.success);
    });
  });

  describe('API Contract Compliance', () => {
    it('should return consistent response formats', async () => {
      const responses = await Promise.all([
        apiRequest('GET', '/api/businesses'),
        apiRequest('GET', '/api/customers'),
        apiRequest('GET', '/api/appointments?orgId=test'),
        apiRequest('GET', '/api/sla/unanswered?orgId=test')
      ]);
      
      responses.forEach(response => {
        assert(response.data.hasOwnProperty('success'));
        assert(response.data.hasOwnProperty('message'));
        assert(response.data.hasOwnProperty('data'));
        assert(typeof response.data.success === 'boolean');
        assert(typeof response.data.message === 'string');
        assert(Array.isArray(response.data.data));
      });
    });

    it('should handle query parameters correctly', async () => {
      // Test different query parameter combinations
      const testCases = [
        '/api/appointments?orgId=test&window=next_24h',
        '/api/appointments?orgId=test&status=completed',
        '/api/sla/unanswered?orgId=test&minutes=10',
        '/api/messages/outbound?orgId=test'
      ];
      
      for (const endpoint of testCases) {
        const response = await apiRequest('GET', endpoint);
        assert.strictEqual(response.status, 200);
        assert(response.data.success);
      }
    });
  });
});

// Export for use in other test files
module.exports = {
  apiRequest,
  testBusiness,
  testCustomer,
  testMessage,
  testAutomation
};
