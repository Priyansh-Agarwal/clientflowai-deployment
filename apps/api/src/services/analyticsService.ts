import { supabase } from '../config/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import {
  DashboardMetrics,
  CallOutcomeDistribution,
  DailyMetrics,
  AnalyticsTimeRange,
  ChartDataPoint,
  TimeSeriesDataPoint,
  ComparisonData,
  DashboardKPIs
} from '../types/database';
import {
  DashboardAnalyticsQuery,
  calculateDateRange,
  calculateGrowthRate,
  formatCurrency,
  formatPercentage,
  validateDateRange
} from '../validation/analyticsSchemas';

export class AnalyticsService {
  /**
   * Get comprehensive dashboard analytics with KPIs
   */
  static async getDashboardAnalytics(
    businessId: string,
    query: DashboardAnalyticsQuery
  ): Promise<DashboardKPIs> {
    try {
      const { period, start_date, end_date } = query;
      
      // Calculate date range
      const dateRange = start_date && end_date 
        ? { startDate: start_date, endDate: end_date, period: 'custom' as const }
        : calculateDateRange(period || '30d');
      
      if (!validateDateRange(dateRange.startDate, dateRange.endDate)) {
        throw new Error('Invalid date range provided');
      }

      // Get dashboard KPIs using optimized SQL queries
      const [callsData, appointmentsData, revenueData, customersData] = await Promise.all([
        this.getCallKPIs(businessId, dateRange),
        this.getAppointmentKPIs(businessId, dateRange),
        this.getRevenueKPIs(businessId, dateRange),
        this.getCustomerKPIs(businessId, dateRange)
      ]);

      return {
        calls: callsData,
        appointments: appointmentsData,
        revenue: revenueData,
        customers: customersData
      };
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get call-related KPIs using SQL aggregation
   */
  private static async getCallKPIs(
    businessId: string,
    dateRange: AnalyticsTimeRange
  ): Promise<DashboardKPIs['calls']> {
    const { data, error } = await supabase
      .from('calls')
      .select(`
        outcome,
        status,
        duration,
        direction
      `)
      .eq('business_id', businessId)
      .gte('started_at', dateRange.startDate)
      .lte('started_at', dateRange.endDate);

    if (error) {
      throw new Error(`Failed to fetch call data: ${error.message}`);
    }

    const calls = data || [];
    const total = calls.length;
    const answered = calls.filter(call => call.status === 'completed' || call.status === 'answered').length;
    const missed = calls.filter(call => call.status === 'busy' || call.status === 'no_answer').length;
    
    // Calculate conversion rate (calls leading to appointments)
    const callsLeadingToAppointments = calls.filter(call => 
      call.outcome === 'booked' || call.outcome === 'appointment_scheduled'
    ).length;
    const conversion_rate = total > 0 ? (callsLeadingToAppointments / total) * 100 : 0;
    
    // Calculate average duration
    const durations = calls
      .filter(call => call.duration && call.duration > 0)
      .map(call => call.duration!);
    const average_duration = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;

    return {
      total,
      answered,
      missed,
      conversion_rate: Math.round(conversion_rate * 10) / 10,
      average_duration: Math.round(average_duration)
    };
  }

  /**
   * Get appointment-related KPIs using SQL aggregation  
   */
  private static async getAppointmentKPIs(
    businessId: string,
    dateRange: AnalyticsTimeRange
  ): Promise<DashboardKPIs['appointments']> {
    const { data, error } = await supabase
      .from('appointments')
      .select('status, total_price')
      .eq('business_id', businessId)
      .gte('scheduled_at', dateRange.startDate)
      .lte('scheduled_at', dateRange.endDate);

    if (error) {
      throw new Error(`Failed to fetch appointment data: ${error.message}`);
    }

    const appointments = data || [];
    const total = appointments.length;
    const confirmed = appointments.filter(apt => apt.status === 'confirmed').length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
    const no_shows = appointments.filter(apt => apt.status === 'no_show').length;
    
    const conversion_rate = total > 0 ? (confirmed / total) * 100 : 0;
    const no_show_rate = confirmed > 0 ? (no_shows / confirmed) * 100 : 0;

    return {
      total,
      confirmed,
      completed,
      cancelled,
      conversion_rate: Math.round(conversion_rate * 10) / 10,
      no_show_rate: Math.round(no_show_rate * 10) / 10
    };
  }

  /**
   * Get revenue KPIs with growth calculations
   */
  private static async getRevenueKPIs(
    businessId: string,
    dateRange: AnalyticsTimeRange
  ): Promise<DashboardKPIs['revenue']> {
    // Get current period revenue
    const { data: currentRevenue, error: currentError } = await supabase
      .from('appointments')
      .select('total_price')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('scheduled_at', dateRange.startDate)
      .lte('scheduled_at', dateRange.endDate);

    if (currentError) {
      throw new Error(`Failed to fetch revenue data: ${currentError.message}`);
    }

    const currentTotal = currentRevenue?.reduce((sum, apt) => 
      sum + (apt.total_price || 0), 0
    ) || 0;

    // Calculate previous period for growth rate
    const daysDiff = Math.ceil(
      (new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    
    const prevStartDate = new Date(
      new Date(dateRange.startDate).getTime() - (daysDiff + 1) * 24 * 60 * 60 * 1000
    ).toISOString();
    
    const prevEndDate = new Date(
      new Date(dateRange.endDate).getTime() - (daysDiff + 1) * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: previousRevenue, error: previousError } = await supabase
      .from('appointments')
      .select('total_price')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('scheduled_at', prevStartDate)
      .lte('scheduled_at', prevEndDate);

    if (previousError) {
      console.warn('Could not fetch previous period revenue data:', previousError.message);
    }

    const previousTotal = previousRevenue?.reduce((sum, apt) => 
      sum + (apt.total_price || 0), 0
    ) || 0;

    const growth_rate = calculateGrowthRate(currentTotal, previousTotal);
    const daily_average = currentTotal / Math.max(daysDiff, 1);
    const daysInMonth = new Date().getDate(); // Days elapsed in current month
    const projected_monthly = (daily_average * 30);

    return {
      total: formatCurrency(currentTotal),
      daily_average: formatCurrency(daily_average),
      growth_rate: Math.round(growth_rate * 10) / 10,
      projected_monthly: formatCurrency(projected_monthly)
    };
  }

  /**
   * Get customer KPIs
   */
  private static async getCustomerKPIs(
    businessId: string,
    dateRange: AnalyticsTimeRange
  ): Promise<DashboardKPIs['customers']> {
    // Get total customers
    const { data: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId);

    if (totalError) {
      throw new Error(`Failed to fetch customer data: ${totalError.message}`);
    }

    // Get active customers (with appointments in date range)
    const { data: activeCustomers, error: activeError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .not('id', 'not.in', 
        // Subquery for customers with appointments in range
        supabase.from('appointments')
          .select('customer_id')
          .eq('business_id', businessId)
          .gte('scheduled_at', dateRange.startDate)
          .lte('scheduled_at', dateRange.endDate)
      );

    if (activeError) {
      console.warn('Could not fetch active customer data:', activeError.message);
    }

    // Get new customers in date range
    const { data: newCustomers, error: newError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate);

    if (newError) {
      console.warn('Could not fetch new customer data:', newError.message);
    }

    const total = totalCustomers?.length || 0;
    const active = activeCustomers?.length || 0;
    const new_this_period = newCustomers?.length || 0;
    const retention_rate = total > 0 ? (active / total) * 100 : 0;

    return {
      total,
      active,
      new_this_period,
      retention_rate: Math.round(retention_rate * 10) / 10
    };
  }

  /**
   * Get call outcome distribution with percentages
   */
  static async getCallOutcomeDistribution(
    businessId: string,
    dateRange: AnalyticsTimeRange
  ): Promise<CallOutcomeDistribution[]> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('outcome')
        .eq('business_id', businessId)
        .gte('started_at', dateRange.startDate)
        .lte('started_at', dateRange.endDate)
        .not('outcome', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch call outcomes: ${error.message}`);
      }

      const calls = data || [];
      
      // Count occurrences of each outcome
      const outcomeCounts: Record<string, number> = {};
      calls.forEach(call => {
        const outcome = call.outcome || 'unknown';
        outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
      });

      const total = calls.length;
      
      // Calculate distribution
      return Object.entries(outcomeCounts).map(([outcome, count]) => ({
        outcome: this.formatOutcomeName(outcome),
        count,
        percentage: Math.round((count / total) * 1000) / 10 // Round to 1 decimal
      }));
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get 30-day daily metrics with SQL GROUP BY
   */
  static async getDailyMetrics(
    businessId: string,
    days: number = 30
  ): Promise<DailyMetrics[]> {
    try {
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      // Get appointment metrics grouped by day
      const { data: appointmentMetrics, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          scheduled_at,
          status,
          total_price
        `)
        .eq('business_id', businessId)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());

      if (appointmentError) {
        throw new Error(`Failed to fetch appointment metrics: ${appointmentError.message}`);
      }

      // Get call metrics grouped by day
      const { data: callMetrics, error: callError } = await supabase
        .from('calls')
        .select('started_at')
        .eq('business_id', businessId)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString());

      if (callError) {
        throw new Error(`Failed to fetch call metrics: ${callError.message}`);
      }

      // Group data by day using JavaScript (PostgreSQL GROUP BY toSQL is complex without RPC functions)
      const dailyData: Record<string, {
        calls: number,
        appointments: number,
        revenue: number,
        bookings: number
      }> = {};

      // Initialize all days with zero values
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        dailyData[dateKey] = { calls: 0, appointments: 0, revenue: 0, bookings: 0 };
      }

      // Aggregate appointment data
      appointmentMetrics?.forEach(appointment => {
        const dateKey = new Date(appointment.scheduled_at).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].appointments++;
          dailyData[dateKey].revenue += appointment.total_price || 0;
          
          if (['confirmed', 'completed'].includes(appointment.status)) {
            dailyData[dateKey].bookings++;
          }
        }
      });

