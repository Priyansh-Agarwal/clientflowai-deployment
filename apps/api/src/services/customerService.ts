import { supabase } from '../config/supabase';
import { Customer, CustomerInsert, CustomerUpdate } from '../types/database';
import { PostgrestError } from '@supabase/supabase-js';

export class CustomerService {
  /**
   * Create a new customer
   */
  static async createCustomer(businessId: string, customerData: CustomerInsert): Promise<Customer> {
    try {
      // Add business_id and prepare data for insertion
      const insertData: CustomerInsert = {
        ...customerData,
        business_id: businessId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create customer: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        // Handle specific Supabase errors
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Customer with this phone number already exists');
        }
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get paginated list of customers with search and filtering
   */
  static async getCustomers(
    businessId: string, 
    filters: {
      search?: string;
      page: number;
      limit: number;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
      status?: string;
    }
  ): Promise<{ customers: Customer[]; total: number; page: number; totalPages: number }> {
    try {
      const { search, page, limit, sort_by = 'created_at', sort_order = 'desc', status } = filters;
      
      // Start building the query
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Add search filter if provided
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm}`);
      }

      // Add status filter if provided
      if (status) {
        query = query.eq('status', status);
      }

      // Add sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Add pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch customers: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        customers: data || [],
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
   * Get a single customer by ID
   */
  static async getCustomerById(customerId: string, businessId: string): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Customer not found');
        }
        throw new Error(`Failed to fetch customer: ${error.message}`);
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
   * Update a customer
   */
  static async updateCustomer(
    customerId: string, 
    businessId: string, 
    updateData: CustomerUpdate
  ): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Customer not found');
        }
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Customer with this phone number already exists');
        }
        throw new Error(`Failed to update customer: ${error.message}`);
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
   * Delete a customer
   */
  static async deleteCustomer(customerId: string, businessId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('business_id', businessId);

      if (error) {
        throw new Error(`Failed to delete customer: ${error.message}`);
      }

      // Check if any rows were affected (customer existed and was deleted)
      const { data, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .eq('business_id', businessId)
        .single();

      if (!checkError && data) {
        throw new Error('Customer not found');
      }
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Format phone number for consistent storage
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Basic validation
    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new Error('Invalid phone number length');
    }
    
    return cleaned;
  }

  /**
   * Check if customer with phone number already exists for business
   */
  static async checkCustomerExists(phone: string, businessId: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', formattedPhone)
        .eq('business_id', businessId)
        .limit(1);

      if (error) {
        throw new Error(`Failed to check customer existence: ${error.message}`);
      }

      return data && data.length > 0;
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }
}
