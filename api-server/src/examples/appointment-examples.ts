// Complete appointment management examples for the ClientFlow API

const API_BASE_URL = 'http://localhost:3001/api';
const AUTH_TOKEN = 'your-jwt-token-here';

// Utility function for authenticated requests
async function makeAppointmentRequest(endpoint: string, options: RequestInit = {}) {
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

// 1. Create a new appointment
export async function createAppointment() {
  const appointmentData = {
    customer_name: 'Sarah Johnson',
    customer_phone: '+15551234567',
    customer_email: 'sarah.johnson@example.com',
    customer_notes: 'First-time customer, allergic to certain hair products',
    service_name: 'Haircut and Styling',
    scheduled_at: '2024-01-20T14:00:00Z',
    duration: 90,
    total_price: 75.00,
    payment_method: 'card',
    notes: 'Customer requested consultation',
    internal_notes: 'Check with stylist about allergies',
    metadata: {
      source: 'website',
      preferences: {
        reminder_sms: true,
        reminder_email: true,
        confirmation_sms: true,
        language: 'en',
        timezone: 'America/New_York'
      }
    }
  };

  const result = await makeAppointmentRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });

  console.log('Appointment created:', result.data);
  return result.data;
}

// 2. Create appointment with existing customer
export async function createAppointmentWithExistingCustomer(customerId: string) {
  const appointmentData = {
    customer_id: customerId,
    customer_name: 'John Doe', // Still required for redundancy
    customer_phone: '+15559876543',
    service_name: 'Beard Trim',
    scheduled_at: '2024-01-18T10:30:00Z',
    duration: 30,
    total_price: 25.00,
    notes: 'Regular customer - beard trim only'
  };

  const result = await makeAppointmentRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });

  console.log('Appointment with existing customer created:', result.data);
  return result.data;
}

// 3. Get appointments with various filters
export async function getAppointmentsExamples() {
  // Get today's appointments
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const todayAppointments = await makeAppointmentRequest(
    `/appointments?start_date=${todayStart}&end_date=${todayEnd}&sort_by=scheduled_at&sort_order=asc`
  );
  console.log("Today's appointments:", todayAppointments.data);

  // Get confirmed appointments for this week
  const weekStart = new Date();
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekAppointments = await makeAppointmentRequest(
    `/appointments?start_date=${weekStart.toISOString()}&end_date=${weekEnd.toISOString()}&status=confirmed&limit=50`
  );
  console.log("This week's confirmed appointments:", weekAppointments.data);

  // Search appointments by customer name
  const customerAppointments = await makeAppointmentRequest(
    '/appointments?customer_search=Sarah&sort_by=scheduled_at&sort_order=desc'
  );
  console.log("Sarah's appointments:", customerAppointments.data);

  // Get cancelled appointments with reasons
  const cancelledAppointments = await makeAppointmentRequest(
    '/appointments?status=cancelled&include_cancelled=true&sort_by=scheduled_at&sort_order=desc&limit=20'
  );
  console.log("Recent cancellations:", cancelledAppointments.data);

  return {
    today: todayAppointments.data,
    week: weekAppointments.data,
    customer: customerAppointments.data,
    cancelled: cancelledAppointments.data
  };
}

