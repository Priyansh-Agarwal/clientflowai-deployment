import { Router } from 'express';
import NotificationController from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
import { requireAdminAccess } from '../middleware/adminAuth';
import { validateRequest, validateQuery } from '../middleware/validation';
import {
  NotificationQueryInput,
  MarkNotificationReadInput,
  BulkNotificationActionInput,
  CreateNotificationInput,
  NotificationStatsInput,
  notificationQuerySchema,
  markNotificationReadSchema,
  bulkNotificationActionSchema,
  createNotificationSchema,
  notificationStatsSchema
} from '../validation/uploadSchemas';

const router = Router();

/**
 * @route   GET /notifications
 * @desc    Retrieve unread notifications for authenticated user, sorted by created_at
 * @access  Private (authenticated users)
 * @query   type?, priority?, read_status?, created_after?, created_before?, page?, limit?, sort_by?, sort_order?, include_expired?, include_read?, show_all?
 * 
 * Returns paginated list of notifications with filtering and sorting options.
 * Supports marking read/unread status and filtering by notification types.
 * 
 * Query Parameters:
 * - type: Filter by notification type (appointment_confirmed, review_submitted, etc.)
 * - priority: Filter by priority (low, normal, high, urgent)
 * - read_status: Filter by read status (unread, read, archived, expired)
 * - created_after: ISO date filter for notifications after this date
 * - created_before: ISO date filter for notifications before this date  
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * - sort_by: Sort field (created_at, priority, read_at, expires_at)
 * - sort_order: Sort direction (asc, desc)
 * - include_expired: Include expired notifications (default: false)
 * - include_read: Include read notifications (default: true)
 * - show_all: Show all notifications regardless of filters (default: false)
 */
router.get('/',
  authenticateToken,
  validateQuery(notificationQuerySchema),
  NotificationController.getNotifications
);

/**
 * @route   PUT /notifications/:id/read
 * @desc    Mark notification as read by setting read_at timestamp
 * @access  Private (authenticated users)
 * @body    { action_taken?, action_data? }
 * 
 * Marks a specific notification as read and updates the read_at timestamp.
 * Optionally tracks action taken (viewed, clicked_action, dismissed).
 * 
 * Request Body (optional):
 * - action_taken: Action taken ('viewed', 'clicked_action', 'dismissed')
 * - action_data: Additional data about the action
 */
router.put('/:id/read',
  authenticateToken,
  NotificationController.markNotificationRead
);

/**
 * @route   POST /notifications/bulk-action  
 * @desc    Perform bulk operations on notifications (mark read/unread, archive, delete)
 * @access  Private (authenticated users)
 * @body    { notification_ids: string[], action: string, action_data? }
 * 
 * Perform bulk actions on multiple notifications simultaneously.
 * Useful for marking multiple notifications as read/unread or archiving.
 * 
 * Request Body:
 * - notification_ids: Array of notification UUIDs (max 100)
 * - action: Action to perform ('mark_read', 'mark_unread', 'archive', 'delete')
 * - action_data: Optional additional data for the action
 */
router.post('/bulk-action',
  authenticateToken,
  validateRequest(bulkNotificationActionSchema),
  NotificationController.bulkNotificationAction
);

/**
 * @route   GET /notifications/stats
 * @desc    Get notification statistics and analytics
 * @access  Private (authenticated users)
 * @query   timeframe? (24h, 7d, 30d, 90d, all)
 * 
 * Returns comprehensive notification analytics including:
 * - Total notifications count
 * - Unread vs read counts
 * - Notifications by type
 * - Recent notifications
 * 
 * Query Parameters:
 * - timeframe: Time period for statistics (24h, 7d, 30d, 90d, all)
 */
router.get('/stats',
  authenticateToken,
  validateQuery(notificationStatsSchema),
  NotificationController.getNotificationStats
);

/**
 * @route   POST /notifications/create
 * @desc    Create a new notification (admin/system use)
 * @access  Private (admin/owner only)
 * @body    CreateNotificationInput
 * 
 * Creates a new notification programmatically.
 * Primarily used by system events or admin operations.
 * 
 * Request Body:
 * - type: Notification type (required)
 * - title: Notification title (required)
 * - message: Notification message (required)
 * - data: Additional data payload (optional)
 * - action_url: URL for notification action (optional)
 * - action_label: Label for notification action (optional)
 * - priority: Notification priority (low, normal, high, urgent)
 * - expires_at: Expiration timestamp (optional)
 * - target_user_id: Target user UUID (optional, defaults to current user)
 */
