import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { DashboardAnalyticsQuery } from '../validation/analyticsSchemas';

export class AnalyticsController {
  /**
   * GET /analytics/dashboard - Main dashboard analytics endpoint
   * Aggregates total calls, answered calls, appointments, revenue, outcome distribution,
   * and 30-day metrics with SQL GROUP BY queries
   */
  static async getDashboardAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const query: DashboardAnalyticsQuery = req.query;

      // Validate query parameters
      if (query.period === 'custom' && (!query.start_date || !query.end_date)) {
        res.status(400).json({
          error: 'Invalid parameters',
          message: 'Custom period requires both start_date and end_date'
        });
        return;
      }

      const startTime = Date.now();

      // Get comprehensive dashboard analytics
      const [dashboardKPIs, callOutcomes, dailyMetrics, comparison, revenueTrends] = await Promise.all([
        AnalyticsService.getDashboardAnalytics(businessId, query),
        AnalyticsService.getCallOutcomeDistribution(businessId, {
          startDate: query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: query.end_date || new Date().toISOString(),
          period: query.period || '30d'
        }),
        AnalyticsService.getDailyMetrics(businessId, query.period === '7d' ? 7 : 30),
        AnalyticsService.getComparisonAnalytics(businessId, query.period as any || '30d'),
        AnalyticsService.getRevenueTrends(businessId, query.period as any || '30d')
      ]);

      const queryTime = Date.now() - startTime;

      // Format response for dashboard charts
      const response = {
        success: true,
        data: {
          // Main KPIs
          kpis: dashboardKPIs,
          
          // Call outcome distribution for pie charts
          callOutcomeDistribution: callOutcomes,
          
          // 30-day metrics for time series charts
          dailyMetrics: dailyMetrics,
          
          // Revenue trends
          revenueTrends: revenueTrends,
          
          // Period comparison for growth indicators
          comparison: comparison,
          
          // Chart-ready data formats
          charts: {
            // Pie chart data for call outcomes
            callOutcomePie: callOutcomes.map(item => ({
              label: item.outcome,
              value: item.count,
              percentage: item.percentage
            })),
            
            // Line chart data for daily metrics
            dailyTrendsLine: dailyMetrics.map(day => ({
              date: day.date,
              calls: day.calls,
              appointments: day.appointments,
              revenue: day.revenue,
              bookings: day.bookings
            })),
            
            // Bar chart data for revenue trends
            revenueBar: revenueTrends.slice(-7).map(trend => ({
              date: trend.date,
              value: trend.value,
              formatted_value: trend.formatted_value,
              growth: trend.percentage_change
            })),
            
            // Growth indicators for comparison charts
            growthIndicators: {
              revenue: {
                current: comparison.current_period.revenue,
                previous: comparison.previous_period.revenue,
                growth_rate: comparison.growth_rates.revenue,
                trend: comparison.trend_analysis.revenue
              },
              bookings: {
                current: comparison.current_period.bookings,
                previous: comparison.previous_period.bookings,
                growth_rate: comparison.growth_rates.bookings,
                trend: comparison.trend_analysis.bookings
              },
              calls: {
                current: comparison.current_period.calls,
                previous: comparison.previous_period.calls,
                growth_rate: comparison.growth_rates.calls,
                trend: comparison.trend_analysis.calls
              }
            }
          }
        },
        
        metadata: {
          period: {
            start_date: query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end_date: query.end_date || new Date().toISOString(),
            period: query.period || '30d'
          },
          generated_at: new Date().toISOString(),
          query_time_ms: queryTime,
          total_records: {
            calls: callOutcomes.reduce((sum, item) => sum + item.count, 0),
            appointments: dashboardKPIs.appointments.total,
            customers: dashboardKPIs.customers.total
          },
          filters_applied: [
            `business_id=${businessId}`,
            `period=${query.period || '30d'}`,
            query.start_date && query.end_date ? 'custom_date_range' : null
          ].filter(Boolean)
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Dashboard analytics error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid date range')) {
          res.status(400).json({
            error: 'Validation failed',
            message: error.message
          });
          return;
        }
        if (error.message.includes('Database error')) {
          res.status(500).json({
            error: 'Database error',
            message: 'Failed to fetch analytics data'
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate dashboard analytics'
      });
    }
  }

  /**
   * GET /analytics/calls - Call-specific analytics
   */
  static async getCallAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const period = (req.query.period as string) || '30d';
      
      const startTime = Date.now();
      
