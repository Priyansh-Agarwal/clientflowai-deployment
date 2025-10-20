// ClientFlow AI Suite - API Test Script
// Run this to test your deployed API

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

console.log('🧪 ClientFlow AI Suite - API Test Script');
console.log('=====================================');
console.log(`Testing API at: ${API_BASE_URL}`);
console.log('');

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClientFlow-API-Test/1.0.0'
      },
      timeout: TIMEOUT
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('🏥 Testing Health Check...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/health`);
    if (response.status === 200) {
      console.log('✅ Health Check: PASSED');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Database: ${response.data.database}`);
      console.log(`   Uptime: ${response.data.uptime}s`);
      return true;
    } else {
      console.log('❌ Health Check: FAILED');
      console.log(`   Status Code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Health Check: ERROR');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testAPIDocumentation() {
  console.log('📚 Testing API Documentation...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/`);
    if (response.status === 200) {
      console.log('✅ API Documentation: PASSED');
      console.log(`   Name: ${response.data.name}`);
      console.log(`   Version: ${response.data.version}`);
      console.log(`   Status: ${response.data.status}`);
      return true;
    } else {
      console.log('❌ API Documentation: FAILED');
      console.log(`   Status Code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ API Documentation: ERROR');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('🗄️ Testing Database Connection...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/test`);
    if (response.status === 200) {
      console.log('✅ Database Connection: PASSED');
      console.log(`   Database Status: ${response.data.database_status}`);
      console.log(`   Environment: ${response.data.environment}`);
      return true;
    } else {
      console.log('❌ Database Connection: FAILED');
      console.log(`   Status Code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Database Connection: ERROR');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testBusinessesAPI() {
  console.log('🏢 Testing Businesses API...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/businesses`);
    if (response.status === 200) {
      console.log('✅ Businesses API: PASSED');
      console.log(`   Count: ${response.data.count || 0} businesses`);
      console.log(`   Success: ${response.data.success}`);
      return true;
    } else {
      console.log('❌ Businesses API: FAILED');
      console.log(`   Status Code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Businesses API: ERROR');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testCustomersAPI() {
  console.log('👥 Testing Customers API...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/customers`);
    if (response.status === 200) {
      console.log('✅ Customers API: PASSED');
      console.log(`   Count: ${response.data.count || 0} customers`);
      console.log(`   Success: ${response.data.success}`);
      return true;
    } else {
      console.log('❌ Customers API: FAILED');
      console.log(`   Status Code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Customers API: ERROR');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testAnalyticsAPI() {
  console.log('📊 Testing Analytics API...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/analytics/dashboard`);
    if (response.status === 200) {
      console.log('✅ Analytics API: PASSED');
      console.log(`   Success: ${response.data.success}`);
      console.log(`   KPIs: ${Object.keys(response.data.data?.kpis || {}).length} metrics`);
      return true;
    } else {
      console.log('❌ Analytics API: FAILED');
      console.log(`   Status Code: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Analytics API: ERROR');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log('Starting API tests...\n');
  
  const tests = [
    testHealthCheck,
    testAPIDocumentation,
    testDatabaseConnection,
    testBusinessesAPI,
    testCustomersAPI,
    testAnalyticsAPI
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const result = await test();
    if (result) passed++;
    console.log(''); // Empty line for readability
  }
  
  console.log('=====================================');
  console.log(`📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your API is working perfectly!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please check your API configuration.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
