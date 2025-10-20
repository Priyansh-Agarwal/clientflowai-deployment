import { Router, Request, Response } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { dashboardAnalyticsSchema } from '../validation/analyticsSchemas';

const router = Router();

/**
 * @route   GET /analytics/dashboard
 * @desc    Main dashboard analytics endpoint with comprehensive KPIs
 * @access  Private (authenticated users)
 * @query   period?, start_date?, end_date?, granularity?, chart_type?, aggregation_level?
 * 
 * Returns:
 * - Total calls, answered calls, total appointments, confirmed appointments, total revenue
 * - Call outcome distribution (booked, no_answer, follow_up, etc.)
 * - 30-day daily metrics with SQL GROUP BY aggregation
 * - Chart-ready data formats for frontend visualization
 */
router.get('/dashboard', 
  authenticateToken,
  validateQuery(dashboardAnalyticsSchema),
  AnalyticsController.getDashboardAnalytics
);


/**
 * @route   GET /analytics/calls
 * @desc    Call-specific analytics with outcome distribution
 * @access  Private (authenticated users)
 * @query   period?, include_conversion_rate?, include_call_duration?, filter_direction?
 */
router.get('/calls',
  authenticateToken,
  AnalyticsController.getCallAnalytics
);

/**
 * @route   GET /analytics/revenue
 * @desc    Revenue analytics with trends and growth calculations
 * @access  Private (authenticated users)
 * @query   period?, breakdown_by?, include_trends?, include_projections?
 */
router.get('/revenue',
  authenticateToken,
  AnalyticsController.getRevenueAnalytics
);

/**
 * @route   GET /analytics/appointments
 * @desc    Appointment analytics with conversion and status metrics
 * @access  Private (authenticated users)
 * @query   period?, include_status_breakdown?, include_revenue_analysis?, filter_status?
 */
router.get('/appointments',
  authenticateToken,
  AnalyticsController.getAppointmentAnalytics
);

/**
 * @route   GET /analytics/realtime
 * @desc    Real-time dashboard metrics (today's data only)
 * @access  Private (authenticated users)
 */
router.get('/realtime',
  authenticateToken,
  AnalyticsController.getRealTimeAnalytics
);

/**
 * @route   GET /analytics/export
 * @desc    Export analytics data in different formats
 * @access  Private (authenticated users)
 * @query   period?, format? (json|csv)
 */
router.get('/export',
  authenticateToken,
  AnalyticsController.exportAnalytics
);

/**
 * @route   GET /analytics/health
 * @desc    Analytics system health check
 * @access  Private (authenticated users)
 */
router.get('/health',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Quick health check for analytics system
      const businessId = req.businessId!;
      const testQuery = {
        period: '7d' as const,
        granularity: 'day' as const,
        chart_type: 'dashboard' as const,
        aggregation_level: 'summary' as const
      };

      // Perform minimal analytics query to check system health
      const startTime = Date.now();
      await AnalyticsController.getDashboardAnalytics(req, res);
      const queryTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          system_status: 'healthy',
          response_time_ms: queryTime,
          last_checked: new Date().toISOString(),
          business_id: businessId
        }
      });
    } catch (error) {
      console.error('Analytics health check error:', error);
      res.status(503).json({
        success: false,
        data: {
          system_status: 'unhealthy',
          error: 'Analytics system unavailable',
          last_checked: new Date().toISOString()
        }
      });
    }
  }
);

export default router;
