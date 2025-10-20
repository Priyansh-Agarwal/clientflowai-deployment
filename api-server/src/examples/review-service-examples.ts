import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const JWT_TOKEN = 'YOUR_SUPABASE_JWT_TOKEN'; // Replace with a valid JWT token for a business admin/owner

const makeRequest = async (endpoint: string, options: any = {}) => {
  try {
    const response = await axios({
      url: `${API_BASE_URL}${endpoint}`,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        ...options.headers,
      },
      data: options.body,
      params: options.params,
    });
    console.log(`\n--- ${options.method || 'GET'} ${endpoint} Response ---`);
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error(`\n--- Error for ${options.method || 'GET'} ${endpoint} ---`);
    console.error(JSON.stringify(error.response?.data || error.message, null, 2));
    throw error;
  }
};

export const runReviewExamples = async () => {
  console.log('Starting Review API Examples...');

  let reviewId: string | undefined;

  // 1. Create a new review
  try {
    const newReview = await makeRequest('/reviews', {
      method: 'POST',
      body: {
        customer_id: null,
        reviewer_name: 'Alice Johnson',
        reviewer_email: 'alice.johnson@example.com',
        reviewer_phone: '+15552345678',
        platform: 'website',
        rating: 5,
        title: 'Amazing Service Experience',
        comment: 'I had an absolutely wonderful time at this salon! The staff was professional, the atmosphere was relaxing, and my haircut exceeded my expectations. I will definitely be coming back here for all my hair care needs.',
        status: 'published',
        verified: true,

        metadata: {
          source_url: 'https://mysalon.example.com/reviews',
          verified_purchase: true,
          purchase_date: '2024-01-15T14:00:00Z',
          transaction_id: 'txn_review_12345'
        }
      },
    });
    reviewId = newReview.data.id;
  } catch (error) {
    console.error('Failed to create review:', error);
    // Try to get an existing review for further operations
    try {
      const reviewsList = await makeRequest('/reviews', { params: { limit: 1 } });
      if (reviewsList.data.reviews && reviewsList.data.reviews.length > 0) {
        reviewId = reviewsList.data.reviews[0].id;
        console.log(`Found existing review: ${reviewId}`);
      } else {
        console.error('No reviews found. Skipping further examples.');
        return;
      }
    } catch (listError) {
      console.error('Could not find or create review. Exiting examples.');
      return;
    }
  }

  if (!reviewId) {
    console.error('Review ID not available. Exiting examples.');
    return;
  }

  // 2. Get all reviews with filtering
  await makeRequest('/reviews', {
    params: {
      rating: 5,
      platform: 'website',
      verified: true,
      page: 1,
      limit: 5,
      sort_by: 'created_at',
      sort_order: 'desc'
    }
  });

  // 3. Get a single review by ID
  await makeRequest(`/reviews/${reviewId}`);

  // 4. Respond to the review (admin/owner only)
  await makeRequest(`/reviews/${reviewId}/respond`, {
    method: 'PUT',
    body: {
      response: 'Thank you so much Alice for the wonderful review! We\'re absolutely thrilled to hear that you had an amazing experience at our salon. Your satisfaction means everything to us, and we can\'t wait to welcome you back for your next visit!'
    }
  });

  // 5. Update review status (admin only)
  await makeRequest(`/reviews/${reviewId}`, {
    method: 'PUT',
    body: {
      status: 'published',
      verified: true,
      metadata: {
        responded_to: true,
        response_date: new Date().toISOString(),
        moderated: false
      }
    }
  });

  // 6. Get review statistics
  await makeRequest('/reviews/stats');

  // 7. Get recent reviews
  await makeRequest('/reviews/recent', { params: { limit: 10 } });

  // 8. Search reviews
  await makeRequest('/reviews', {
    params: {
      search: 'amazing',
      limit: 10
    }
  });

  // 9. Get reviews by platform
  await makeRequest('/reviews', {
    params: {
      platform: 'google',
      rating: '4,5',
      limit: 15
    }
  });

  // 10. Bulk update reviews (admin only)
  await makeRequest('/reviews/bulk-update', {
    method: 'POST',
    body: {
      review_ids: [reviewId],
      updates: {
        status: 'published',
        verified: true,
        metadata: {
          bulk_updated: true,
          updated_by: 'admin-user-id',
          update_reason: 'quality_review_approval'
        }
      }
    }
  });

  console.log('\nReview API Examples Finished.');
};

