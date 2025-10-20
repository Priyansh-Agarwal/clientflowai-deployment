# Review & Service Management API

Comprehensive REST API for managing customer reviews and business services with Supabase integration, role-based access control, automated content moderation, and comprehensive analytics.

## 🎯 Features

### Review Management
- **Review Creation**: Customer reviews with ratings, comments, and metadata
- **Content Moderation**: Automatic inappropriate content detection
- **Review Responses**: Business owner/manager responses to reviews
- **Multi-Platform Support**: Google, Yelp, Facebook, Trustpilot, website reviews
- **Advanced Filtering**: Search by rating, platform, status, response status
- **Review Analytics**: Rating distribution, platform breakdown, response rates

### Service Management
- **Service Catalog**: Complete service management with pricing and duration
- **Category Organization**: Organize services by categories (hair, massage, therapy, etc.)
- **Availability Management**: Toggle service active/inactive status
- **Pricing Control**: Flexible pricing with promotional capabilities
- **Service Metadata**: Rich service information including prerequisites and policies

### Access Control
- **Role-Based Authorization**: Admin/owner-only operations with Supabase functions
- **Business Isolation**: Row Level Security ensures data privacy
- **Granular Permissions**: Different access levels for different operations
- **Audit Trails**: Complete logging of all review and service operations

---

## 🔐 Access Control & Authorization

### Role Hierarchy
1. **Owner**: Full access to all operations (delete services/reviews)
2. **Admin**: Most operations except permanent deletion
3. **Manager**: Limited operations (create, update, moderate)
4. **User**: Read-only access to public data

### Key Authorization Rules
- **Review Creation**: Any authenticated user
- **Review Response**: Admin/owner only 
- **Review Deletion**: Owner only
- **Service Creation**: Admin/owner only
- **Service Deletion**: Owner only
- **Bulk Operations**: Appropriate role-based restrictions

---

## 📝 Review Management Endpoints

### Authentication
```http
Authorization: Bearer <your-supabase-jwt-token>
```

---

### **1. Create Review**
```http
POST /api/reviews
Content-Type: application/json
Authorization: Bearer <token>

{
  "customer_id": "uuid-of-customer",              // Optional: Link to existing customer
  "reviewer_name": "John Doe",                    // Required: Name of reviewer
  "reviewer_email": "john@example.com",          // Optional: Contact information
  "reviewer_phone": "+1234567890",                // Optional: Phone number
  "rating": 5,                                    // Required: 1-5 stars
  "title": "Excellent service!",                  // Optional: Review title
  "comment": "Had a great experience at this salon...", // Optional: Detailed review
  "platform": "google",                           // Optional: google, yelp, facebook, trustpilot, website
  "verified": true,                               // Optional: mark as verified purchase
  "status": "published",                          // Optional: published, pending, rejected, spam
  "metadata": {                                   // Optional: Additional data
    "source_url": "https://maps.google.com/reviews/123",
    "verified_purchase": true,
    "purchase_date": "2024-01-15T00:00:00Z",
    "transaction_id": "txn_1234567890"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": "review-uuid",
    "business_id": "business-uuid",
    "reviewer_name": "John Doe",
    "reviewer_email": "john@example.com",
    "rating": 5,
    "title": "Excellent service!",
    "comment": "Had a great experience at this salon...",
    "response": null,
    "response_date": null,
    "response_by": null,
    "platform": "google",
    "verified": true,
    "status": "published",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### **2. Get Reviews with Advanced Filtering**
```http
GET /api/reviews?rating=4&platform=google&has_response=true&search=excellent&page=1&limit=20&sort_by=created_at&sort_order=desc
Authorization: Bearer <token>
```

**Query Parameters:**
- `customer_id` - Filter by specific customer
- `platform` - Filter by platform (google, yelp, facebook, trustpilot, website, internal)
- `rating` - Filter by rating (1-5)
- `status` - Filter by status (published, pending, rejected, spam, archived)
- `verified` - true/false for verified reviews
- `has_response` - true/false filtering for reviews with responses
- `start_date` / `end_date` - Date range filtering
- `search` - Search in reviewer names and comments
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort_by` - Sort field (created_at, rating, reviewer_name)
- `sort_order` - Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review-uuid-1",
        "reviewer_name": "Jane Smith",
        "rating": 5,
        "platform": "google",
        "verified": true,
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 47,
      "per_page": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### **3. Respond to Review (Admin/Owner Only)**
