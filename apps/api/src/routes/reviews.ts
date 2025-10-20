import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';
import { requireAdminAccess, requireOwnerAccess } from '../middleware/adminAuth';
import { validateRequest, validateQuery } from '../middleware/validation';
import { 
  createReviewSchema,
  updateReviewSchema,
  reviewResponseSchema,
  getReviewsSchema,
  bulkUpdateReviewsSchema
} from '../validation/reviewServiceSchemas';

const router = Router();

/**
 * @route   POST /reviews
 * @desc    Create a new review
 * @access  Public (authenticated users)
 * @body    { business_id, customer_id, reviewer_name, rating, comment?, platform?, status?, verified? }
 */
router.post('/', 
  authenticateToken,
  validateRequest(createReviewSchema),
  ReviewController.createReview
);

/**
 * @route   GET /reviews
 * @desc    Get paginated list of reviews with filtering
 * @access  Private (authenticated users)
 * @query   customer_id?, platform?, status?, rating?, verified?, has_response?, start_date?, end_date?, search?, page?, limit?, sort_by?, sort_order?
 */
router.get('/', 
  authenticateToken,
  validateQuery(getReviewsSchema),
  ReviewController.getReviews
);

/**
 * @route   POST /reviews/stats
 * @desc    Get review statistics
 * @access  Private (authenticated users)
 */
router.get('/stats',
  authenticateToken,
  ReviewController.getReviewStats
);

/**
 * @route   GET /reviews/recent
 * @desc    Get recent reviews for dashboard
 * @access  Private (authenticated users)
 * @query   limit?
 */
router.get('/recent',
  authenticateToken,
  ReviewController.getRecentReviews
);

/**
 * @route   GET /reviews/:id
 * @desc    Get a single review by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', 
  authenticateToken,
  ReviewController.getReviewById
);

/**
 * @route   PUT /reviews/:id
 * @desc    Update a review (admin only)
 * @access  Private (admin/owner)
 * @body    { reviewer_name?, rating?, comment?, status?, verified?, metadata? }
 */
router.put('/:id', 
  authenticateToken,
  requireAdminAccess,
  validateRequest(updateReviewSchema),
  ReviewController.updateReview
);

/**
 * @route   PUT /reviews/:id/respond
 * @desc    Add response to a review (admin/owner only)
 * @access  Private (admin/owner)
 * @body    { response: string }
 */
router.put('/:id/respond',
  authenticateToken,
  requireAdminAccess,
  validateRequest(reviewResponseSchema),
  ReviewController.respondToReview
);

/**
 * @route   POST /reviews/bulk-update
 * @desc    Bulk update reviews (admin only)
 * @access  Private (admin/owner)
 * @body    { review_ids: string[], updates: { status?, verified?, metadata? } }
 */
router.post('/bulk-update',
  authenticateToken,
  requireAdminAccess,
  validateRequest(bulkUpdateReviewsSchema),
  ReviewController.bulkUpdateReviews
);

/**
 * @route   DELETE /reviews/:id
 * @desc    Delete a review (owner only)
 * @access  Private (owner only)
 */
router.delete('/:id', 
  authenticateToken,
  requireOwnerAccess,
  ReviewController.deleteReview
);

export default router;
