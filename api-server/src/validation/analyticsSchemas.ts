import { z } from 'zod';
import { AnalyticsTimeRange } from '../types/database';

// Analytics query parameters
export const dashboardAnalyticsSchema = z.object({
  // Time range parameters
  period: z.enum(['7d', '30d', '90d', '1y', 'custom'])
    .default('30d')
    .refine(val => val !== 'custom' || true, 'Custom period requires start_date and end_date'),
  
  start_date: z.string()
    .datetime('Invalid start date format')
    .optional()
    .refine(val => !val || new Date(val).getTime() < new Date().getTime(), 
            'Start date cannot be in the future'),
  
  end_date: z.string()
    .datetime('Invalid end date format')
    .optional()
    .refine(val => !val || new Date(val).getTime() <= new Date().getTime(), 
            'End date cannot be in the future'),
  
  // Comparison period for growth calculations
  compare_period: z.enum(['previous', 'year_ago'])
    .optional(),
  
  // Granularity for time-series data
  granularity: z.enum(['day', 'week', 'month'])
    .default('day'),
  
  // Filtering options
  include_calls: z.boolean().default(true),
  include_appointments: z.boolean().default(true),
  include_revenue: z.boolean().default(true),
  
  // Grouping options
  group_by: z.enum(['source', 'channel', 'service', 'customer_type'])
    .optional(),
  
  // Chart-specific parameters
  chart_type: z.enum(['dashboard', 'trends', 'distribution', 'comparison'])
    .default('dashboard'),
  
  // Timezone (for date calculations)
  timezone: z.string().default('UTC'),
  
  // Data aggregation level
  aggregation_level: z.enum(['summary', 'detailed', 'raw'])
    .default('summary')
});

// Specific analytics endpoints schemas
export const callAnalyticsSchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d'),
  
  group_by_outcome: z.boolean().default(true),
  include_conversion_rate: z.boolean().default(true),
  include_call_duration: z.boolean().default(true),
  
  filter_direction: z.enum(['inbound', 'outbound', 'all']).default('all'),
  filter_status: z.array(z.string()).optional(), // pending, completed, failed, etc.
  
  min_call_duration: z.number().min(0).optional(),
  max_call_duration: z.number().min(0).optional(),
});

export const appointmentAnalyticsSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  
  include_status_breakdown: z.boolean().default(true),
  include_revenue_analysis: z.boolean().default(true),
  include_service_breakdown: z.boolean().default(true),
  
  filter_status: z.array(z.string()).optional(), // pending, confirmed, completed, cancelled
  filter_service_category: z.array(z.string()).optional(),
  
  exclude_cancelled: z.boolean().default(true),
  include_no_shows: z.boolean().default(false),
});

export const revenueAnalyticsSchema = z.object({
  period: z.enum(['30d', '90d', '1y', 'ytd']).default('30d'),
  
  breakdown_by: z.enum(['service', 'appointment', 'source', 'customer'])
    .default('service'),
  
  include_trends: z.boolean().default(true),
  include_projections: z.boolean().default(false),
  
  exclude_refunds: z.boolean().default(true),
  include_pending: z.boolean().default(false),
  
  currency: z.string().default('USD'),
  format_currency: z.boolean().default(true),
});

export const trendingMetricsSchema = z.object({
  metrics: z.array(z.enum([
    'calls_volume',
    'appointment_bookings', 
    'revenue',
    'conversion_rate',
    'customer_satisfaction',
    'service_popularity'
  ])).min(1).max(5).default(['calls_volume', 'appointment_bookings', 'revenue']),
  
  period: z.enum(['7d', '30d', '90d']).default('30d'),
  granularity: z.enum(['hour', 'day', 'week']).default('day'),
  
  include_future_projections: z.boolean().default(false),
  smoothing_factor: z.number().min(0).max(1).default(0.3),
});

// Performance analytics schema
export const performanceAnalyticsSchema = z.object({
  metric_type: z.enum(['conversion', 'efficiency', 'quality', 'growth'])
    .default('conversion'),
  
  benchmark_type: z.enum(['industry', 'previous_period', 'target'])
    .optional(),
  
  include_cohort_analysis: z.boolean().default(false),
  include_segmentation: z.boolean().default(false),
  
  performance_targets: z.object({
    min_conversion_rate: z.number().min(0).max(100).optional(),
    target_revenue: z.number().min(0).optional(),
    max_call_duration: z.number().min(0).optional(),
  }).optional(),
});

// Utility functions for analytics
export function calculateDateRange(period: string): AnalyticsTimeRange {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // End of day
  
  const startDate = new Date(endDate);
  
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 6); // Include current day
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 29);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 89);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 29); // Default to 30 days
  }
  
  startDate.setHours(0, 0, 0, 0); // Start of day
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    period: period as any
  };
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function groupTimeSeriesData(
  data: Array<{ date: string; value: number }>,
  granularity: 'day' | 'week' | 'month'
): Array<{ date: string; value: number }> {
  const grouped = new Map<string, { value: number; count: number }>();
  
  data.forEach(item => {
    const date = new Date(item.date);
    let key: string;
    
    switch (granularity) {
      case 'week':
        // Get Monday of the week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1);
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      default: // day
        key = date.toISOString().split('T')[0];
    }
    
    const existing = grouped.get(key) || { value: 0, count: 0 };
    grouped.set(key, {
      value: existing.value + item.value,
      count: existing.count + 1
    });
  });
  
  return Array.from(grouped.entries()).map(([date, data]) => ({
    date,
    value: granularity === 'day' ? data.value : data.value / data.count
  }));
}

// Validate date range is reasonable
export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  // Start date should be before end date
  if (start >= end) return false;
  
  // Range should not exceed 2 years
  const maxRange = new Date(start.getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
  if (end > maxRange) return false;
  
  // End date should not be in the future
  if (end > now) return false;
  
  return true;
}

// Type exports
export type DashboardAnalyticsQuery = z.infer<typeof dashboardAnalyticsSchema>;
export type CallAnalyticsQuery = z.infer<typeof callAnalyticsSchema>;
export type AppointmentAnalyticsQuery = z.infer<typeof appointmentAnalyticsSchema>;
export type RevenueAnalyticsQuery = z.infer<typeof revenueAnalyticsSchema>;
export type TrendingMetricsQuery = z.infer<typeof trendingMetricsSchema>;
export type PerformanceAnalyticsQuery = z.infer<typeof performanceAnalyticsSchema>;

// Common analytics response interfaces
export interface AnalyticsResponse<T = any> {
  success: boolean;
  data: T;
  metadata: {
    period: AnalyticsTimeRange;
    generated_at: string;
    query_time_ms: number;
    total_records: number;
    filters_applied: string[];
  };
}

export interface ChartDataPoint {
  label: string;
  value: number;
  formatted_value?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  formatted_value?: string;
  trend_direction?: 'up' | 'down' | 'stable';
  percentage_change?: number;
}

export interface ComparisonData {
  current_period: Record<string, number>;
  previous_period: Record<string, number>;
  growth_rates: Record<string, number>;
  trend_analysis: Record<string, 'up' | 'down' | 'stable'>;
}

export interface DashboardKPIs {
  calls: {
    total: number;
    answered: number;
    missed: number;
    conversion_rate: number;
    average_duration: number;
  };
  appointments: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    conversion_rate: number;
    no_show_rate: number;
  };
  revenue: {
    total: string;
    daily_average: string;
    growth_rate: number;
    projected_monthly: string;
  };
  customers: {
    total: number;
    active: number;
    new_this_period: number;
    retention_rate: number;
  };
}