```http
PUT /api/reviews/{review-id}/respond
Content-Type: application/json
Authorization: Bearer <token>

{
  "response": "Thank you for the wonderful review! We're so glad you enjoyed your experience with us. We look forward to seeing you again soon!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review response added successfully",
  "data": {
    "id": "review-uuid",
    "response": "Thank you for the wonderful review!...",
    "response_date": "2024-01-15T12:00:00Z",
    "response_by": "user-uuid",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### **4. Update Review (Admin Only)**
```http
PUT /api/reviews/{review-id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "published",
  "verified": true,
  "metadata": {
    "moderated_by": "moderator-uuid",
    "moderation_date": "2024-01-15T11:00:00Z"
  }
}
```

### **5. Get Review Statistics**
```http
GET /api/reviews/stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalReviews": 127,
    "averageRating": 4.3,
    "ratingDistribution": {
      "5": 68,
      "4": 32,
      "3": 15,
      "2": 8,
      "1": 4
    },
    "platformBreakdown": {
      "google": 45,
      "website": 38,
      "yelp": 28,
      "facebook": 16
    },
    "statusBreakdown": {
      "published": 115,
      "pending": 8,
      "rejected": 3,
      "spam": 1
    },
    "responseRate": 78.5
  }
}
```

### **6. Bulk Update Reviews (Admin Only)**
```http
POST /api/reviews/bulk-update
Content-Type: application/json
Authorization: Bearer <token>

