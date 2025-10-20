import { Request, Response } from 'express';
import { ServiceService } from '../services/serviceService';
import { CreateServiceInput, UpdateServiceInput, GetServicesQuery } from '../validation/reviewServiceSchemas';

export class ServiceController {
  /**
   * Create/Get services - POST new service, GET service list
   */
  static async manageServices(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;

      if (req.method === 'POST') {
        const serviceData: CreateServiceInput = req.body;

        // Validate required fields
        if (!serviceData.name || serviceData.price === undefined) {
          res.status(400).json({
            error: 'Validation failed',
            message: 'Service name and price are required'
          });
          return;
        }

        if (serviceData.price < 0) {
          res.status(400).json({
            error: 'Validation failed',
            message: 'Service price cannot be negative'
          });
          return;
        }

        const service = await ServiceService.createService(businessId, serviceData);

        res.status(201).json({
          success: true,
          message: 'Service created successfully',
          data: service
        });
      } else if (req.method === 'GET') {
        const filters: GetServicesQuery = req.query;
        
        // Ensure reasonable limits
        const limit = Math.min(filters.limit || 10, 100);
        const page = Math.max(filters.page || 1, 1);

        const filterParams = {
          category: filters.category,
          is_active: filters.is_active,
          booking_required: filters.booking_required,
          min_price: filters.min_price,
          max_price: filters.max_price,
          min_duration: filters.min_duration,
          max_duration: filters.max_duration,
          search: filters.search,
          popular_only: filters.popular_only,
          customizable_only: filters.customizable_only,
          page,
          limit,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order as 'asc' | 'desc',
        };

        const result = await ServiceService.getServices(businessId, filterParams);

        res.status(200).json({
          success: true,
          data: {
            services: result.services,
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
      console.error('Service management error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Service not found')) {
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
        if (error.message.includes('Validation failed') || error.message.includes('negative')) {
          res.status(400).json({
            error: 'Bad Request',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process service request'
      });
    }
  }

  /**
   * Update service (admin only)
   */
  static async updateService(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid service ID',
          message: 'Service ID must be a valid UUID'
        });
        return;
      }

      const updateData: UpdateServiceInput = req.body;

      // Validate price if provided
      if (updateData.price !== undefined && updateData.price < 0) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Service price cannot be negative'
        });
        return;
      }

      const service = await ServiceService.updateService(id, businessId, updateData);

      res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data: service
      });
    } catch (error) {
      console.error('Update service error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Service not found')) {
          res.status(404).json({
            error: 'Not found',
            message: 'Service not found'
          });)
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
        message: 'Failed to update service'
      });
    }
  }

  /**
   * Get service statistics
   */
  static async getServiceStats(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;

      const stats = await ServiceService.getServiceStats(businessId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get service stats error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service statistics'
      });
    }
  }

  /**
   * Get single service by ID
   */
  static async getServiceById(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid service ID',
          message: 'Service ID must be a valid UUID'
        });
        return;
      }

      const service = await ServiceService.getServiceById(id, businessId);

      res.status(200).json({
        success: true,
        data: service
      });
    } catch (error) {
      console.error('Get service by ID error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Service not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch service'
      });
    }
  }

  /**
   * Bulk operations on services (owner only)
   */
  static async bulkUpdateServices(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { service_ids, updates } = req.body;

      if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'service_ids must be a non-empty array'
        });
        return;
      }

      if (service_ids.length > 100) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Cannot update more than 100 services at once'
        });
        return;
      }

      const updatedCount = await ServiceService.bulkUpdateServices(businessId, service_ids, updates);

      res.status(200).json({
        success: true,
        message: `Successfully updated ${updatedCount} services`,
        data: { updated_count: updatedCount }
      });
    } catch (error) {
      console.error('Bulk update services error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to bulk update services'
      });
    }
  }

  /**
   * Delete service (owner only)
   */
  static async deleteService(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid service ID',
          message: 'Service ID must be a valid UUID'
        });
        return;
      }

      await ServiceService.deleteService(id, businessId);

      res.status(200).json({
        success: true,
        message: 'Service deleted successfully'
      });
    } catch (error) {
      console.error('Delete service error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Service not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete service'
      });
    }
  }

  /**
   * Get services by category
   */
  static async getServicesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { category } = req.params;

      const services = await ServiceService.getServicesByCategory(businessId, category);

      res.status(200).json({
        success: true,
        data: services
      });
    } catch (error) {
      console.error('Get services by category error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch services by category'
      });
    }
  }

  /**
   * Get popular services
   */
  static async getPopularServices(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const services = await ServiceService.getPopularServices(businessId, limit);

      res.status(200).json({
        success: true,
        data: services
      });
    } catch (error) {
      console.error('Get popular services error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch popular services'
      });
    }
  }

  /**
   * Toggle service active status
   */
  static async toggleServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid service ID',
          message: 'Service ID must be a valid UUID'
        });
        return;
      }

      const updatedService = await ServiceService.toggleServiceStatus(id, businessId);

      res.status(200).json({
        success: true,
        message: `Service ${updatedService.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedService
      });
    } catch (error) {
      console.error('Toggle service status error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Service not found')) {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to toggle service status'
      });
    }
  }
}