      const dateRange = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        period: period as any
      };

      const [callOutcomes, dailyCalls] = await Promise.all([
        AnalyticsService.getCallOutcomeDistribution(businessId, dateRange),
        AnalyticsService.getDailyMetrics(businessId, 30)
      ]);

      const queryTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalCalls: callOutcomes.reduce((sum, item) => sum + item.count, 0),
            outcomes: callOutcomes
          },
          dailyBreakdown: dailyCalls.map(day => ({
            date: day.date,
            calls: day.calls
          })),
          charts: {
            outcomeDistribution: callOutcomes.map(item => ({
              label: item.outcome,
              value: item.percentage,
              count: item.count
            })),
            dailyTrend: dailyCalls.map(day => ({
              date: day.date,
              calls: day.calls
            }))
          }
        },
        metadata: {
          generated_at: new Date().toISOString(),
          query_time_ms: queryTime,
          period: dateRange.period
        }
      });
    } catch (error) {
      console.error('Call analytics error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch call analytics'
      });
    }
  }

  /**
   * GET /analytics/revenue - Revenue-specific analytics
   */
  static async getRevenueAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const period = (req.query.period as string) || '30d';
      
      const startTime = Date.now();
      
      const [dashboardKPIs, revenueTrends, comparison] = await Promise.all([
        AnalyticsService.getDashboardAnalytics(businessId, { period: period as any }),
        AnalyticsService.getRevenueTrends(businessId, period as any),
        AnalyticsService.getComparisonAnalytics(businessId, period as any)
      ]);

      const queryTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          summary: {
            current_period_revenue: dashboardKPIs.revenue.total,
            daily_average: dashboardKPIs.revenue.daily_average,
            growth_rate: dashboardKPIs.revenue.growth_rate,
            projected_monthly: dashboardKPIs.revenue.projected_monthly
          },
          trends: revenueTrends,
          comparison: {
            current: comparison.current_period.revenue,
            previous: comparison.previous_period.revenue,
            growth_rate: comparison.growth_rates.revenue,
            trend_direction: comparison.trend_analysis.revenue
          },
          charts: {
            revenueTrend: revenueTrends.map(trend => ({
              date: trend.date,
              value: trend.value,
              formatted_value: trend.formatted_value
            })),
            dailyRevenue: revenueTrends.slice(-7).map(day => ({
              date: day.date,
              revenue: day.value,
              growth: day.percentage_change
            }))
          }
        },
        metadata: {
          generated_at: new Date().toISOString(),
          query_time_ms: queryTime,
          period
        }
      });
    } catch (error) {
      console.error('Revenue analytics error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch revenue analytics'
      });
    }
  }

  /**
   * GET /analytics/appointments - Appointment-specific analytics
   */
  static async getAppointmentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const period = (req.query.period as string) || '30d';
      
      const startTime = Date.now();
      
      const [dashboardKPIs, dailyMetrics] = await Promise.all([
        AnalyticsService.getDashboardAnalytics(businessId, { period: period as any }),
        AnalyticsService.getDailyMetrics(businessId, 30)
      ]);

      const queryTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalAppointments: dashboardKPIs.appointments.total,
            confirmedAppointments: dashboardKPIs.appointments.confirmed,
            completedAppointments: dashboardKPIs.appointments.completed,
            cancelledAppointments: dashboardKPIs.appointments.cancelled,
            conversionRate: dashboardKPIs.appointments.conversion_rate,
            noShowRate: dashboardKPIs.appointments.no_show_rate
          },
          dailyBreakdown: dailyMetrics.map(day => ({
            date: day.date,
            appointments: day.appointments,
            bookings: day.bookings
          })),
          charts: {
            statusDistribution: [
              { label: 'Confirmed', value: dashboardKPIs.appointments.confirmed },
              { label: 'Completed', value: dashboardKPIs.appointments.completed },
              { label: 'Cancelled', value: dashboardKPIs.appointments.cancelled }
            ],
            dailyAppointments: dailyMetrics.map(day => ({
              date: day.date,
              appointments: day.appointments,
              bookings: day.bookings
            }))
          }
        },
        metadata: {
          generated_at: new Date().toISOString(),
          query_time_ms: queryTime,
          period
        }
      });
    } catch (error) {
      console.error('Appointment analytics error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch appointment analytics'
      });
    }
  }

  /**
   * GET /analytics/realtime - Real-time dashboard metrics
   */
  static async getRealTimeAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      
      AnalyticsService.getRealTimeKPIs(businessId)
        .then(kpis => {
          res.status(200).json({
            success: true,
            data: {
              ...kpis,
              generated_at: new Date().toISOString(),
              time_range: 'today'
            }
          });
        })
        .catch(error => {
          console.error('Real-time analytics error:', error);
          res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch real-time analytics'
          });
        });
    } catch (error) {
      console.error('Real-time analytics sync error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process real-time analytics request'
      });
    }
  }

  /**
   * GET /analytics/export - Export analytics data
   */
  static async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const businessId = req.businessId!;
      const format = (req.query.format as string) || 'json';
      const period = (req.query.period as string) || '30d';

      // Get all analytics data
      const analyticsData = await AnalyticsService.getDashboardAnalytics(businessId, { 
        period: period as any 
      });

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(analyticsData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${period}-${Date.now()}.csv"`);
        res.status(200).send(csvData);
      } else {
        // JSON export with metadata
        res.status(200).json({
          success: true,
          data: analyticsData,
          metadata: {
            exported_at: new Date().toISOString(),
            format: 'json',
            period,
            business_id: businessId
          }
        });
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to export analytics data'
      });
    }
  }

  /**
   * Helper to convert analytics data to CSV format
   */
  private static convertToCSV(data: any): string {
    const headers = ['Metric', 'Value', 'Type'];
    const rows = [];

    // Convert KPIs to CSV rows
    Object.entries(data.calls).forEach(([key, value]) => {
      rows.push(['calls.' + key, value, 'calls']);
    });

    Object.entries(data.appointments).forEach(([key, value]) => {
      rows.push(['appointments.' + key, value, 'appointments']);
    });

    Object.entries(data.customers).forEach(([key, value]) => {
      rows.push(['customers.' + key, value, 'customers']);
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    return csvContent;
  }
}