router.post('/create',
  authenticateToken,
  requireAdminAccess,
  validateRequest(createNotificationSchema),
  NotificationController.createNotification
);

/**
 * @route   DELETE /notifications/:id
 * @desc    Delete notification permanently
 * @access  Private (authenticated users)
 * 
 * Permanently removes a notification from the database.
 * Only the notification recipient or admin can delete notifications.
 */
router.delete('/:id',
  authenticateToken,
  NotificationController.deleteNotification
);

/**
 * @route   GET /notifications/unread-count
 * @desc    Get unread notifications count for current user
 * @access  Private (authenticated users)
 * 
 * Returns the total count of unread notifications for the authenticated user.
 * Useful for updating notification badges in the UI.
 */
router.get('/unread-count',
  authenticateToken,
  NotificationController.getUnreadCount
);

/**
 * @route   GET /notifications/types
 * @desc    Get available notification types and their descriptions
 * @access  Private (authenticated users)
 * 
 * Returns information about available notification types with descriptions
 * and their typical use cases. Useful for filtering and categorization.
 */
router.get('/types',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const notificationTypes = {
        'appointment_confirmed': {
          title: 'Appointment Confirmed',
          description: 'When an appointment is confirmed',
          priority: 'normal',
          category: 'appointments'
        },
        'appointment_cancelled': {
          title: 'Appointment Cancelled',
          description: 'When an appointment is cancelled',
          priority: 'high',
          category: 'appointments'
        },
        'appointment_completed': {
          title: 'Appointment Completed',
          description: 'When an appointment is marked as completed',
          priority: 'low',
          category: 'appointments'
        },
        'review_submitted': {
          title: 'Review Received',
          description: 'When a new review is submitted',
          priority: 'high',
          category: 'reviews'
        },
        'review_response': {
          title: 'Review Response',
          description: 'When responding to a review',
          priority: 'normal',
          category: 'reviews'
        },
        'team_invitation': {
          title: 'Team Invitation',
          description: 'When invited to join a team',
          priority: 'high',
          category: 'team'
        },
        'file_uploaded': {
          title: 'File Upload Complete',
          description: 'When a file is uploaded successfully',
          priority: 'low',
          category: 'files'
        },
        'payment_received': {
          title: 'Payment Received',
          description: 'When payment is received',
          priority: 'high',
          category: 'payments'
        },
        'system_alert': {
          title: 'System Alert',
          description: 'System-wide alerts and notifications',
          priority: 'urgent',
          category: 'system'
        },
        'general': {
          title: 'General Notification',
          description: 'General notifications and announcements',
          priority: 'normal',
          category: 'general'
        }
      };

      res.status(200).json({
        success: true,
        data: {
          notification_types: notificationTypes,
          priorities: {
            low: 'Low priority notifications',
            normal: 'Standard priority notifications', 
            high: 'High priority notifications',
            urgent: 'Urgent notifications requiring immediate attention'
          },
          categories: {
            appointments: 'Appointment-related notifications',
            reviews: 'Review and rating notifications',
            team: 'Team and collaboration notifications',
            files: 'File upload and management notifications',
            payments: 'Payment and billing notifications',
            system: 'System alerts and maintenance notifications',
            general: 'General notifications and announcements'
          }
        }
      });
    } catch (error) {
      console.error('Get notification types error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch notification types'
      });
    }
  }
);

/**
 * @route   GET /notifications/health
 * @desc    Notifications system health check
 * @access  Private (authenticated users)
 * 
 * Performs health checks on the notifications system including
 * database connectivity and service status.
 */
router.get('/health',
  authenticateToken,
  NotificationController.healthCheck
);

/**
 * @route   POST /notifications/cleanup
 * @desc    Clean up expired notifications (admin/system use)
 * @access  Private (admin/owner only)
 * 
 * Removes expired notifications from the database.
 * Should be called periodically as a maintenance operation.
 */
router.post('/cleanup',
  authenticateToken,
  requireAdminAccess,
  async (req: Request, res: Response) => {
    try {
      const { NotificationService } = await import('../services/notificationService');
      const cleanedCount = await NotificationService.cleanupExpiredNotifications();

      res.status(200).json({
        success: true,
        message: 'Notification cleanup completed',
        data: {
          expired_notifications_removed: cleanedCount,
          cleanup_performed_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Notification cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to perform notification cleanup'
      });
    }
  }
);

export default router;
