import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';
const ORG_ID = process.env.ORG_ID || '00000000-0000-0000-0000-000000000000';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration?: number;
}

const tests: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
  const start = Date.now();
  try {
    console.log(`🧪 Running test: ${name}`);
    await testFn();
    const duration = Date.now() - start;
    tests.push({ name, success: true, duration });
    console.log(`✅ ${name} - PASSED (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    tests.push({ name, success: false, error: errorMessage, duration });
    console.log(`❌ ${name} - FAILED (${duration}ms): ${errorMessage}`);
  }
}

async function testHealthCheck() {
  const response = await axios.get(`${API_BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  if (!response.data.success) {
    throw new Error('Health check returned unsuccessful response');
  }
}

async function testReadyCheck() {
  const response = await axios.get(`${API_BASE_URL}/ready`);
  if (response.status !== 200) {
    throw new Error(`Ready check failed with status ${response.status}`);
  }
  if (!response.data.ready) {
    throw new Error('Ready check returned not ready');
  }
}

async function testMessagesOutbound() {
  const response = await axios.post(`${API_BASE_URL}/messages/outbound`, {
    orgId: ORG_ID,
    channel: 'sms',
    to_addr: '+15555550123',
    body: 'Test message from smoke test'
  });
  
  if (response.status !== 200) {
    throw new Error(`Messages outbound failed with status ${response.status}`);
  }
  if (!response.data.success) {
    throw new Error('Messages outbound returned unsuccessful response');
  }
}

async function testAppointmentsNext24h() {
  const response = await axios.get(`${API_BASE_URL}/appointments?window=next_24h`, {
    headers: {
      'x-org-id': ORG_ID
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Appointments next 24h failed with status ${response.status}`);
  }
  if (!Array.isArray(response.data.data)) {
    throw new Error('Appointments next 24h did not return array');
  }
}

async function testAppointmentsCompleted() {
  const response = await axios.get(`${API_BASE_URL}/appointments?status=completed&within=1d`, {
    headers: {
      'x-org-id': ORG_ID
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Appointments completed failed with status ${response.status}`);
  }
  if (!Array.isArray(response.data.data)) {
    throw new Error('Appointments completed did not return array');
  }
}

async function testSLAUnanswered() {
  const response = await axios.get(`${API_BASE_URL}/sla/unanswered?minutes=5`, {
    headers: {
      'x-org-id': ORG_ID
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`SLA unanswered failed with status ${response.status}`);
  }
  if (!Array.isArray(response.data.data)) {
    throw new Error('SLA unanswered did not return array');
  }
}

async function testAutomationPresets() {
  const response = await axios.get(`${API_BASE_URL}/automations/presets`);
  
  if (response.status !== 200) {
    throw new Error(`Automation presets failed with status ${response.status}`);
  }
  if (!Array.isArray(response.data)) {
    throw new Error('Automation presets did not return array');
  }
}

async function testAutomationRun() {
  const response = await axios.post(`${API_BASE_URL}/automations/run`, {
    type: 'reminder',
    orgId: ORG_ID,
    payload: {
      test: true,
      message: 'Smoke test automation'
    }
  }, {
    headers: {
      'x-org-id': ORG_ID
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Automation run failed with status ${response.status}`);
  }
  if (!response.data.success) {
    throw new Error('Automation run returned unsuccessful response');
  }
}

async function testSMSInbound() {
  const response = await axios.post(`${API_BASE_URL}/automations/sms_inbound`, {
    From: '+15555550123',
    To: '+15555551234',
    Body: 'Test SMS from smoke test',
    MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
    MessageStatus: 'received'
  }, {
    headers: {
      'x-org-id': ORG_ID
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`SMS inbound failed with status ${response.status}`);
  }
  if (!response.data.success) {
    throw new Error('SMS inbound returned unsuccessful response');
  }
}

async function testEmailInbound() {
  const response = await axios.post(`${API_BASE_URL}/automations/email_inbound`, {
    from: 'test@example.com',
    to: 'support@clientflow.ai',
    subject: 'Test Email from Smoke Test',
    text: 'This is a test email from the smoke test script.',
    html: '<p>This is a test email from the smoke test script.</p>'
  }, {
    headers: {
      'x-org-id': ORG_ID
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`Email inbound failed with status ${response.status}`);
  }
  if (!response.data.success) {
    throw new Error('Email inbound returned unsuccessful response');
  }
}

async function main() {
  console.log('🚀 Starting ClientFlow Smoke Tests');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`🏢 Organization ID: ${ORG_ID}`);
  console.log('');

  // Run all tests
  await runTest('Health Check', testHealthCheck);
  await runTest('Ready Check', testReadyCheck);
  await runTest('Messages Outbound (SMS)', testMessagesOutbound);
  await runTest('Appointments Next 24h', testAppointmentsNext24h);
  await runTest('Appointments Completed', testAppointmentsCompleted);
  await runTest('SLA Unanswered', testSLAUnanswered);
  await runTest('Automation Presets', testAutomationPresets);
  await runTest('Automation Run', testAutomationRun);
  await runTest('SMS Inbound Proxy', testSMSInbound);
  await runTest('Email Inbound Proxy', testEmailInbound);

  // Summary
  console.log('');
  console.log('📊 Test Summary:');
  console.log('================');
  
  const passed = tests.filter(t => t.success).length;
  const failed = tests.filter(t => !t.success).length;
  const total = tests.length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${total}`);
  console.log(`⏱️  Total Duration: ${tests.reduce((sum, t) => sum + (t.duration || 0), 0)}ms`);
  
  if (failed > 0) {
    console.log('');
    console.log('❌ Failed Tests:');
    tests.filter(t => !t.success).forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }
  
  console.log('');
  if (failed === 0) {
    console.log('🎉 All tests passed! ClientFlow API is ready for n8n integration.');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(error => {
  console.error('💥 Main function failed:', error);
  process.exit(1);
});