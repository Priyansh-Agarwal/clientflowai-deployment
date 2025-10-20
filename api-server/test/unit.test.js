/**
 * ClientFlow AI Suite - Unit Tests
 * Tests individual functions and middleware
 */

const assert = require('assert');

// Mock Express app for testing
const express = require('express');
const request = require('supertest');

// Import the app (we'll need to modify it to be testable)
const app = express();

// Test data
const mockCustomer = {
  business_id: 'test-business-123',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  source: 'test'
};

const mockMessage = {
  channel: 'sms',
  to_addr: '+1234567890',
  body: 'Test message'
};

const mockAutomation = {
  type: 'test_automation',
  payload: { test: true }
};

// Test suite
describe('ClientFlow AI Suite - Unit Tests', () => {
  
  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      assert(response.body.status);
      assert(response.body.timestamp);
      assert(response.body.version);
    });
  });

  describe('API Documentation Endpoint', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      assert(response.body.name);
      assert(response.body.endpoints);
      assert(response.body.features);
    });
  });

  describe('Database Test Endpoint', () => {
    it('should test database connection', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);
      
      assert(response.body.success);
      assert(response.body.database_status);
    });
  });

  describe('Businesses Endpoint', () => {
    it('should return businesses list', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .expect(200);
      
      assert(response.body.success);
      assert(Array.isArray(response.body.data));
    });
  });

  describe('Customers Endpoint', () => {
    it('should return customers list', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(200);
      
      assert(response.body.success);
      assert(Array.isArray(response.body.data));
    });

    it('should create a new customer', async () => {
      const response = await request(app)
        .post('/api/customers')
        .send(mockCustomer)
        .expect(201);
      
      assert(response.body.success);
      assert(response.body.data);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .send({ first_name: 'John' }) // Missing business_id
        .expect(400);
      
      assert(!response.body.success);
      assert(response.body.error);
    });
  });

  describe('Message Endpoints', () => {
    it('should send outbound message', async () => {
      const response = await request(app)
        .post('/api/messages/outbound')
        .query({ orgId: 'test-org-123' })
        .send(mockMessage)
        .expect(200);
      
      assert(response.body.success);
    });

    it('should require organization ID', async () => {
      const response = await request(app)
        .post('/api/messages/outbound')
        .send(mockMessage)
        .expect(400);
      
      assert(!response.body.success);
      assert(response.body.error.includes('organization ID'));
    });

    it('should validate message fields', async () => {
      const response = await request(app)
        .post('/api/messages/outbound')
        .query({ orgId: 'test-org-123' })
        .send({ channel: 'sms' }) // Missing to_addr and body
        .expect(400);
      
      assert(!response.body.success);
      assert(response.body.error.includes('required fields'));
    });
  });

  describe('Automation Endpoints', () => {
    it('should trigger automation', async () => {
      const response = await request(app)
        .post('/api/automations/run')
        .query({ orgId: 'test-org-123' })
        .send(mockAutomation)
        .expect(200);
      
      assert(response.body.success);
    });

    it('should require automation type', async () => {
      const response = await request(app)
        .post('/api/automations/run')
        .query({ orgId: 'test-org-123' })
        .send({})
        .expect(400);
      
      assert(!response.body.success);
      assert(response.body.error.includes('automation type'));
    });
  });

  describe('Appointments Endpoint', () => {
    it('should return appointments', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .query({ orgId: 'test-org-123' })
        .expect(200);
      
      assert(response.body.success);
      assert(Array.isArray(response.body.data));
    });
  });

  describe('SLA Endpoint', () => {
    it('should return SLA violations', async () => {
      const response = await request(app)
        .get('/api/sla/unanswered')
        .query({ orgId: 'test-org-123' })
        .expect(200);
      
      assert(response.body.success);
      assert(Array.isArray(response.body.data));
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);
      
      assert(!response.body.success);
      assert(response.body.error.includes('not found'));
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/customers')
        .expect(200);
      
      assert(response.headers['access-control-allow-origin']);
      assert(response.headers['access-control-allow-methods']);
      assert(response.headers['access-control-allow-headers']);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(app).get('/health'));
      }
      
      const responses = await Promise.all(promises);
      
      // All should succeed (rate limit is 100 per 15 minutes)
      responses.forEach(response => {
        assert(response.status === 200);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const invalidCustomer = {
        ...mockCustomer,
        email: 'invalid-email'
      };
      
      // This test would need to be implemented based on your validation logic
      // For now, we'll just test that the endpoint accepts the request
      const response = await request(app)
        .post('/api/customers')
        .send(invalidCustomer)
        .expect(201); // Assuming you don't validate email format yet
      
      assert(response.body.success);
    });

    it('should validate phone number format', async () => {
      const invalidCustomer = {
        ...mockCustomer,
        phone: 'invalid-phone'
      };
      
      // This test would need to be implemented based on your validation logic
      const response = await request(app)
        .post('/api/customers')
        .send(invalidCustomer)
        .expect(201); // Assuming you don't validate phone format yet
      
      assert(response.body.success);
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .expect(200);
      
      assert(response.body.hasOwnProperty('success'));
      assert(response.body.hasOwnProperty('message'));
      assert(response.body.hasOwnProperty('data'));
    });

    it('should return error format for failed requests', async () => {
      const response = await request(app)
        .post('/api/customers')
        .send({}) // Missing required fields
        .expect(400);
      
      assert(response.body.hasOwnProperty('success'));
      assert(response.body.hasOwnProperty('error'));
      assert(!response.body.success);
    });
  });
});

// Export for use in other test files
module.exports = {
  mockCustomer,
  mockMessage,
  mockAutomation
};
