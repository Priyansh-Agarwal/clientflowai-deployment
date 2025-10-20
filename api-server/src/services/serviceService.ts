import { supabase } from '../config/supabase';
import { Service, ServiceInsert, ServiceUpdate } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';

export class ServiceService {
  /**
   * Create a new service
   */
  static async createService(businessId: string, serviceData: ServiceInsert): Promise<Service> {
    try {
      // Validate service data
      if (serviceData.price < 0) {
        throw new Error('Service price cannot be negative');
      }

      if (serviceData.duration_minutes && serviceData.duration_minutes < 5) {
        throw new Error('Service duration must be at least 5 minutes');
      }

      // Add business_id and prepare data for insertion
      const insertData: ServiceInsert = {
        ...serviceData,
        business_id: businessId,
        is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
        booking_required: serviceData.booking_required !== undefined ? serviceData.booking_required : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('services')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create service: ${error.message}`);
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
   * Update a service (admin only)
   */
  static async updateService(
    serviceId: string,
    businessId: string,
    updateData: ServiceUpdate
  ): Promise<Service> {
    try {
      // Validate service data
      if (updateData.price !== undefined && updateData.price < 0) {
        throw new Error('Service price cannot be negative');
      }

      if (updateData.duration_minutes !== undefined && updateData.duration_minutes < 5) {
        throw new Error('Service duration must be at least 5 minutes');
      }

      const { data, error } = await supabase
        .from('services')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Service not found');
        }
        throw new Error(`Failed to update service: ${error.message}`);
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
   * Get services with filtering and pagination
   */
  static async getServices(
    businessId: string,
    filters: {
      category?: string;
      is_active?: boolean;
      booking_required?: boolean;
      min_price?: number;
      max_price?: number;
      min_duration?: number;
      max_duration?: number;
      search?: string;
      popular_only?: boolean;
      customizable_only?: boolean;
      page: number;
      limit: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }
  ): Promise<{ services: Service[]; total: number; page: number; totalPages: number }> {
    try {
      const {
        category,
        is_active,
        booking_required,
        min_price,
        max_price,
        min_duration,
        max_duration,
        search,
        popular_only,
        customizable_only,
        page,
        limit,
        sort_by = 'name',
        sort_order = 'asc',
      } = filters;
      
      // Start building the query
      let query = supabase
        .from('services')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      
      if (is_active !== undefined) {
        query = query.eq('is_active', is_active);
      }
      
      if (booking_required !== undefined) {
        query = query.eq('booking_required', booking_required);
      }

      // Price filtering
      if (min_price !== undefined) {
        query = query.gte('price', min_price);
      }
      if (max_price !== undefined) {
        query = query.lte('price', max_price);
      }

      // Duration filtering
      if (min_duration !== undefined) {
        query = query.gte('duration_minutes', min_duration);
      }
      if (max_duration !== undefined) {
        query = query.lte('duration_minutes', max_duration);
      }

      // Search functionality
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
      }

      // Popular and customizable filtering
      if (popular_only) {
        query = query.eq('metadata->>popular', 'true');
      }

      if (customizable_only) {
        query = query.eq('metadata->>customizable', 'true');
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch services: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        services: data || [],
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
   * Get a single service by ID
   */
  static async getServiceById(serviceId: string, businessId: string): Promise<Service> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Service not found');
        }
        throw new Error(`Failed to fetch service: ${error.message}`);
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
   * Get service statistics
   */
  static async getServiceStats(businessId: string): Promise<{
    totalServices: number;
    activeServices: number;
    categoryBreakdown: Record<string, number>;
    averagePrice: number;
    priceRange: { min: number; max: number };
    averageDuration: number;
  }> {
    try {
      const { data: services, error } = await supabase
        .from('services')
        .select('category, price, duration_minutes, is_active')
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to fetch service statistics: ${error.message}`);
      }

      const totalServices = services.length;
      const activeServices = services.filter(s => s.is_active).length;
      
      const prices = services.map(s => s.price);
      const durations = services.filter(s => s.duration_minutes).map(s => s.duration_minutes!);

      const averagePrice = prices.length > 0 ? prices.reduce((acc, price) => acc + price, 0) / prices.length : 0;
      const priceRange = {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0
      };

      const averageDuration = durations.length > 0 ? 
        Math.round(durations.reduce((acc, duration) => acc + duration, 0) / durations.length) : 0;

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      services.forEach(service => {
        if (service.category) {
          categoryBreakdown[service.category] = (categoryBreakdown[service.category] || 0) + 1;
        }
      });

      return {
        totalServices,
        activeServices,
        categoryBreakdown,
        averagePrice: Math.round(averagePrice * 100) / 100,
        priceRange,
        averageDuration,
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Bulk update services (owner only)
   */
  static async bulkUpdateServices(
    businessId: string,
    serviceIds: string[],
    updates: Partial<ServiceUpdate>
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('services')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .in('id', serviceIds)
        .eq('business_id', businessId)
        .select('id');

      if (error) {
        throw new Error(`Failed to bulk update services: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete service (owner only)
   */
  static async deleteService(serviceId: string, businessId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to delete service: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get services by category
   */
  static async getServicesByCategory(businessId: string, category: string): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('category', category)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch services by category: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get popular services
   */
  static async getPopularServices(businessId: string, limit: number = 10): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .eq('metadata->>popular', 'true')
        .order('name', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch popular services: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Toggle service active status
   */
  static async toggleServiceStatus(serviceId: string, businessId: string): Promise<Service> {
    try {
      // Get current status
      const { data: currentService, error: fetchError } = await supabase
        .from('services')
        .select('is_active')
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Service not found');
        }
        throw new Error(`Failed to fetch service: ${fetchError.message}`);
      }

      // Toggle status
      const newStatus = !currentService.is_active;

      const { data, error } = await supabase
        .from('services')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to toggle service status: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}
