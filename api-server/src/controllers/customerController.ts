import { Request, Response } from 'express';
import { CustomerService } from '../services/customerService';
import { CreateCustomerInput, UpdateCustomerInput, GetCustomersQuery } from '../validation/customerSchemas';

export class CustomerController {
  /**
   * POST /customers - Create a new customer
   */
  static async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const customerData: CreateCustomerInput = req.body;

      // Format phone number
      const formattedPhone = CustomerService.formatPhoneNumber(customerData.phone);

      // Check if customer with this phone already exists
      const exists = await CustomerService.checkCustomerExists(formattedPhone, businessId);
      if (exists) {
        res.status(409).json({
          error: 'Customer already exists',
          message: 'A customer with this phone number already exists'
        });
        return;
      }

      // Prepare customer data for insertion
      const insertData = {
        ...customerData,
        phone: formattedPhone,
        phone_formatted: formattedPhone,
      };

      const customer = await CustomerService.createCustomer(businessId, insertData);

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Customer with this phone number already exists')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Invalid phone number')) {
          res.status(400).json({
            error: 'Invalid input',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create customer'
      });
    }
  }

  /**
   * GET /customers - Get paginated list of customers with search and filtering
   */
  static async getCustomers(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const query: GetCustomersQuery = (req as any).validatedQuery;

      // Ensure we don't exceed reasonable limits
      const limit = Math.min(query.limit, 100);
      const page = Math.max(query.page, 1);

      const filters = {
        search: query.search,
        page,
        limit,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
        status: query.status,
      };

      const result = await CustomerService.getCustomers(businessId, filters);

      res.status(200).json({
        success: true,
        data: {
          customers: result.customers,
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
    } catch (error) {
      console.error('-get customers error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch customers'
      });
    }
  }

  /**
   * GET /customers/:id - Get a single customer by ID
   */
  static async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid customer ID',
          message: 'Customer ID must be a valid UUID'
        });
        return;
      }

      const customer = await CustomerService.getCustomerById(id, businessId);

      res.status(200).json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Get customer by ID error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Customer not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch customer'
      });
    }
  }

  /**
   * PUT /customers/:id - Update a customer
   */
  static async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;
      const updateData: UpdateCustomerInput = req.body;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid customer ID',
          message: 'Customer ID must be a valid UUID'
        });
        return;
      }

      // Format phone number if provided
      if (updateData.phone) {
        updateData.phone = CustomerService.formatPhoneNumber(updateData.phone);
        updateData.phone_formatted = updateData.phone;
      }

      const customer = await CustomerService.updateCustomer(id, businessId, updateData);

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer
      });
    } catch (error) {
      console.error('Update customer error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Customer not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Customer with this phone number already exists')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Invalid phone number')) {
          res.status(400).json({
            error: 'Invalid input',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update customer'
      });
    }
  }

  /**
   * DELETE /customers/:id - Delete a customer
   */
  static async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid customer ID',
          message: 'Customer ID must be a valid UUID'
        });
        return;
      }

      await CustomerService.deleteCustomer(id, businessId);

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      console.error('Delete customer error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Customer not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete customer'
      });
    }
  }
}
