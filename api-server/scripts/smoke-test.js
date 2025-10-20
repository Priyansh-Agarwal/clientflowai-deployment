#!/usr/bin/env node

/**
 * ClientFlow AI Suite - Production Smoke Test
 * Tests all critical endpoints to ensure production readiness
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'test-org-123';
const TIMEOUT = 10000; // 10 seconds

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// Helper function to run a test
async function runTest(name, testFn) {
  results.total++;
  const start = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - start;
    results.passed++;
    results.tests.push({ name, status: 'PASS', duration: `${duration}ms` });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    results.failed++;
    results.tests.push({ 
      name, 
      status: 'FAIL', 
      duration: `${duration}ms`, 
      error: error.message 
    });
    console.log(`❌ ${name} (${duration}ms) - ${error.message}`);
  }
}

// Test functions
async function testHealthEndpoint() {
  const response = await axios.get(`${BASE_URL}/health`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.status || !response.data.timestamp) {
    throw new Error('Missing required health check fields');
  }
  
  if (response.data.database && response.data.database.status !== 'Connected') {
    throw new Error(`Database not connected: ${response.data.database.error || 'Unknown error'}`);
  }
}

async function testRootEndpoint() {
  const response = await axios.get(`${BASE_URL}/`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.name || !response.data.endpoints) {
    throw new Error('Missing required API documentation fields');
  }
}

async function testDatabaseConnection() {
  const response = await axios.get(`${BASE_URL}/test`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Database test failed: ${response.data.error || 'Unknown error'}`);
  }
}

async function testBusinessesEndpoint() {
  const response = await axios.get(`${BASE_URL}/api/businesses`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error('Invalid businesses endpoint response format');
  }
}

async function testCustomersEndpoint() {
  const response = await axios.get(`${BASE_URL}/api/customers`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error('Invalid customers endpoint response format');
  }
}

async function testCreateCustomer() {
  const customerData = {
    business_id: 'test-business-123',
    first_name: 'Test',
    last_name: 'Customer',
    email: 'test@example.com',
    phone: '+1234567890',
    source: 'smoke-test'
  };
  
  const response = await axios.post(`${BASE_URL}/api/customers`, customerData, { 
    timeout: TIMEOUT,
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (response.status !== 201) {
    throw new Error(`Expected status 201, got ${response.status}`);
  }
  
  if (!response.data.success || !response.data.data) {
    throw new Error('Customer creation failed');
  }
}

async function testOutboundMessage() {
  const messageData = {
    channel: 'sms',
    to_addr: '+1234567890',
    body: 'Smoke test message'
  };
  
  const response = await axios.post(`${BASE_URL}/api/messages/outbound?orgId=${TEST_ORG_ID}`, messageData, {
    timeout: TIMEOUT,
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Message sending failed: ${response.data.error || 'Unknown error'}`);
  }
}

async function testAutomationTrigger() {
  const automationData = {
    type: 'test_automation',
    payload: { test: true }
  };
  
  const response = await axios.post(`${BASE_URL}/api/automations/run?orgId=${TEST_ORG_ID}`, automationData, {
    timeout: TIMEOUT,
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success) {
    throw new Error(`Automation trigger failed: ${response.data.error || 'Unknown error'}`);
  }
}

async function testAppointmentsEndpoint() {
  const response = await axios.get(`${BASE_URL}/api/appointments?orgId=${TEST_ORG_ID}`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error('Invalid appointments endpoint response format');
  }
}

async function testSLAEndpoint() {
  const response = await axios.get(`${BASE_URL}/api/sla/unanswered?orgId=${TEST_ORG_ID}`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error('Invalid SLA endpoint response format');
  }
}

async function testRateLimiting() {
  // Make multiple rapid requests to test rate limiting
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(axios.get(`${BASE_URL}/health`, { timeout: TIMEOUT }));
  }
  
  const responses = await Promise.all(promises);
  
  // All should succeed (rate limit is 100 per 15 minutes)
  const failed = responses.filter(r => r.status !== 200);
  if (failed.length > 0) {
    throw new Error(`Rate limiting test failed: ${failed.length} requests failed`);
  }
}

async function testCORSHeaders() {
  const response = await axios.options(`${BASE_URL}/api/customers`, { timeout: TIMEOUT });
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200 for OPTIONS, got ${response.status}`);
  }
  
  const corsHeaders = response.headers;
  if (!corsHeaders['access-control-allow-origin']) {
    throw new Error('Missing CORS headers');
  }
}

async function testErrorHandling() {
  // Test 404 endpoint
  try {
    await axios.get(`${BASE_URL}/nonexistent-endpoint`, { timeout: TIMEOUT });
    throw new Error('Expected 404 error for nonexistent endpoint');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // This is expected
      return;
    }
    throw error;
  }
}

// Main test runner
async function runSmokeTests() {
  console.log('🚀 Starting ClientFlow AI Suite Smoke Tests');
  console.log(`📍 Testing API at: ${BASE_URL}`);
  console.log(`🏢 Using test org ID: ${TEST_ORG_ID}`);
  console.log('');

  // Core functionality tests
  await runTest('Health Check Endpoint', testHealthEndpoint);
  await runTest('Root API Documentation', testRootEndpoint);
  await runTest('Database Connection Test', testDatabaseConnection);
  
  // CRM endpoints
  await runTest('Businesses Endpoint', testBusinessesEndpoint);
  await runTest('Customers Endpoint', testCustomersEndpoint);
  await runTest('Create Customer', testCreateCustomer);
  
  // Automation endpoints
  await runTest('Outbound Message', testOutboundMessage);
  await runTest('Automation Trigger', testAutomationTrigger);
  await runTest('Appointments Endpoint', testAppointmentsEndpoint);
  await runTest('SLA Endpoint', testSLAEndpoint);
  
  // Security and performance tests
  await runTest('Rate Limiting', testRateLimiting);
  await runTest('CORS Headers', testCORSHeaders);
  await runTest('Error Handling', testErrorHandling);

  // Generate report
  console.log('');
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.total}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    testOrgId: TEST_ORG_ID,
    summary: {
      passed: results.passed,
      failed: results.failed,
      total: results.total,
      successRate: (results.passed / results.total) * 100
    },
    tests: results.tests
  };

  const reportPath = path.join(__dirname, 'smoke-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);

  // Exit with error code if any tests failed
  if (results.failed > 0) {
    console.log('');
    console.log('❌ Some tests failed. Check the report for details.');
    process.exit(1);
  } else {
    console.log('');
    console.log('🎉 All smoke tests passed! API is production ready.');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runSmokeTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runSmokeTests, runTest };