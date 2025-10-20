import { z } from 'zod';

// Review platforms
export const ReviewPlatforms = ['google', 'yelp', 'facebook', 'trustpilot', 'website', 'internal', 'other'] as const;
export type ReviewPlatformType = typeof ReviewPlatforms[number];

// Review status
export const ReviewStatus = ['published', 'pending', 'rejected', 'spam', 'archived'] as const;
export type ReviewStatusType = typeof ReviewStatus[number];

// Service categories
export const ServiceCategories = ['hair', 'body', 'face', 'massage', 'therapy', 'consultation', 'treatment', 'other'] as const;
export type ServiceCategoryType = typeof ServiceCategories[number];

// Roles for admin access
export const AdminRoles = ['admin', 'owner', 'manager'] as const;
export type AdminRoleType = typeof AdminRoles[number];

// Review rating scale
const ratingSchema = z.number()
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1 star')
  .max(5, 'Rating cannot exceed 5 stars');

// Create review schema
export const createReviewSchema = z.object({
  customer_id: z.string()
    .uuid('Invalid customer ID format')
    .optional()
    .or(z.literal('')),
  
  external_review_id: z.string()
    .max(255, 'External review ID too long')
    .optional(),
  
  platform: z.enum(ReviewPlatforms, {
    errorMap: () => ({ message: 'Invalid review platform' })
  }).optional(),
  
  reviewer_name: z.string()
    .min(1, 'Reviewer name is required')
    .max(100, 'Reviewer name must be less than 100 characters'),
  
  reviewer_email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  
  reviewer_phone: z.string()
    .regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format')
    .optional(),
  
  rating: ratingSchema,
  
  title: z.string()
    .max(200, 'Review title must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  comment: z.string()
    .max(2000, 'Review comment must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  
  status: z.enum(ReviewStatus)
    .optional()
    .default('published'),
  
  verified: z.boolean()
    .optional()
    .default(false),
  
  metadata: z.object({
    source_url: z.string().url().optional(),
    ip_address: z.string().ip().optional(),
    user_agent: z.string().optional(),
    referrer: z.string().optional(),
    collection_method: z.enum(['manual', 'automated', 'api', 'widget']).optional(),
    verified_purchase: z.boolean().optional(),
    purchase_date: z.string().datetime().optional(),
    transaction_id: z.string().optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Update review schema
export const updateReviewSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
  external_review_id: z.string().max(255, 'External review ID too long').optional(),
  platform: z.enum(ReviewPlatforms).optional(),
  reviewer_name: z.string().min(1, 'Reviewer name is required').max(100, 'Reviewer name must be less than 100 characters').optional(),
  reviewer_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  reviewer_phone: z.string().regex(/^[\+]?[1-9][\d\s\-\(\)]{8,}$/, 'Invalid phone number format').optional(),
  rating: ratingSchema.optional(),
  title: z.string().max(200, 'Review title must be less than 200 characters').optional(),
  comment: z.string().max(2000, 'Review comment must be less than 2000 characters').optional(),
  status: z.enum(ReviewStatus).optional(),
  verified: z.boolean().optional(),
  metadata: z.object({
    source_url: z.string().url().optional(),
    ip_address: z.string().ip().optional(),
    user_agent: z.string().optional(),
    referrer: z.string().optional(),
    collection_method: z.enum(['manual', 'automated', 'api', 'widget']).optional(),
    verified_purchase: z.boolean().optional(),
    purchase_date: z.string().datetime().optional(),
    transaction_id: z.string().optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Review response schema
export const reviewResponseSchema = z.object({
  response: z.string()
    .min(1, 'Response is required')
    .max(2000, 'Response must be less than 2000 characters'),
  
  response_by: z.string()
    .uuid('Invalid user ID format')
    .optional()
});

// Create service schema
export const createServiceSchema = z.object({
  external_service_id: z.string()
    .max(255, 'External service ID too long')
    .optional(),
  
  name: z.string()
    .min(1, 'Service name is required')
    .max(100, 'Service name must be less than 100 characters'),
  
  description: z.string()
    .max(1000, 'Service description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  
  category: z.enum(ServiceCategories, {
    errorMap: () => ({ message: 'Invalid service category' })
  }).optional(),
  
  price: z.number()
    .min(0, 'Price cannot be negative')
    .max(100000, 'Price cannot exceed 100,000')
    .multipleOf(0.01, 'Price must have at most 2 decimal places'),
  
  duration_minutes: z.number()
    .int('Duration must be a whole number')
    .min(5, 'Duration must be at least 5 minutes')
    .max(1440, 'Duration cannot exceed 24 hours')
    .optional(),
  
  is_active: z.boolean()
    .optional()
    .default(true),
  
  booking_required: z.boolean()
    .optional()
    .default(true),
  
  max_participants: z.number()
    .int('Max participants must be a whole number')
    .min(1, 'Max participants must be at least 1')
    .max(1000, 'Max participants cannot exceed 1000')
    .optional(),
  
  prerequisites: z.string()
    .max(500, 'Prerequisites must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  cancellation_policy: z.string()
    .max(500, 'Cancellation policy must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  metadata: z.object({
    tags: z.array(z.string()).max(10, 'Too many tags').optional(),
    images: z.array(z.object({
      URL: z.string().url(),
      caption: z.string().max(200).optional(),
      order: z.number().int().min(0).optional()
    })).optional(),
    features: z.array(z.string()).max(20, 'Too many features').optional(),
    requirements: z.array(z.string()).max(20, 'Too many requirements').optional(),
    customizable: z.boolean().optional(),
    popular: z.boolean().optional(),
    seasonal: z.boolean().optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Update service schema
export const updateServiceSchema = z.object({
  external_service_id: z.string().max(255, 'External service ID too long').optional(),
  name: z.string().min(1, 'Service name is required').max(100, 'Service name must be less than 100 characters').optional(),
  description: z.string().max(1000, 'Service description must be less than 1000 characters').optional(),
  category: z.enum(ServiceCategories).optional(),
  price: z.number().min(0, 'Price cannot be negative').max(100000, 'Price cannot exceed 100,000').multipleOf(0.01, 'Price must have at most 2 decimal places').optional(),
  duration_minutes: z.number().int('Duration must be a whole number').min(5, 'Duration must be at least 5 minutes').max(1440, 'Duration cannot exceed 24 hours').optional(),
  is_active: z.boolean().optional(),
  booking_required: z.boolean().optional(),
  max_participants: z.number().int('Max participants must be a whole number').min(1, 'Max participants must be at least 1').max(1000, 'Max participants cannot exceed 1000').optional(),
  prerequisites: z.string().max(500, 'Prerequisites must be less than 500 characters').optional(),
  cancellation_policy: z.string().max(500, 'Cancellation policy must be less than 500 characters').optional(),
  metadata: z.object({
    tags: z.array(z.string()).max(10, 'Too many tags').optional(),
    images: z.array(z.object({
      url: z.string().url(),
      caption: z.string().max(200).optional(),
      order: z.number().int().min(0).optional()
    })).optional(),
    features: z.array(z.string()).max(20, 'Too many features').optional(),
    requirements: z.array(z.string()).max(20, 'Too many requirements').optional(),
    customizable: z.boolean().optional(),
    popular: z.boolean().optional(),
    seasonal: z.boolean().optional(),
    custom: z.record(z.any()).optional()
  }).optional()
});

// Query parameters for getting reviews
export const getReviewsSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  
  // Filtering
  customer_id: z.string().uuid('Invalid customer ID format').optional(),
  platform: z.enum(ReviewPlatforms).optional(),
  status: z.enum(ReviewStatus).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  verified: z.string().transform(val => val === 'true').optional(),
  
  // Response filtering
  has_response: z.string().transform(val => val === 'true').optional(),
  
  // Date filtering
  start_date: z.string().datetime('Invalid start date format').optional(),
  end_date: z.string().datetime('Invalid end date format').optional(),
  
  // Search
  search: z.string().max(100, 'Search term too long').optional(),
  
  // Pagination
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('10'),
  
  // Sorting
  sort_by: z.enum(['created_at', 'rating', 'reviewer_name']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

// Query parameters for getting services
export const getServicesSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  
  // Filtering
  category: z.enum(ServiceCategories).optional(),
  is_active: z.string().transform(val => val === 'true').optional(),
  booking_required: z.string().transform(val => val === 'true').optional(),
  
  // Price filtering
  min_price: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional(),
  max_price: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional(),
  
  // Duration filtering
  min_duration: z.string().regex(/^\d+$/).transform(Number).optional(),
  max_duration: z.string().regex(/^\d+$/).transform(Number).optional(),
  
  // Search
  search: z.string().max(100, 'Search term too long').optional(),
  
  // Pagination
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).default('10'),
  
  // Sorting
  sort_by: z.enum(['name', 'price', 'duration_minutes', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  
  // Additional filters
  popular_only: z.string().transform(val => val === 'true').optional(),
  customizable_only: z.string().transform(val => val === 'true').optional()
});

// Bulk operations
export const bulkUpdateReviewsSchema = z.object({
  review_ids: z.array(z.string().uuid())
    .min(1, 'At least one review ID required')
    .max(100, 'Too many review IDs (max 100)'),
  
  updates: z.object({
    status: z.enum(ReviewStatus).optional(),
    verified: z.boolean().optional(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    custom: z.record(z.any()).optional()
  }).optional()
  })
});

export const bulkUpdateServicesSchema = z.object({
  service_ids: z.array(z.string().uuid())
    .min(1, 'At least one service ID required')
    .max(100, 'Too many service IDs (max 100)'),
  
  updates: z.object({
    is_active: z.boolean().optional(),
    category: z.enum(ServiceCategories).optional(),
    price_modifier: z.number().min(0).max(100).optional(), // percentage change
    metadata: z.object({
      tags: z.array(z.string()).optional(),
      popular: z.boolean().optional(),
      seasonal: z.boolean().optional(),
      custom: z.record(z.any()).optional()
    }).optional()
  })
});

// Statistics schemas
export const reviewStatsSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  start_date: z.string().datetime('Invalid start date format').optional(),
  end_date: z.string().datetime('Invalid end date format').optional(),
  platform: z.enum(ReviewPlatforms).optional()
});

export const serviceStatsSchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  category: z.enum(ServiceCategories).optional(),
  active_only: z.string().transform(val => val === 'true').optional()
});

// Type exports
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewResponseInput = z.infer<typeof reviewResponseSchema>;
export type GetReviewsQuery = z.infer<typeof getReviewsSchema>;
export type BulkUpdateReviews = z.infer<typeof bulkUpdateReviewsSchema>;

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type GetServicesQuery = z.infer<typeof getServicesSchema>;
export type BulkUpdateServices = z.infer<typeof bulkUpdateServicesSchema>;
export type ReviewStatsQuery = z.infer<typeof reviewStatsSchema>;
export type ServiceStatsQuery = z.infer<typeof serviceStatsSchema>;

// Utility functions for reviews and services

export function calculateAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
}

export function generateStarRatingHTML(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let stars = '';
  for (let i = 0; i < fullStars; i++) stars += '★';
  if (hasHalfStar) stars += '☆';
  for (let i = 0; i < emptyStars; i++) stars += '☆';
  
  return stars;
}

export function validateReviewsModeration(content: string): {
  isAppropriate: boolean;
  flaggedWords: string[];
} {
  const inappropriateWords = [
    'scam', 'fraud', 'terrible', 'awful', 'hate', 'worst', 'ripoff'
  ];
  
  const lowercaseContent = content.toLowerCase();
  const flaggedWords = inappropriateWords.filter(word => 
      lowercaseContent.includes(word)
  );
  
  return {
    isAppropriate: flaggedWords.length === 0,
    flaggedWords
  };
}

export function formatServiceDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }
}

export function calculateServicePrice(lowest: number, highest: number): {
  averagePrice: number;
  priceRange: string;
} {
  const averagePrice = (lowest + highest) / 2;
  const priceRange = lowest === highest ? `$${lowest}` : `$${lowest} - $${highest}`;
  
  return {
    averagePrice: Math.round(averagePrice * 100) / 100,
    priceRange
  };
}

export function sanitizeReviewContent(content: string): string {
  // Remove HTML tags
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .trim();
}

export function generateServiceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function calculateReviewStats(reviews: Array<{ rating: number }>): {
  total: number;
  average: number;
  distribution: Record<string, number>;
  percentageWithResponse: number;
} {
  const total = reviews.length;
  const ratings = reviews.map(r => r.rating);
  const average = calculateAverageRating(ratings);
  
  const distribution = [1, 2, 3, 4, 5].reduce((acc, rating) => {
    acc[rating] = ratings.filter(r => r === rating).length;
    return acc;
  }, {} as Record<string, number>);
  
  // Mock response rate calculation (would need actual data)
  const percentageWithResponse = 0; // This would require actual response data
  
  return {
    total,
    average,
    distribution,
    percentageWithResponse
  };
}
