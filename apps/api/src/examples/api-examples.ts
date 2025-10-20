// Example API usage for Customer Management endpoints
// Copy and modify these examples for your application

const API_BASE_URL = 'http://localhost:3001/api';
const AUTH_TOKEN = 'your-jwt-token-here';

// Helper function to make authenticated requests
async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Request failed'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Request to ${endpoint} failed:`, error);
    throw error;
  }
}

// 1. Create a new customer
export async function createCustomer() {
  const customerData = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US'
    },
    notes: 'Preferred customer - VIP status',
    lead_source: 'website',
    status: 'active',
    preferences: {
      communication_method: 'email',
      language: 'en',
      timezone: 'America/New_York'
    },
    tags: ['vip', 'high_value']
  };

  const result = await makeRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  });

  console.log('Customer created:', result.data);
  return result.data;
}

// 2. Get customers with search and pagination
export async function getCustomers(search = '', page = 1, limit = 10) {
  const queryParams = new URLSearchParams({
    ...(search && { search }),
    page: page.toString(),
    limit: limit.toString(),
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const result = await makeRequest(`/customers?${queryParams}`);
  
  console.log(`Found ${result.data.total_count} customers`);
  console.log(`Page ${result.data.pagination.current_page} of ${result.data.pagination.total_pages}`);
  return result.data;
}

// 3. Get a specific customer by ID
export async function getCustomerById(customerId: string) {
  const result = await makeRequest(`/customers/${customerId}`);
  console.log('Customer details:', result.data);
  return result.data;
}

// 4. Update a customer
export async function updateCustomer(customerId: string) {
  const updateData = {
    first_name: 'Jane',
    email: 'jane.doe@example.com',
    notes: 'Updated customer information',
    status: 'active',
    last_interaction_at: new Date().toISOString()
  };

  const result = await makeRequest(`/customers/${customerId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });

  console.log('Customer updated:', result.data);
  return result.data;
}

// 5. Delete a customer
export async function deleteCustomer(customerId: string) {
  const result = await makeRequest(`/customers/${customerId}`, {
    method: 'DELETE'
  });

  console.log('Customer deleted:', result.message);
  return result;
}

// 6. Advanced search examples
export async function advancedSearchExamples() {
  // Search by name
  await getCustomers('John', 1, 5);
  
  // Search by phone number
  await getCustomers('+1234', 1, 10);
  
  // Get inactive customers
  const inactiveCustomers = await makeRequest('/customers?status=inactive&limit=20');
  console.log('Inactive customers:', inactiveCustomers.data);
  
  // Search with sorting
  const recentCustomers = await makeRequest('/customers?sort_by=last_interaction_at&sort_order=desc&limit=5');
  console.log('Recent customers:', recentCustomers.data);
}

// 7. Bulk operations example
export async function bulkOperationsExample() {
  const customers = [
    { first_name: 'Alice', last_name: 'Smith', phone: '+1111111111', status: 'active' },
    { first_name: 'Bob', last_name: 'Johnson', phone: '+2222222222', status: 'active' },
    { first_name: 'Charlie', last_name: 'Brown', phone: '+3333333333', status: 'active' }
  ];

  const results = [];
  
  for (const customer of customers) {
    try {
      const result = await makeRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(customer)
      });
      results.push(result.data);
    } catch (error) {
      console.error(`Failed to create customer ${customer.first_name}:`, error);
    }
  }

  console.log('Bulk creation completed:', results);
  return results;
}

// 8. Error handling examples
export async function errorHandlingExamples() {
  try {
    // Try to create a customer with invalid data
    await makeRequest('/customers', {
      method: 'POST',
      body: JSON.stringify({
        first_name: '', // Invalid: empty name
        last_name: 'Doe',
        phone: 'invalid-phone' // Invalid phone format
      })
    });
  } catch (error) {
    console.error('Validation error expected:', error.message);
  }

  try {
    // Try to get a non-existent customer
    await getCustomerById('non-existent-id');
  } catch (error) {
    console.error('Not found error expected:', error.message);
  }

  try {
    // Try without authentication token
    await fetch(`${API_BASE_URL}/customers`);
  } catch (error) {
    console.error('Authentication error expected:', error.message);
  }
}

// Usage examples:
if (typeof window === 'undefined') { // Node.js environment
  console.log('Running API examples...');
  
  // Uncomment to run examples:
  // createCustomer();
  // getCustomers('John');
  // advancedSearchExamples();
  // bulkOperationsExample();
  // errorHandlingExamples();
}

export default {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  advancedSearchExamples,
  bulkOperationsExample,
  errorHandlingExamples
};
