import { supabase, supabaseServiceRole } from '../config/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import {
  Notification,
  NotificationInsert,
  NotificationStats,
  NotificationUpdate
} from '../types/database';
import {
  NotificationQueryInput,
  NotificationStatsInput,
  BulkNotificationActionInput,
  CreateNotificationInput
} from '../validation/uploadSchemas';

export class NotificationService {
  /**
   * Get notifications for authenticated user with filtering and pagination
   */
  static async getNotifications(
    businessId: string,
    userId: string,
    query: NotificationQueryInput
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
  }> {
    try {
      const {
        type,
        priority,
        read_status,
        created_after,
        created_before,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc',
        include_expired = false,
        include_read = true,
        show_all = false
      } = query;

      let dbQuery = supabaseServiceRole
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .eq('user_id', userId);

      // Apply filters
      if (type) {
        dbQuery = dbQuery.eq('type', type);
      }

      if (priority) {
        dbQuery = dbQuery.eq('priority', priority);
      }

      if (read_status) {
        switch (read_status) {
          case 'unread':
            dbQuery = dbQuery.is('read_at', null);
            break;
          case 'read':
            dbQuery = dbQuery.not('read_at', 'is', null);
            break;
        }
      }

      if (created_after) {
        dbQuery = dbQuery.gte('created_at', created_after);
      }

      if (created_before) {
        dbQuery = dbQuery.lte('created_at', created_before);
      }

      if (!include_expired && !show_all) {
        dbQuery = dbQuery.or(
          'expires_at.is.null,expires_at.gte.' + new Date().toISOString()
        );
      }

      if (!include_read && !show_all) {
        dbQuery = dbQuery.is('read_at', null);
      }

      // Sort by specified field
      dbQuery = dbQuery.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      dbQuery = dbQuery.range(from, to);

      const { data, error, count } = await dbQuery;

      if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      // Get unread count separately
      const unreadCount = await this.getUnreadCount(businessId, userId);

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        notifications: data || [],
        total: count || 0,
        page,
        totalPages,
        unreadCount
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get unread notifications count
   */
  static async getUnreadCount(businessId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await supabaseServiceRole
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .is('read_at', null)
        .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());

      if (error) {
        throw new Error(`Failed to get unread count: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(
    notificationId: string,
    businessId: string,
    userId: string,
    actionData?: {
      action_taken?: string;
      action_data?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const updateData: NotificationUpdate = {
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (actionData?.action_taken) {
        const existingData = await supabaseServiceRole
          .from('notifications')
          .select('data')
          .eq('id', notificationId)
          .single();

        updateData.data = {
          ...existingData.data?.data,
          action_taken: actionData.action_taken,
          action_taken_at: new Date().toISOString(),
          ...actionData.action_data
        };
      }

      const { error } = await supabaseServiceRole
        .from('notifications')
        .update(updateData)
        .eq('id', notificationId)
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`);
      }

      return true;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  static async markNotificationsRead(
    notificationIds: string[],
    businessId: string,
    userId: string
  ): Promise<number> {
    try {
      const { data: updatedNotifications, error } = await supabaseServiceRole
        .from('notifications')
        .update({
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', notificationIds)
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .is('read_at', null) // Only update unread notifications
        .select('id');

      if (error) {
        throw new Error(`Failed to mark notifications as read: ${error.message}`);
      }

      return updatedNotifications?.length || 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(
    notificationData: CreateNotificationInput,
    businessId: string,
    createdBy: string
  ): Promise<Notification> {
    try {
      const notificationInsert: NotificationInsert = {
        business_id: businessId,
        user_id: notificationData.target_user_id || '',
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        action_url: notificationData.action_url,
        action_label: notificationData.action_label,
        priority: notificationData.priority || 'normal',
        expires_at: notificationData.expires_at || null,
        metadata: {
          created_by: createdBy,
          created_at: new Date().toISOString()
        }
      };

      const { data, error } = await supabaseServiceRole
        .from('notifications')
        .insert(notificationInsert)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create notification: ${error.message}`);
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
   * Get notification statistics
   */
  static async getNotificationStats(
    businessId: string,
    userId: string,
    timeframe: '24h' | '7d' | '30d' | '90d' | 'all' = '30d'
  ): Promise<NotificationStats> {
    try {
      // Calculate date filter
      let dateFilter = '';
      const now = new Date();
      
      switch (timeframe) {
        case '24h':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      let query = supabaseServiceRole
        .from('notifications')
        .select('type, read_at')
        .eq('business_id', businessId)
        .eq('user_id', userId);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch notification statistics: ${error.message}`);
      }

      const notifications = data || [];
      
      // Calculate statistics
      const totalNotifications = notifications.length;
      const unreadCount = notifications.filter(n => !n.read_at).length;
      const readCount = totalNotifications - unreadCount;

      // Count by type
      const notificationsByType: Record<string, number> = {};
      notifications.forEach(notification => {
        notificationsByType[notification.type] = 
          (notificationsByType[notification.type] || 0) + 1;  type] || 0) + 1;
      });

      // Get recent notifications
      const recentNotifications = notifications
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      return {
        total_notifications: totalNotifications,
        unread_count: unreadCount,
        read_count: readCount,
        notifications_by_type: notificationsByType,
        recent_notifications: recentNotifications
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      const { data: cleanedCount, error } = await supabaseServiceRole
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .not('read_at', 'is', null)
        .select('id');

      if (error) {
        throw new Error(`Failed to cleanup expired notifications: ${error.message}`);
      }

      return cleanedCount?.length || 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Bulk notification actions
   */
  static async bulkNotificationAction(
    actionData: BulkNotificationActionInput,
    businessId: string,
    userId: string
  ): Promise<number> {
    try {
      const { notification_ids, action, action_data } = actionData;
      
      let updateData: any = {};
      
      switch (action) {
        case 'mark_read':
          updateData.read_at = new Date().toISOString();
          break;
        case 'mark_unread':
          updateData.read_at = null;
          break;
        case 'archive':
          updateData.metadata = { archived: true };
          break;
        case 'delete':
          // Handle deletion
          const { count: deletedCount, error: deleteError } = await supabaseServiceRole
            .from('notifications')
            .delete()
            .in('id', notification_ids)
            .eq('business_id', businessId)
            .eq('user_id', userId);

          if (deleteError) {
            throw new Error(`Failed to delete notifications: ${deleteError.message}`);
          }

          return deletedCount || 0;
      }

      updateData.updated_at = new Date().toISOString();

      const { data: updatedNotifications, error } = await supabaseServiceRole
        .from('notifications')
        .update(updateData)
        .in('id', notification_ids)
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .select('id');

      if (error) {
        throw new Error(`Failed to perform bulk action: ${error.message}`);
      }

      return updatedNotifications?.length || 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}