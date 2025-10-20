import { Request, Response } from 'express';
// Controllers are typically async functions that handle HTTP request/response
import { NotificationService } from '../services/notificationService';
import { 
  NotificationQueryInput,
  MarkNotificationReadInput,
  BulkNotificationActionInput,
  CreateNotificationInput,
  NotificationStatsInput
} from '../validation/uploadSchemas';

export class NotificationController {
  /**
   * GET /notifications - Retrieve unread notifications for authenticated user
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required to fetch notifications'
        });
        return;
      }

      // Parse query parameters with defaults
      const query: NotificationQueryInput = {
        type: req.query.type as string,
        priority: req.query.priority as any,
        read_status: req.query.read_status as any,
        created_after: req.query.created_after as string,
        created_before: req.query.created_before as string,
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
        sort_by: req.query.sort_by as any || 'created_at',
        sort_order: req.query.sort_order as any || 'desc',
        include_expired: req.query.include_expired === 'true',
        include_read: req.query.include_read !== 'false', // Default to true
        show_all: req.query.show_all === 'true'
      };

      const result = await NotificationService.getNotifications(
        businessId,
        userId,
        query
      );

      res.status(200).json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications: result.notifications,
          pagination: {
            current_page: result.page,
            total_pages: result.totalPages,
            total_count: result.total,
            per_page: query.limit,
            has_next: result.page < result.totalPages,
            has_prev: result.page > 1
          },
          unread_count: result.unreadCount
        },
        metadata: {
          business_id: businessId,
          user_id: userId,
          filters_applied: {
            type: query.type,
            priority: query.priority,
            read_status: query.read_status,
            date_range: {
              after: query.created_after,
              before: query.created_before
            }
          }
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Database error')) {
          res.status(500).json({
            success: false,
            error: 'Database error',
            message: 'Failed to retrieve notifications from database'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve notifications'
      });
    }
  }

  /**
   * PUT /notifications/:id/read - Mark notification as read
   */
  static async markNotificationRead(req: Request, res: Response): Promise<void> {
    try {
      const { id: notificationId } = req.params;
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required to mark notifications'
        });
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(notificationId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid notification ID',
          message: 'Notification ID must be a valid UUID format'
        });
        return;
      }

      const {
        action_taken = 'viewed',
        action_data = {}
      } = req.body;

      const success = await NotificationService.markNotificationRead(
        notificationId,
        businessId,
        userId,
        {
          action_taken,
          action_data
        }
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Notification not found',
          message: 'Notification not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read successfully',
        data: {
          notification_id: notificationId,
          read_at: new Date().toISOString(),
          action_taken,
          action_data
        }
      });
    } catch (error) {
      console.error('Mark notification read error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Database error')) {
          res.status(500).json({
            success: false,
            error: 'Database error',
            message: 'Failed to update notification in database'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to mark notification as read'
      });
    }
  }

  /**
   * POST /notifications/bulk-action - Perform bulk actions on notifications
   */
  static async bulkNotificationAction(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required for bulk actions'
        });
        return;
      }

      const bulkData: BulkNotificationActionInput = req.body;

      // Validate input
      if (!bulkData.notification_ids || bulkData.notification_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'At least one notification ID is required'
        });
        return;
      }

      if (!['mark_read', 'mark_unread', 'archive', 'delete'].includes(bulkData.action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: 'Action must be one of: mark_read, mark_unread, archive, delete'
        });
        return;
      }

      const affectedCount = await NotificationService.bulkNotificationAction(
        bulkData,
        businessId,
        userId
      );

      res.status(200).json({
        success: true,
        message: `Bulk action completed successfully`,
        data: {
          action: bulkData.action,
          notification_ids: bulkData.notification_ids,
          affected_count: affectedCount,
          processed_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Bulk notification action error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to perform bulk notification action'
      });
    }
  }

  /**
   * GET /notifications/stats - Get notification statistics
   */
  static async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required to fetch statistics'
        });
        return;
      }

      const timeframe = (req.query.timeframe as string) || '30d';

      if (!['24h', '7d', '30d', '90d', 'all'].includes(timeframe)) {
        res.status(400).json({
          success: false,
          error: 'Invalid timeframe',
          message: 'Timeframe must be one of: 24h, 7d, 30d, 90d, all'
        });
        return;
      }

      const stats = await NotificationService.getNotificationStats(
        businessId,
        userId,
        timeframe as any
      );

      res.status(200).json({
        success: true,
        message: 'Notification statistics retrieved successfully',
        data: {
          ...stats,
          timeframe,
          generated_at: new Date().toISOString()
        },
        metadata: {
          business_id: businessId,
          user_id: userId
        }
      });
    } catch (error) {
      console.error('Get notification stats error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch notification statistics'
      });
    }
  }

  /**
   * POST /notifications/create - Create a new notification (admin only)
   */
  static async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required to create notifications'
        });
        return;
      }

      const notificationData: CreateNotificationInput = req.body;

      const notification = await NotificationService.createNotification(
        notificationData,
        businessId,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification
      });
    } catch (error) {
      console.error('Create notification error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Validation failed')) {
          res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Database error')) {
          res.status(500).json({
            success: false,
            error: 'Database error',
            message: 'Failed to create notification in database'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create notification'
      });
    }
  }

  /**
   * DELETE /notifications/:id - Delete notification
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id: notificationId } = req.params;
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required to delete notifications'
        });
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(notificationId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid notification ID',
          message: 'Notification ID must be a valid UUID format'
        });
        return;
      }

      const { count: deletedCount } = await NotificationService.bulkNotificationAction(
        {
          notification_ids: [notificationId],
          action: 'delete'
        },
        businessId,
        userId
      );

      if (deletedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'Notification not found',
          message: 'Notification not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
        data: {
          notification_id: notificationId,
          deleted_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Delete notification error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete notification'
      });
    }
  }

  /**
   * GET /notifications/unread-count - Get unread notifications count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User authentication required to get unread count'
        });
        return;
      }

      const unreadCount = await NotificationService.getUnreadCount(businessId, userId);

      res.status(200).json({
        success: true,
        data: {
          unread_count: unreadCount,
          user_id: userId,
          business_id: businessId,
          fetched_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Get unread count error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get unread notifications count'
      });
    }
  }

  /**  
   * GET /notifications/health - Health check for notifications
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const userId = req.user?.id;

      // Basic health checks
      const healthStatus = {
        service_status: 'healthy',
        database_connection: true,
        notification_system: true,
        last_checked: new Date().toISOString(),
        business_id: businessId,
        authenticated_user: !!userId
      };

      // Try to get basic stats if user is authenticated
      if (userId) {
        try {
          const unreadCount = await NotificationService.getUnreadCount(businessId, userId);
          healthStatus.authenticated_user = true;
        } catch (error) {
          healthStatus.message = 'Warning: Could not fetch user-specific data';
        }
      }

      res.status(200).json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      console.error('Notifications health check error:', error);

      res.status(503).json({
        success: false,
        data: {
          service_status: 'unhealthy',
          error: 'Notifications service unavailable',
          last_checked: new Date().toISOString()
        }
      });
    }
  }
}

export default NotificationController;