      // Aggregate call data
      callMetrics?.forEach(call => {
        const dateKey = new Date(call.started_at).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].calls++;
        }
      });

      // Convert to array format
      return Object.entries(dailyData)
        .map(([date, metrics]) => ({
          date,
          ...metrics
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get revenue trends with growth calculations
   */
  static async getRevenueTrends(
    businessId: string,
    period: '7d' | '30d' | '90d' = '30d'
  ): Promise<TimeSeriesDataPoint[]> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('scheduled_at, total_price')
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .gte('scheduled_at', calculateDateRange(period).startDate)
        .lte('scheduled_at', calculateDateRange(period).endDate)
        .order('scheduled_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch revenue trends: ${error.message}`);
      }

      // Group by day and calculate trends
      const dailyRevenue: Record<string, number> = {};
      data?.forEach(apt => {
        const dateKey = new Date(apt.scheduled_at).toISOString().split('T')[0];
        dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (apt.total_price || 0);
      });

      // Convert to time series with trend analysis
      return Object.entries(dailyRevenue)
        .map(([date, value], index, array) => {
          const previousValue = index > 0 ? array[index - 1][1] : value;
          const percentage_change = calculateGrowthRate(value, previousValue);
          
          return {
            date,
            value,
            formatted_value: formatCurrency(value),
            trend_direction: value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable',
            percentage_change: Math.round(percentage_change * 10) / 10
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get comparative analytics (current vs previous period)
   */
  static async getComparisonAnalytics(
    businessId: string,
    period: '7d' | '30d' | '90d' = '30d'
  ): Promise<ComparisonData> {
    try {
      const currentRange = calculateDateRange(period);
      
      // Calculate previous period
      const daysDiff = Math.ceil(
        (new Date(currentRange.endDate).getTime() - new Date(currentRange.startDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      
      const previousStartDate = new Date(
        new Date(currentRange.startDate).getTime() - (daysDiff + 1) * 24 * 60 * 60 * 1000
      ).toISOString();
      
      const previousEndDate = new Date(
        new Date(currentRange.endDate).getTime() - (daysDiff + 1) * 24 * 60 * 60 * 1000
      ).toISOString();

      // Fetch current period data
      const currentData = await this.getDashboardAnalytics(businessId, { period });

      // Fetch previous period data (simplified metrics)
      const { data: prevCalls } = await supabase
        .from('calls')
        .select('outcome', { count: 'exact' })
        .eq('business_id', businessId)
        .gte('started_at', previousStartDate)
        .lte('started_at', previousEndDate);

      const { data: prevAppointments } = await supabase
        .from('appointments')
        .select('status, total_price')
        .eq('business_id', businessId)
        .gte('scheduled_at', previousStartDate)
        .lte('scheduled_at', previousEndDate);

      const prevRevenue = prevAppointments?.reduce((sum, apt) => sum + (apt.total_price || 0), 0) || 0;
      const prevBookings = prevAppointments?.filter(apt => ['confirmed', 'completed'].includes(apt.status)).length || 0;

      const current_period = {
        calls: currentData.calls.total,
        revenue: parseFloat(currentData.revenue.total.replace(/[^0-9.-]/g, '')),
        bookings: currentData.appointments.confirmed
      };

      const previous_period = {
        calls: prevCalls?.length || 0,
        revenue: prevRevenue,
        bookings: prevBookings
      };

      const growth_rates = {
        calls: calculateGrowthRate(current_period.calls, previous_period.calls),
        revenue: calculateGrowthRate(current_period.revenue, previous_period.revenue),
        bookings: calculateGrowthRate(current_period.bookings, previous_period.bookings)
      };

      const trend_analysis = {
        calls: current_period.calls > previous_period.calls ? 'up' as const : 
               current_period.calls < previous_period.calls ? 'down' as const : 'stable' as const,
        revenue: current_period.revenue > previous_period.revenue ? 'up' as const :
                 current_period.revenue < previous_period.revenue ? 'down' as const : 'stable' as const,
        bookings: current_period.bookings > previous_period.bookings ? 'up' as const :
                  current_period.bookings < previous_period.bookings ? 'down' as const : 'stable' as const
      };

      return {
        current_period,
        previous_period,
        growth_rates,
        trend_analysis
      };
      
    } catch (error) {
      if (error instanceof PostgrestError) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Helper to format outcome names for display
   */
  private static formatOutcomeName(outcome: string): string {
    const outcomeMap: Record<string, string> = {
      'booked': 'Appointment Booked',
      'appointment_scheduled': 'Appointment Scheduled',
      'no_answer': 'No Answer',
      'busy': 'Line Busy',
      'voicemail': 'Voicemail',
      'follow_up_required': 'Follow-up Required',
      'not_interested': 'Not Interested',
      'callback_requested': 'Callback Requested',
      'wrong_number': 'Wrong Number',
      'unknown': 'Unknown'
    };

    return outcomeMap[outcome.toLowerCase()] || outcome;
  }

  /**
   * Get real-time dashboard data (for live updates)
   */
  static async getRealTimeKPIs(businessId: string): Promise<DashboardKPIs> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayRange: AnalyticsTimeRange = {
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString(),
        period: 'custom'
      };

      return await this.getDashboardAnalytics(businessId, { period: 'custom', ...todayRange });
    } catch (error) {
      throw new Error(`Failed to fetch real-time KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
