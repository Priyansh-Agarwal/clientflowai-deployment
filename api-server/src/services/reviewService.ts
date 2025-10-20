import { supabase } from '../config/supabase';
import { Review, ReviewInsert, ReviewUpdate } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';
import { calculateAverageRating, validateReviewsModeration } from '../validation/reviewServiceSchemas';

export class ReviewService {
  /**
   * Create a new review
   */
  static async createReview(businessId: string, reviewData: ReviewInsert): Promise<Review> {
    try {
      // Validate content for appropriateness
      if (reviewData.comment) {
        const moderation = validateReviewsModeration(reviewData.comment);
        if (!moderation.isAppropriate) {
          // Set status to pending if inappropriate content is detected
          reviewData.status = 'pending';
          reviewData.metadata = {
            ...reviewData.metadata,
            moderation: {
              flagged_words: moderation.flaggedWords,
              auto_review: true,
              reviewed_at: new Date().toISOString()
            }
          };
        }
      }

      // Add business_id and prepare data for insertion
      const insertData: ReviewInsert = {
        ...reviewData,
        business_id: businessId,
        status: reviewData.status || 'published',
        verified: reviewData.verified || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('reviews')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create review: ${error.message}`);
      }

      // Update business review statistics
      await this.updateBusinessReviewStats(businessId);

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update a review
   */
  static async updateReview(
    reviewId: string,
    businessId: string,
    updateData: ReviewUpdate
  ): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Review not found');
        }
        throw new Error(`Failed to update review: ${error.message}`);
      }

      // Update business review statistics
      await this.updateBusinessReviewStats(businessId);

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Add response to a review (admin/owner only)
   */
  static async respondToReview(
    reviewId: string,
    businessId: string,
    response: string,
    responseBy: string
  ): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          response,
          response_by: responseBy,
          response_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Review not found');
        }
        throw new Error(`Failed to respond to review: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get reviews with filtering and pagination
   */
  static async getReviews(
    businessId: string,
    filters: {
      customer_id?: string;
      platform?: string;
      status?: string;
      rating?: number;
      verified?: boolean;
      has_response?: boolean;
      start_date?: string;
      end_date?: string;
      search?: string;
      page: number;
      limit: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): Promise<{ reviews: Review[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        customer_id,
        platform,
        status,
        rating,
        verified,
        has_response,
        start_date,
        end_date,
        search,
        page,
        limit,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = filters;
      
      // Start building the query
      let query = supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Apply filters
      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }
      
      if (platform) {
        query = query.eq('platform', platform);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (rating !== undefined) {
        query = query.eq('rating', rating);
      }
      
      if (verified !== undefined) {
        query = query.eq('verified', verified);
      }

      if (has_response !== undefined) {
        if (has_response) {
          query = query.not('response', 'is', null);
        } else {
          query = query.is('response', null);
        }
      }

      // Date filtering
      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      if (end_date) {
        query = query.lte('created_at', end_date);
      }

      // Search functionality
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`reviewer_name.ilike.${searchTerm},comment.ilike.${searchTerm}`);
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch reviews: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        reviews: data || [],
        total: count || 0,
        page,
        totalPages,
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get a single review by ID
   */
  static async getReviewById(reviewId: string, businessId: string): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Review not found');
        }
        throw new Error(`Failed to fetch review: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  static async getReviewStats(businessId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
    platformBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    responseRate: number;
  }> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating, platform, status, response')
        .eq('business_id', businessId)
        .eq('status', 'published'); // Only published reviews for stats

      if (error) {
        throw new Error(`Failed to fetch review statistics: ${error.message}`);
      }

      const totalReviews = reviews.length;
      const ratings = reviews.map(r => r.rating);
      const averageRating = calculateAverageRating(ratings);

      // Rating distribution
      const ratingDistribution: Record<string, number> = [1, 2, 3, 4, 5].reduce((acc, rating) => {
        acc[rating] = ratings.filter(r => r === rating).length;
        return acc;
      }, {} as Record<string, number>);

      // Platform breakdown
      const platformBreakdown: Record<string, number> = {};
      reviews.forEach(review => {
        if (review.platform) {
          platformBreakdown[review.platform] = (platformBreakdown[review.platform] || 0) + 1;
        }
      });

      // Status breakdown
      const statusBreakdown: Record<string, number> = {};
      reviews.forEach(review => {
        if (review.status) {
          statusBreakdown[review.status] = (statusBreakdown[review.status] || 0) + 1;
        }
      });

      // Response rate
      const reviewedWithResponse = reviews.filter(r => r.response).length;
      const responseRate = totalReviews > 0 ? (reviewedWithResponse / totalReviews) * 100 : 0;

      return {
        totalReviews,
        averageRating,
        ratingDistribution,
        platformBreakdown,
        statusBreakdown,
        responseRate: Math.round(responseRate * 10) / 10, // Round to 1 decimal
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Bulk update reviews (admin only)
   */
  static async bulkUpdateReviews(
    businessId: string,
    reviewIds: string[],
    updates: Partial<ReviewUpdate>
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .in('id', reviewIds)
        .eq('business_id', businessId)
        .select('id');

      if (error) {
        throw new Error(`Failed to bulk update reviews: ${error.message}`);
      }

      // Update business review statistics
      await this.updateBusinessReviewStats(businessId);

      return data?.length || 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete review (admin only)
   */
  static async deleteReview(reviewId: string, businessId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to delete review: ${error.message}`);
      }

      // Update business review statistics
      await this.updateBusinessReviewStats(businessId);
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update business review statistics in businesses table
   */
  private static async updateBusinessReviewStats(businessId: string): Promise<void> {
    try {
      // Get current review stats
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('business_id', businessId)
        .eq('status', 'published');

      const ratings = reviews?.map(r => r.rating) || [];
      const totalReviews = ratings.length;
      const averageRating = calculateAverageRating(ratings);

      // Update business record
      await supabase
        .from('businesses')
        .update({
          total_reviews: totalReviews,
          average_rating: averageRating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);
    } catch (error) {
      console.error('Failed to update business review stats:', error);
      // Don't throw error for stats update failure
    }
  }

  /**
   * Get recent reviews for dashboard
   */
  static async getRecentReviews(businessId: string, limit: number = 10): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent reviews: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}