export const runServiceExamples = async () => {
  console.log('Starting Service API Examples...');

  let serviceId: string | undefined;

  // 1. Create a new service (admin/owner only)
  try {
    const newService = await makeRequest('/services', {
      method: 'POST',
      body: {
        name: 'Premium Haircut & Styling',
        description: 'A comprehensive haircut experience with professional styling, wash, and blow-dry.',
        category: 'hair',
        price: 85.00,
        duration_minutes: 75,
        is_active: true,
        booking_required: true,
        max_participants: 1,
        prerequisites: 'Please arrive with clean, dry hair for best results.',
        cancellation_policy: '24-hour cancellation notice required for full refund.',
        
        metadata: {
          tags: ['premium', 'styling', 'professional'],
          features: ['wash', 'cut', 'style', 'blow-dry', 'consultation'],
          requirements: ['clean-hair', 'no-extensions'],
          popular: true,
          customizable: true,
          images: [
            {
              url: 'https://example.com/storage/service-images/haircut-1.jpg',
              caption: 'Professional styling session',
              order: 1
            }
          ],
          special_offers: ['first-time-customer-10off'],
        }
      },
    });
    serviceId = newService.data.id;
  } catch (error) {
    console.error('Failed to create service:', error);
    // Try to get an existing service for further operations
    try {
      const servicesList = await makeRequest('/services', { params: { limit: 1 } });
      if (servicesList.data.services && servicesList.data.services.length > 0) {
        serviceId = servicesList.data.services[0].id;
        console.log(`Found existing service: ${serviceId}`);
      } else {
        console.error('No services found. Skipping further examples.');
        return;
      }
    } catch (listError) {
      console.error('Could not find or create service. Exiting examples.');
      return;
    }
  }

  if (!serviceId) {
    console.error('Service ID not available. Exiting examples.');
    return;
  }

  // 2. Get all services with filtering
  await makeRequest('/services', {
    params: {
      category: 'hair',
      is_active: true,
      min_price: 70,
      max_price: 100,
      page: 1,
    limit: 10,
      sort_by: 'price',
      sort_order: 'asc'
    }
  });

  // 3. Get a single service by ID
  await makeRequest(`/services/${serviceId}`);

  // 4. Update service (admin/owner only)
  await makeRequest(`/services/${serviceId}`, {
    method: 'PUT',
    body: {
      name: 'Premium Haircut & Styling - Enhanced',
      price: 95.00,
      description: 'Enhanced premium haircut experience with professional styling, scalp treatment, and luxury products.',
      duration_minutes: 90,
      
      metadata: {
        tags: ['premium', 'luxury', 'styling', 'scalp-treatment'],
        features: ['wash', 'cut', 'style', 'blow-dry', 'consultation', 'scalp-treatment'],
        popular: true,
        customizable: true,
        organic_products: true,
        upgrade: 'from-basic-haircut'
      }
    }
  });

  // 5. Toggle service status
  await makeRequest(`/services/${serviceId}/toggle-status`, {
    method: 'PUT'
  });

  // 6. Get service statistics
  await makeRequest('/services/stats');

  // 7. Get services by category
  await makeRequest('/services/category/hair');

  // 8. Get popular services
  await makeRequest('/services/popular', { params: { limit: 5 } });

  // 9. Search services
  await makeRequest('/services', {
    params: {
      search: 'premium',
      limit: 10
    }
  });

  // 10. Get expensive services
  await makeRequest('/services', {
    params: {
      min_price: 80,
      sort_by: 'price',
      sort_order: 'desc',
      limit: 5
    }
  });

  // 11. Get customizable services
  await makeRequest('/services', {
    params: {
      customizable_only: true,
      limit: 10
    }
  });

  // 12. Bulk update services (owner only)
  await makeRequest('/services/bulk-update', {
    method: 'POST',
    body: {
      service_ids: [serviceId],
      updates: {
        is_active: true,
        metadata: {
          bulk_updated: true,
          updated_by: 'owner-user-id',
          seasonal_update: 'winter_package',
          special_promotion: 'new_year_offer'
        }
      }
    }
  });

  // 13. Reactivate the service for final test
  await makeRequest(`/services/${serviceId}/toggle-status`, {
    method: 'PUT'
  });

  console.log('\nService API Examples Finished.');
};

// Combined example runner
export const runCompleteExamples = async () => {
  try {
    await runServiceExamples();
    await runReviewExamples();
    console.log('\nAll Review & Service API Examples Completed Successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
};