// 4. Update appointment details
export async function updateAppointment(appointmentId: string) {
  const updateData = {
    customer_name: 'Sarah Johnson-Smith', // Name change
    scheduled_at: '2024-01-21T14:30:00Z', // Rescheduled
    duration: 120, // Extended duration
    total_price: 100.00, // Price adjustment
    service_name: 'Haircut, Color, and Styling',
    notes: 'Customer requested color change - updated appointment'
  };

  const result = await makeAppointmentRequest(`/appointments/${appointmentId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });

  console.log('Appointment updated:', result.data);
  console.log('Note: SMS reschedule notification was sent automatically');
  return result.data;
}

// 5. Update appointment status with SMS notifications
export async function appointmentStatusWorkflow(appointmentId: string) {
  // Step 1: Confirm the appointment (triggers confirmation SMS)
  const confirmResponse = await makeAppointmentRequest(`/appointments/${appointmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'confirmed',
      notes: 'Appointment confirmed by receptionist'
    })
  });
  console.log('Appointment confirmed:', confirmResponse.data);
  console.log('SMS confirmation sent to customer');

  // Wait a bit...
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Mark as completed
  const completeResponse = await makeAppointmentRequest(`/appointments/${appointmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'completed',
      notes: 'Service completed successfully'
    })
  });
  console.log('Appointment completed:', completeResponse.data);
  console.log('Payment status could be updated separately');

  return {
    confirmed: confirmResponse.data,
    completed: completeResponse.data
  };
}

// 6. Cancel appointment with reason
export async function cancelAppointment(appointmentId: string, reason: string) {
  const cancelData = {
    status: 'cancelled',
    cancellation_reason: reason,
    cancellation_fee: 10.00, // Optional cancellation fee
    notes: `Appointment cancelled due to: ${reason}`
  };

  const result = await makeAppointmentRequest(`/appointments/${appointmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify(cancelData)
  });

  console.log('Appointment cancelled:', result.data);
  console.log('SMS cancellation notification sent to customer');
  return result.data;
}

// 7. Bulk operations examples
export async function bulkAppointmentOperations() {
  // Create multiple appointments for testing
  const appointments = [
    {
      customer_name: 'Mike Wilson',
      customer_phone: '+15551111111',
      service_name: 'Haircut',
      scheduled_at: '2024-01-22T09:00:00Z',
      duration: 45,
      total_price: 40.00
    },
    {
      customer_name: 'Emily Davis',
      customer_phone: '+15552222222',
      service_name: 'Coloring',
      scheduled_at: '2024-01-22T10:00:00Z',
      duration: 120,
      total_price: 120.00
    },
    {
      customer_name: 'David Brown',
      customer_phone: '+15553333333',
      service_name: 'Beard Trim',
      scheduled_at: '2024-01-22T11:00:00Z',
      duration: 30,
      total_price: 25.00
    }
  ];

  const results = [];
  
  for (let i = 0; i < appointments.length; i++) {
    try {
      // Add time offset to prevent conflicts
      const appointment = appointments[i];
      const offsetHours = i * 2; // 2 hours between appointments
      const scheduledTime = new Date(appointment.scheduled_at);
      scheduledTime.setHours(scheduledTime.getHours() + offsetHours);
      
      const adjustedAppointment = {
        ...appointment,
        scheduled_at: scheduledTime.toISOString()
      };

      const result = await makeAppointmentRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify(adjustedAppointment)
      });
      
      results.push(result.data);
      console.log(`Created appointment ${i + 1}:`, result.data.id);
    } catch (error) {
      console.error(`Failed to create appointment ${i + 1}:`, error);
    }
  }

  console.log(`Bulk creation completed: ${results.length} appointments created`);
  return results;
}

// 8. Advanced filtering and reporting
export async function generateAppointmentReports() {
  // Monthly report
  const monthStart = '2024-01-01T00:00:00Z';
  const monthEnd = '2024-01-31T23:59:59Z';

  const monthlyReport = await makeAppointmentRequest(
    `/appointments?start_date=${monthStart}&end_date=${monthEnd}&sort_by=scheduled_at`
  );

  // Completed appointments this month
  const completedCount = monthlyReport.data.appointments.filter(
    apt => apt.status === 'completed'
  ).length;

  // Revenue calculation
  const completedAppointments = monthlyReport.data.appointments.filter(
    apt => apt.status === 'completed' && apt.total_price
  );
  const totalRevenue = completedAppointments.reduce(
    (sum, apt) => sum + (apt.total_price || 0), 0
  );

  console.log('Monthly Report:', {
    total_appointments: monthlyReport.data.pagination.total_count,
    completed_appointments: completedCount,
    total_revenue: totalRevenue,
    completion_rate: (completedCount / monthlyReport.data.pagination.total_count * 100).toFixed(1) + '%'
  });

  // Service breakdown
  const serviceStats = {};
  monthlyReport.data.appointments.forEach(apt => {
    const service = apt.service_name;
    serviceStats[service] = (serviceStats[service] || 0) + 1;
  });

  console.log('Service Breakdown:', serviceStats);

  return {
    monthlyReport: monthlyReport.data,
    stats: {
      completedCount,
      totalRevenue,
      serviceStats
    }
  };
}

