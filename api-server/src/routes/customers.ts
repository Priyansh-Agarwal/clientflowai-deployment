import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, validateQuery } from '../middleware/validation';
import { 
  createCustomerSchema, 
  updateCustomerSchema, 
  getCustomersSchema 
} from '../validation/customerSchemas';

const router = Router();

// All customer routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /customers
 * @desc    Create a new customer
 * @access  Private (authenticated users)
 * @body    { first_name, last_name, email?, phone, address?, notes?, etc. }
 */
router.post('/', 
  validateRequest(createCustomerSchema),
  CustomerController.createCustomer
);

/**
 * @route   GET /customers
 * @desc    Get paginated list of customers with search and filtering
 * @access  Private (authenticated users)
 * @query   search?, page?, limit?, sort_by?, sort_order?, status?, business_id? (auto-added)
 */
router.get('/', 
  validateQuery(getCustomersSchema),
  CustomerController.getCustomers
);

/**
 * @route   GET /customers/:id
 * @desc    Get a single customer by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', 
  CustomerController.getCustomerById
);

/**
 * @route   PUT /customers/:id
 * @desc    Update a customer
 * @access  Private (authenticated users)
 * @body    { first_name?, last_name?, email?, phone?, address?, notes?, etc. }
 */
router.put('/:id', 
  validateRequest(updateCustomerSchema),
  CustomerController.updateCustomer
);

/**
 * @route   DELETE /customers/:id
 * @desc    Delete a customer
 * @access  Private (authenticated users)
 */
router.delete('/:id', 
  CustomerController.deleteCustomer
);

export default router;