{
  "review_ids": ["review-uuid-1", "review-uuid-2", "review-uuid-3"],
  "updates": {
    "status": "published",
    "verified": true,
    "metadata": {
      "bulk_update": true,
      "updated_by": "admin-uuid"
    }
  }
}
```

---

## 🛠️ Service Management Endpoints

### **7. Create Service (Admin/Owner Only)**
```http
POST /api/services
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Premium Haircut & Style",             // Required: Service name
  "description": "A full haircut with professional styling", // Optional: Service description
  "category": "hair",                           // Optional: hair, body, face, massage, therapy, consultation, treatment
  "price": 75.00,                               // Required: Service price
  "duration_minutes": 60,                       // Optional: Service duration
  "is_active": true,                             // Optional: Service availability
  "booking_required": true,                      // Optional: Requires advance booking
  "max_participants": 1,                        // Optional: Maximum participants
  "prerequisites": "Please come with clean, dry hair", // Optional: Requirements
  "cancellation_policy": "24 hours notice required", // Optional: Cancellation terms
  "metadata": {                                  // Optional: Rich service data
    "tags": ["premium", "luxury", "styling"],
    "features": ["wash", "cut", "style", "blow-dry"],
    "requirements": ["clean-hair", "no-extensions"],
    "popular": true,
    "customizable": true,
    "images": [
      {
        "url": "https://storage-url/service-image-1.jpg",
        "caption": "Professional styling in progress",
        "order": 1
      }
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "service-uuid",
    "business_id": "business-uuid",
    "name": "Premium Haircut & Style",
    "description": "A full haircut with professional styling",
    "category": "hair",
    "price": 75.00,
    "duration_minutes": 60,
    "is_active": true,
    "booking_required": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### **8. Get Services with Filtering**
```http
GET /api/services?category=hair&is_active=true&min_price=50&max_price=100&search=premium&page=1&limit=15&sort_by=name&sort_order=asc
Authorization: Bearer <token>
```

**Query Parameters:**
- `category` - Filter by category (hair, body, face, massage, therapy, etc.)
- `is_active` - true/false for active services
- `booking_required` - true/false for services requiring booking
- `min_price` / `max_price` - Price range filtering
- `min_duration` / `max_duration` - Duration filtering
- `search` - Search in service names and descriptions
- `popular_only` - true/false for popular services
- `customizable_only` - true/false for customizable services
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort_by` - Sort field (name, price, duration_minutes, created_at)
- `sort_order` - Sort direction (asc, desc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "service-uuid-1",
        "name": "Premium Haircut & Style",
        "description": "A full haircut with professional styling",
        "category": "hair",
        "price": 75.00,
        "duration_minutes": 60,
        "is_active": true,
        "booking_required": true,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_count": 23,
      "per_page": 15,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### **9. Update Service (Admin/Owner Only)**
```http
PUT /api/services/{service-id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Premium Haircut & Style - Updated",
  "price": 85.00,
  "description": "Enhanced haircut package with premium products",
  "duration_minutes": 75,
  "metadata": {
    "tags": ["premium", "luxury", "organic"],
    "popular": true,
    "customizable": true
  }
}
```

### **10. Toggle Service Status**
```http
FET /api/services/{service-id}/toggle-status
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Service deactivated successfully",
  "data": {
    "id": "service-uuid",
    "is_active": false,
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### **11. Get Service Statistics**
```http
GET /api/services/stats
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalServices": 23,
    "activeServices": 20,
    "categoryBreakdown": {
      "hair": 12,
      "massage": 6,
      "body": 3,
      "face": 2
    },
    "averagePrice": 65.50,
    "priceRange": {
      "min": 25.00,
      "max": 150.00
    },
    "averageDuration": 62
  }
}
```

### **12. Get Services by Category**
```http
GET /api/services/category/hair
Authorization: Bearer <token>
```

### **13. Get Popular Services**
```http
GET /api/services/popular?limit=10
Authorization: Bearer <token>
```

### **14. Bulk Update Services (Owner Only)**
```http
POST /api/services/bulk-update
Content-Type: application/json
Authorization: Bearer <token>

{
  "service_ids": ["service-uuid-1", "service-uuid-2", "service-uuid-3"],
  "updates": {
    "is_active": true,
    "metadata": {
      "bulk_update": true,
      "updated_by": "owner-uuid",
      "special_offer": true
    }
  }
}
```

### **15. Delete Service (Owner Only)**
```http
DELETE /api/services/{service-id}
Authorization: Bearer <token>
```

---

## 📊 Review Moderation & Content Filtering

### Automated Content Moderation
The API includes automatic content moderation for review comments:

```typescript
// Example of moderation detection
const moderation = validateReviewsModeration(reviewComment);
if (!moderation.isAppropriate) {
  // Auto-flag for manual review
  reviewData.status = 'pending';
  reviewData.metadata.moderation = {
    flagged_words: moderation.flaggedWords,
    auto_review: true,
    reviewed_at: new Date().toISOString()
  };
}
```

### Content Validation
- **Profanity Detection**: Automatic inappropriate content filtering
- **Spam Prevention**: Duplicate content and repetitive text detection
- **Quality Scoring**: Content quality assessment based on length, relevance
- **Manual Review Flags**: Automatic flagging for manual moderation

---

## 🔧 Advanced Features

### **Review Response Templates**
```javascript
// Pre-defined response templates for common review situations
const responseTemplates = {
  positive_review: "Thank you so much for the wonderful review! We're thrilled you enjoyed [service_type]. Looking forward to seeing you again soon!",
  
  constructive_feedback: "Thank you for taking the time to share your feedback. We appreciate your input and will use it to improve our services. Please contact us directly to discuss your concerns.",
  
  service_recommendation: "We're glad you enjoyed [service_type]! Have you tried our [recommended_service]? It's perfect for your next visit and available for booking."
};
```

### **Service Pricing Strategies**
```javascript
// Dynamic pricing calculations
const calculateServicePrice = (basePrice, modifiers) => {
  const adjustedPrice = modifiers.reduce((price, modifier) => {
    switch(modifier.type) {
      case 'duration_extended': return price * 1.5;
      case 'premium_day': return price * 1.2;
      case 'seasonal': return price * 0.9;
      default: return price;
    }
  }, basePrice);
  
  return Math.round(adjustedPrice * 100) / 100;
};
```

### **Review Analytics Dashboard**
```javascript
// Comprehensive analytics for business insights
const reviewAnalytics = {
  trendingTopics: extractTrendingTopics(reviews),
  sentimentAnalysis: analyzeReviewSentiment(reviews),
  responseEffectiveness: calculateResponseImpact(reviews),
  competitorAnalysis: compareToIndustryAverage(reviews),
  customerSatisfactionCorrelation: analyzeServiceCorrelation(reviews, bookings)
};
```

---

## 📱 Usage Examples

### **Complete Review Lifecycle**
```javascript
// 1. Create a review
const newReview = await fetch('/api/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    reviewer_name: 'Sarah Johnson',
    rating: 5,
    comment: 'Absolutely amazing service!',
    platform: 'website',
    verified: true
  })
});

// 2. Respond to review (admin/owner)
const reviewResponse = await fetch(`/api/reviews/${reviewId}/respond`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    response: 'Thank you Sarah! We\'re so glad you enjoyed your visit with us.'
  })
});

// 3. Get review statistics
const stats = await fetch('/api/reviews/stats', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});
```

### **Service Management Workflow**
```javascript
// 1. Create services (admin/owner)
const newService = await fetch('/api/services', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    name: 'Deep Cleansing Facial',
    category: 'face',
    price: 120.00,
    duration_minutes: 90,
    description: 'Comprehensive facial treatment with deep cleansing',
    booking_required: true
  })
});

// 2. Update service pricing
const updatedService = await fetch(`/api/services/${serviceId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    price: 135.00,
    metadata: {
      tags: ['luxury', 'cleansing', 'premium'],
      features: ['extraction', 'masks', 'moisturizing']
    }
  })
});

