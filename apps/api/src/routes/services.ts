import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { authenticateToken } from '../middleware/auth';
import { requireAdminAccess, requireOwnerAccess } from '../middleware/adminAuth';
import { validateRequest, validateQuery } from '../middleware/validation';
import { 
  createServiceSchema,
  updateServiceSchema,
  getServicesSchema,
  bulkUpdateServicesSchema
} from '../validation/reviewServiceSchemas';

const router = Router();

/**
 * @route   POST /services
 * @desc    Create a new service
 * @access  Private (admin/owner only)
 * @body    { name, description?, category?, price, duration_minutes?, is_active?, booking_required?, max_participants?, prerequisites?, cancellation_policy?, metadata? }
 */
router.post('/', 
  authenticateToken,
  requireAdminAccess,
  validateRequest(createServiceSchema),
  ServiceController.createService
);

/**
 * @route   GET /services
 * @desc    Get paginated list of services with filtering
 * @access  Private (authenticated users)
 * @query   category?, is_active?, booking_required?, min_price?, max_price?, min_duration?, max_duration?, search?, popular_only?, customizable_only?, page?, limit?, sort_by?, sort_order?
 */
router.get('/', 
  authenticateToken,
  validateQuery(getServicesSchema),
  ServiceController.getServices
);

/**
 * @route   GET /services/stats
 * @desc    Get service statistics
 * @access  Private (authenticated users)
 */
router.get('/stats',
  authenticateToken,
  ServiceController.getServiceStats
);

/**
 * @route   GET /services/category/:category
 * @desc    Get services filtered by category
 * @access  Private (authenticated users)
 */
router.get('/category/:category',
  authenticateToken,
  ServiceController.getServicesByCategory
);

/**
 * @route   GET /services/popular
 * @desc    Get popular services
 * @access  Private (authenticated users)
 * @query   limit?
 */
router.get('/popular',
  authenticateToken,
  ServiceController.getPopularServices
);

/**
 * @route   GET /services/:id
 * @desc    Get a single service by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', 
  authenticateToken,
  ServiceController.getServiceById
);

/**
 * @route   PUT /services/:id
 * @desc    Update a service (admin only)
 * @access  Private (admin/owner)
 * @body    { name?, description?, category?, price?, duration_minutes?, is_active?, booking_required?, max_participants?, prerequisites?, cancellation_policy?, metadata? }
 */
router.put('/:id', 
  authenticateToken,
  requireAdminAccess,
  validateRequest(updateServiceSchema),
  ServiceController.updateService
);

/**
 * @route   PUT /services/:id/toggle-status
 * @desc    Toggle service active/inactive status
 * @access  Private (admin/owner)
 */
router.put('/:id/toggle-status',
  authenticateToken,
  requireAdminAccess,
  ServiceController.toggleServiceStatus
);

/**
 * @route   POST /services/bulk-update
 * @desc    Bulk update services (owner only)
 * @access  Private (owner only)
 * @body    { service_ids: string[], updates: { is_active?, category?, price_modifier?, metadata? } }
 */
router.post('/bulk-update',
  authenticateToken,
  requireOwnerAccess,
  validateRequest(bulkUpdateServicesSchema),
  ServiceController.bulkUpdateServices
);

/**
 * @route   DELETE /services/:id
 * @desc    Delete a service (owner only)
 * @access  Private (owner only)
 */
router.delete('/:id', 
  authenticateToken,
  requireOwnerAccess,
  ServiceController.deleteService
);

export default router;
