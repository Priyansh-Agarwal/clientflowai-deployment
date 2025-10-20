import { Request, Response } from 'express';
import { ReviewService } from '../services/reviewService';
import { CreateReviewInput, UpdateReviewInput, ReviewResponseInput, GetReviewsQuery } from '../validation/reviewServiceSchemas';

export class ReviewController {
  /**
   * Create a new review
   */
  static async manageReview(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;

      if (req.method === 'POST') {
        const reviewData: CreateReviewInput = req.body;

        // Validate required fields
        if (!reviewData.reviewer_name || !reviewData.rating) {
          res.status(400).json({
            error: 'Validation failed',
            message: 'Reviewer name and rating are required'
          });
          return;
        }

        const review = await ReviewService.createReview(businessId, reviewData);

        res.status(201).json({
          success: true,
          message: 'Review created successfully',
          data: review
        });
      } else if (req.method === 'GET') {
        const filters: GetReviewsQuery = req.query;
        
        // Ensure reasonable limits
        const limit = Math.min(filters.limit || 10, 100);
        const page = Math.max(filters.page || 1, 1);

        const filterParams = {
          customer_id: filters.customer_id,
          platform: filters.platform,
          status: filters.status,
          rating: filters.rating,
          verified: filters.verified,
          has_response: filters.has_response,
          start_date: filters.start_date,
          end_date: filters.end_date,
          search: filters.search,
          page,
          limit,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order as 'asc' | 'desc',
        };

        const result = await ReviewService.getReviews(businessId, filterParams);

        res.status(200).json({
          success: true,
          data: {
            reviews: result.reviews,
            pagination: {
              current_page: result.page,
              total_pages: result.totalPages,
              total_count: result.total,
              per_page: limit,
              has_next: result.page < result.totalPages,
              has_prev: result.page > 1,
            }
          }
        });
      }
    } catch (error) {
      console.error('Review management error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Review not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Validation failed') || error.message.includes('Invalid')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process review request'
      });
    }
  }

  /**
   * Update a review (admin only)
   */
  static async updateReview(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid review ID',
          message: 'Review ID must be a valid UUID'
        });
        return;
      }

      const updateData: UpdateReviewInput = req.body;

      const review = await ReviewService.updateReview(id, businessId, updateData);

      res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: review
      });
    } catch (error) {
      console.error('Update review error:', error);

      if (error instanceof Error) {
        if (error.message.includes('review not found')) {
          res.status(404).json({
            error: 'Not found',
            message: 'Review not found'
          });
          return;
        }
        if (error.message.includes('Validation failed')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update review'
      });
    }
  }

  /**
   * Add response to review (admin/owner only)
   */
  static async respondToReview(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required'
        });
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid review ID',
          message: 'Review ID must be a valid UUID'
        });
        return;
      }

      const { response }: ReviewResponseInput = req.body;

      if (!response || response.trim().length === 0) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Response content is required'
        });
        return;
      }

      const updatedReview = await ReviewService.respondToReview(id, businessId, response, userId);

      res.status(200).json({
        success: true,
        message: 'Review response added successfully',
        data: updatedReview
      });
    } catch (error) {
      console.error('Response to review error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Review not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Validation failed')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to respond to review'
      });
    }
  }

  /**
   * Get review statistics
   */
  static async getReviewStats(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;

      const stats = await ReviewService.getReviewStats(businessId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get review stats error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch review statistics'
      });
    }
  }

  /**
   * Get single review by ID
   */
  static async getReviewById(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid review ID',
          message: 'Review ID must be a valid UUID'
        });
        return;
      }

      const review = await ReviewService.getReviewById(id, businessId);

      res.status(200).json({
        success: true,
        data: review
      });
    } catch (error) {
      console.error('Get review by ID error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Review not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch review'
      });
    }
  }

  /**
   * Bulk operations on reviews (admin only)
   */
  static async bulkUpdateReviews(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { review_ids, updates } = req.body;

      if (!review_ids || !Array.isArray(review_ids) || review_ids.length === 0) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'review_ids must be a non-empty array'
        });
        return;
      }

      if (review_ids.length > 100) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Cannot update more than 100 reviews at once'
        });
        return;
      }

      const updatedCount = await ReviewService.bulkUpdateReviews(businessId, review_ids, updates);

      res.status(200).json({
        success: true,
        message: `Successfully updated ${updatedCount} reviews`,
        data: { updated_count: updatedCount }
      });
    } catch (error) {
      console.error('Bulk update reviews error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to bulk update reviews'
      });
    }
  }

  /**
   * Delete review (owner only)
   */
  static async deleteReview(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid review ID',
          message: 'Review ID must be a valid UUID'
        });
        return;
      }

      await ReviewService.deleteReview(id, businessId);

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      console.error('Delete review error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Review not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete review'
      });
    }
  }

  /**
   * Get recent reviews
   */
  static async getRecentReviews(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const reviews = await ReviewService.getRecentReviews(businessId, limit);

      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error) {
      console.error('Get recent reviews error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch recent reviews'
      });
    }
  }
}