// 3. Toggle service availability
const toggledService = await fetch(`/api/services/${serviceId}/toggle-status`, {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});
```

### **Advanced Filtering Examples**
```javascript
// Get high-quality reviews from verified customers
const verifiedReviews = await fetch('/api/reviews?verified=true&rating=4,5&platform=website,google&limit=10', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// Get active hair services under $100
const hairServices = await fetch('/api/services?category=hair&is_active=true&max_price=100&popular_only=true', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});

// Get recent reviews requiring responses
const reviewsNeedingResponse = await fetch('/api/reviews?has_response=false&status=published&sort_by=created_at&sort_order=desc', {
  headers: { 'Authorization': 'Bearer your-jwt-token' }
});
```

---

## 🚀 Getting Started

### **Environment Setup**
```bash
# Install required dependencies
npm install zod express dotenv

# Set environment variables
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **Database Migration**
Ensure your Supabase database has the following tables:
- `reviews` (with reviews schema as defined)
- `services` (with services schema as defined)
- `business_members` (for role-based access control)
- Proper Row Level Security (RLS) policies

### **Testing Endpoints**
```bash
# Health check
curl http://localhost:3001/health

# Create review
curl -X POST http://localhost:3001/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"reviewer_name":"Test User","rating":5,"comment":"Great service!"}'

# Get services
curl http://localhost:3001/api/services \
  -H "Authorization: Bearer your-token"
```

This comprehensive API provides enterprise-level review and service management with automated moderation, role-based access control, and rich analytics capabilities perfect for service-based businesses requiring customer feedback management and service catalog administration.