// 9. Error handling examples
export async function errorHandlingExamples() {
  try {
    // Try to create appointment in the past
    await makeAppointmentRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: 'Test Customer',
        customer_phone: '+15559999999',
        service_name: 'Test Service',
        scheduled_at: '2020-01-01T10:00:00Z', // Past date
        duration: 60
      })
    });
  } catch (error) {
    console.error('Past date error (expected):', error.message);
  }

  try {
    // Try to update non-existent appointment
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await makeAppointmentRequest(`/appointments/${fakeId}`, {
      method: 'PUT',
      body: JSON.stringify({ customer_name: 'Updated Name' })
    });
  } catch (error) {
    console.error('Non-existent appointment error (expected):', error.message);
  }

  try {
    // Try invalid UUID format
    await makeAppointmentRequest('/appointments/invalid-id', {
      method: 'GET'
    });
  } catch (error) {
    console.error('Invalid UUID error (expected):', error.message);
  }
}

// 10. Integration with customer management
export async function integratedCustomerAppointmentFlow() {
  // This demonstrates how appointment management integrates with customer management
  
  // Step 1: Create or find customer
  const customerResponse = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify({
      first_name: 'Integration',
      last_name: 'Test',
      phone: '+15554444444',
      email: 'integration@example.com'
    })
  });
  
  const customer = await customerResponse.json();
  console.log('Customer created/found:', customer.data);

  // Step 2: Create appointment linked to customer
  const appointmentData = {
    customer_id: customer.data.id,
    customer_name: `${customer.data.first_name} ${customer.data.last_name}`,
    customer_phone: customer.data.phone,
    customer_email: customer.data.email,
    service_name: 'Integrated Service',
    scheduled_at: '2024-01-25T15:00:00Z',
    duration: 60,
    total_price: 55.00,
    notes: 'Customer from CRM integration'
  };

  const appointment = await makeAppointmentRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });

  console.log('Integrated appointment created:', appointment.data);
  
  // Step 3: Confirm and complete workflow
  await makeAppointmentRequest(`/appointments/${appointment.data.id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'confirmed' })
  });

  console.log('Integration workflow completed successfully');
  
  return {
    customer: customer.data,
    appointment: appointment.data
  };
}

// Export all examples for easy testing
export default {
  createAppointment,
  createAppointmentWithExistingCustomer,
  getAppointmentsExamples,
  updateAppointment,
  appointmentStatusWorkflow,
  cancelAppointment,
  bulkAppointmentOperations,
  generateAppointmentReports,
  errorHandlingExamples,
  integratedCustomerAppointmentFlow
};

// Usage instructions for Node.js environment
if (typeof window === 'undefined') {
  console.log('📅 Appointment Management API Examples Loaded');
  console.log('Available functions:');
  console.log('- createAppointment()');
  console.log('- createAppointmentWithExistingCustomer(customerId)');
  console.log('- getAppointmentsExamples()');
  console.log('- updateAppointment(appointmentId)');
  console.log('- appointmentStatusWorkflow(appointmentId)');
  console.log('- cancelAppointment(appointmentId, reason)');
  console.log('- bulkAppointmentOperations()');
  console.log('- generateAppointmentReports()');
  console.log('- errorHandlingExamples()');
  console.log('- integratedCustomerAppointmentFlow()');
  console.log('\nTo run examples:');
  console.log('1. Set AUTH_TOKEN variable with valid JWT');
  console.log('2. Call the desired function, e.g., await bulkAppointmentOperations()');
}
