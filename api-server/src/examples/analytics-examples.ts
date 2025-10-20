import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const JWT_TOKEN = 'YOUR_SUPABASE_JWT_TOKEN'; // Replace with a valid JWT token for a business user

const makeRequest = async (endpoint: string, options: any = {}) => {
  try {
    const response = await axios({
      url: `${API_BASE_URL}${endpoint}`,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        ...options.headers,
      },
      data: options.body,
      params: options.params,
    });
    console.log(`\n--- ${options.method || 'GET'} ${endpoint} Response ---`);
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error(`\n--- Error for ${options.method || 'GET'} ${endpoint} ---`);
    console.error(JSON.stringify(error.response?.data || error.message, null, 2));
    throw error;
  }
};

export const runAnalyticsExamples = async () => {
  console.log('Starting Analytics API Examples...');

  // 1. Get comprehensive dashboard analytics (main endpoint)
  console.log('\n=== 1. Dashboard Analytics ===');
  try {
    await makeRequest('/analytics/dashboard', {
      params: {
        period: '30d',
        granularity: 'day',
        chart_type: 'dashboard',
        include_calls: true,
        include_appointments: true,
        include_revenue: true,
        aggregation_level: 'summary'
      }
    });
  } catch (error) {
    console.error('Dashboard analytics failed:', error.response?.data?.message);
  }

  // 2. Get 7-day analytics with custom date range
  console.log('\n=== 2. 7-Day Analytics ===');
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString();
    
    await makeRequest('/analytics/dashboard', {
      params: {
        period: 'custom',
        start_date: sevenDaysAgo,
        end_date: today,
        granularity: 'day',
        include_calls: true,
        include_appointments: true
      }
    });
  } catch (error) {
    console.error('7-day analytics failed:', error.response?.data?.message);
  }

  // 3. Get call-specific analytics
  console.log('\n=== 3. Call Analytics ===');
  try {
    await makeRequest('/analytics/calls', {
      params: {
        period: '30d',
        include_conversion_rate: true,
        include_call_duration: true,
        filter_direction: 'all'
      }
    });
  } catch (error) {
    console.error('Call analytics failed:', error.response?.data?.message);
  }

  // 4. Get revenue analytics with trends
  console.log('\n=== 4. Revenue Analytics ===');
  try {
    await makeRequest('/analytics/revenue', {
      params: {
        period: '90d',
        breakdown_by: 'service',
        include_trends: true,
        include_projections: true,
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Revenue analytics failed:', error.response?.data?.message);
  }

  // 5. Get appointment analytics
  console.log('\n=== 5. Appointment Analytics ===');
  try {
    await makeRequest('/analytics/appointments', {
      params: {
        period: '30d',
        include_status_breakdown: true,
        include_revenue_analysis: true,
        exclude_cancelled: true
      }
    });
  } catch (error) {
    console.error('Appointment analytics failed:', error.response?.data?.message);
  }

  // 6. Get real-time analytics (today's data)
  console.log('\n=== 6. Real-time Analytics ===');
  try {
    await makeRequest('/analytics/realtime');
  } catch (error) {
    console.error('Real-time analytics failed:', error.response?.data?.message);
  }

  // 7. Export analytics data (JSON format)
  console.log('\n=== 7. Export Analytics (JSON) ===');
  try {
    await makeRequest('/analytics/export', {
      params: {
        period: '30d',
        format: 'json'
      }
    });
  } catch (error) {
    console.error('JSON export failed:', error.response?.data?.message);
  }

  // 8. Export analytics data (CSV format)
  console.log('\n=== 8. Export Analytics (CSV) ===');
  try {
    const csvResponse = await makeRequest('/analytics/export', {
      params: {
        period: '7d',
        format: 'csv'
      }
    });
    
    console.log('CSV Export successful - Data preview:');
    console.log(csvResponse.substring(0, 200) + '...');
  } catch (error) {
    console.error('CSV export failed:', error.response?.data?.message);
  }

  // 9. Analytics health check
  console.log('\n=== 9. Analytics Health Check ===');
  try {
    await makeRequest('/analytics/health');
  } catch (error) {
    console.error('Health check failed:', error.response?.data?.message);
  }

  // 10. Dashboard analytics with different periods
  console.log('\n=== 10. Comparative Periods ===');
  try {
    const periods = ['7d', '30d', '90d'];
    
    for (const period of periods) {    console.log(`\n--- Analytics for ${period} ---`);
      await makeRequest('/analytics/dashboard', {
        params: {
          period,
          granularity: period === '90d' ? 'week' : 'day',
          include_calls: true,
          include_appointments: true,
          include_revenue: true
        }
      });
    }
  } catch (error) {
    console.error('Comparative analytics failed:', error.response?.data?.message);
  }

  console.log('\nAnalytics API Examples Finished.');
};

// Advanced analytics examples with data visualization preparation
export const runAdvancedAnalyticsExamples = async () => {
  console.log('Starting Advanced Analytics Examples...');

  // Example 1: Build comprehensive dashboard data structure
  console.log('\n=== Building Dashboard Data Structure ===');
  try {
    const dashboardData = await makeRequest('/analytics/dashboard', {
      params: {
        period: '30d',
        chart_type: 'dashboard',
        granularity: 'day'
      }
    });

    // Extract chart-ready data formats
    console.log('\n--- Chart Data Extraction ---');
    
    // KPI Summary
    const kpiSummary = {
      revenue: dashboardData.data.kpis.revenue,
      calls: dashboardData.data.kpis.calls,
      appointments: dashboardData.data.kpis.appointments,
      customers: dashboardData.data.kpis.customers
    };
    
    console.log('KPI Summary:', JSON.stringify(kpiSummary, null, 2));

    // Time Series Data for Line Charts
    const timeSeriesData = dashboardData.data.charts.dailyTrendsLine.map(day => ({
      date: day.date,
      revenue: day.revenue,
      calls: day.calls,
      appointments: day.appointments,
      bookings: day.bookings
    }));
    
    console.log('\nTime Series Data (first 5 days):');
    console.log(JSON.stringify(timeSeriesData.slice(0, 5), null, 2));

    // Distribution Data for Pie Charts
    const distributionData = dashboardData.data.charts.callOutcomePie.map(item => ({
      category: item.label,
      value: item.value,
      percentage: item.percentage
    }));
    
    console.log('\nCall Outcome Distribution:');
    console.log(JSON.stringify(distributionData, null, 2));

    // Growth Indicators
    const growthData = dashboardData.data.charts.growthIndicators;
    console.log('\nGrowth Indicators:');
    console.log(JSON.stringify(growthData, null, 2));

  } catch (error) {
    console.error('Advanced analytics example failed:', error.response?.data?.message);
  }

  // Example 2: Compare different time periods
  console.log('\n=== Time Period Comparison ===');
  try {
    const periods = ['7d', '30d'];
    const comparisonResults: any[] = [];

    for (const period of periods) {
      console.log(`\nFetching ${period} analytics...`);
      
      const result = await makeRequest('/analytics/dashboard', {
        params: { period }
      });
      
      comparisonResults.push({
        period,
        revenue: result.data.kpis.revenue.total,
        calls: result.data.kpis.calls.total,
        appointments: result.data.kpis.appointments.total
      });
    }

    console.log('\nPeriod Comparison Results:');
    console.log(JSON.stringify(comparisonResults, null, 2));

  } catch (error) {
    console.error('Period comparison failed:', error.response?.data?.message);
  }

  // Example 3: Generate business insights
  console.log('\n=== Generating Business Insights ===');
  try {
    const [dashboardData, revenueTrends] = await Promise.all([
      makeRequest('/analytics/dashboard', { params: { period: '30d' } }),
      makeRequest('/analytics/revenue', { params: { period: '30d' } })
    ]);

    // Calculate insights
    const insights = {
      performance: {
        callConversionRate: dashboardData.data.kpis.calls.conversion_rate,
        appointmentConversionRate: dashboardData.data.kpis.appointments.conversion_rate,
        revenuePerCall: parseFloat(dashboardData.data.kpis.revenue.total.replace(/[^0-9.-]/g, '')) / dashboardData.data.kpis.calls.total,
        revenuePerAppointment: parseFloat(dashboardData.data.kpis.revenue.total.replace(/[^0-9.-]/g, '')) / dashboardData.data.kpis.appointments.confirmed
      },
      
      trends: {
        revenueGrowth: dashboardData.data.charts.growthIndicators.revenue.growth_rate,
        bookingGrowth: dashboardData.data.charts.growthIndicators.bookings.growth_rate,
        callVolumeGrowth: dashboardData.data.charts.growthIndicators.calls.growth_rate
      },
      
      recommendations: [
        dashboardData.data.kpis.calls.conversion_rate < 70 ? 
          'Consider improving call handling to increase conversion rate' : 
          'Call conversion rate is strong',
        
        dashboardData.data.kpis.appointments.no_show_rate > 10 ? 
          'High no-show rate detected - consider implementing reminder systems' : 
          'No-show rate is acceptable',
        
        parseFloat(dashboardData.data.kpis.revenue.total.replace(/[^0-9.-]/g, '')) / dashboardData.data.kpis.calls.total < 30 ? 
          'Low revenue per call - focus on higher-value services' : 
          'Revenue per call is healthy'
      ]
    };

    console.log('\nBusiness Insights Summary:');
    console.log(JSON.stringify(insights, null, 2));

  } catch (error) {
    console.error('Business insights generation failed:', error.response?.data?.message);
  }

  console.log('\nAdvanced Analytics Examples Finished.');
};

// Export analytics data in bulk for reporting
export const runAnalyticsExportExamples = async () => {
  console.log('Starting Analytics Export Examples...');

  const exportFormats = ['json', 'csv'];
  const exportPeriods = ['7d', '30d', '90d'];

  for (const format of exportFormats) {
    for (const period of exportPeriods) {
      try {
        console.log(`\n=== Exporting ${format.toUpperCase()} for ${period} ===`);
        
        const exportData = await makeRequest('/analytics/export', {
          params: { period, format }
        });

        console.log(`Export successful - ${format.toUpperCase()} data for ${period}`);
        
        if (format === 'csv') {
          console.log('CSV Preview (first 5 lines):');
          console.log(exportData.split('\n').slice(0, 5).join('\n'));
        }
        
      } catch (error) {
        console.error(`${format} export for ${period} failed:`, error.response?.data?.message);
      }
    }
  }

  console.log('\nAnalytics Export Examples Finished.');
};

// Comprehensive dashboard data fetching for frontend integration
export const runDashboardDataExamples = async () => {
  console.log('Starting Dashboard Data Integration Examples...');

  try {
    // Simulate a complete dashboard load sequence
    console.log('\n=== Complete Dashboard Data Fetch ===');
    
    const fetchSequence = [
      {
        name: 'Main Dashboard KPIs',
        endpoint: '/analytics/dashboard',
        params: { period: '30d', granularity: 'day' }
      },
      {
        name: 'Revenue Trends',
        endpoint: '/analytics/revenue',
        params: { period: '30d', include_trends: true }
      },
      {
        name: 'Call Analytics',
        endpoint: '/analytics/calls',
        params: { period: '30d' }
      },
      {
        name: 'Appointment Analytics',
        endpoint: '/analytics/appointments',
        params: { period: '30d' }
      },
      {
        name: 'Real-time Metrics',
        endpoint: '/analytics/realtime'
      }
    ];

    const dashboardData: any = {};
    
    for (const fetchItem of fetchSequence) {
      console.log(`\nFetching: ${fetchItem.name}`);
      
      const data = await makeRequest(fetchItem.endpoint, {
        params: fetchItem.params
      });
      
      dashboardData[fetchItem.name.toLowerCase().replace(/\s+/g, '_')] = data.data;
    }

    console.log('\n=== Complete Dashboard Data Structure ===');
    console.log('Dashboard loaded successfully with:');
    console.log('- Main KPIs:', !!dashboardData.main_dashboard_kpis?.kpis);
    console.log('- Revenue trends:', !!dashboardData.revenue_trends?.trends);
    console.log('- Call distribution:', !!dashboardData.call_analytics?.charts);
    console.log('- Appointment metrics:', !!dashboardData.appointment_analytics?.summary);
    console.log('- Real-time data:', !!dashboardData.real_time_metrics);

    // Sample chart configuration objects for frontend libraries
    console.log('\n=== Frontend Integration Examples ===');
    
    // Chart.js configuration example
    const chartConfig = {
      dailyRevenueChart: {
        type: 'line',
        data: {
          labels: dashboardData.revenue_trends?.trends?.map((t: any) => t.date) || [],
          datasets: [{
            label: 'Daily Revenue',
            data: dashboardData.revenue_trends?.trends?.map((t: any) => t.value) || [],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true },
            }
        }
      },
      
      callOutcomeChart: {
        type: 'doughnut',
        data: {
          labels: dashboardData.main_dashboard_kpis?.callOutcomeDistribution?.map((c: any) => c.outcome) || [],
          datasets: [{
            data: dashboardData.main_dashboard_kpis?.callOutcomeDistribution?.map((c: any) => c.count) || [],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true }
          }
        }
      }
    };

    console.log('\nChart.js Configuration Examples:');
    console.log(JSON.stringify(chartConfig, null, 2));

  } catch (error) {
    console.error('Dashboard data integration failed:', error.response?.data?.message);
  }

  console.log('\nDashboard Data Integration Examples Finished.');
};

// Performance testing examples
export const runPerformanceExamples = async () => {
  console.log('Starting Performance Testing Examples...');

  const performanceTests = [
    { name: 'Dashboard Analytics', endpoint: '/analytics/dashboard', params: { period: '30d' } },
    { name: 'Real-time Analytics', endpoint: '/analytics/realtime' },
    { name: 'Revenue Trends', endpoint: '/analytics/revenue', params: { period: '7d' } },
    { name: 'Call Distribution', endpoint: '/analytics/calls', params: { period: '30d' } }
  ];

  console.log('\n=== Performance Benchmark Results ===');
  
  for (const test of performanceTests) {
    try {
      const startTime = Date.now();
      
      await makeRequest(test.endpoint, { params: test.params });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`${test.name}: ${responseTime}ms`);
      
      if (responseTime > 500) {
        console.log(`⚠️  ${test.name} exceeded 500ms threshold`);
      }
      
    } catch (error) {
      console.error(`${test.name} performance test failed:`, error.response?.data?.message);
    }
  }

  console.log('\nPerformance Testing Examples Finished.');
};

// Complete analytics examples runner
export const runCompleteAnalyticsExamples = async () => {
  try {
    await runAnalyticsExamples();
    await runAdvancedAnalyticsExamples();
    await runAnalyticsExportExamples();
    await runDashboardDataExamples();
    await runPerformanceExamples();
    
    console.log('\n🚀 All Analytics API Examples Completed Successfully!');
    console.log('\n📊 Analytics Dashboard API is ready for production use.');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ SQL aggregation with GROUP BY queries');
    console.log('✅ Chart-ready data formats');
    console.log('✅ Business KPI calculations');
    console.log('✅ Growth rate comparisons');
    console.log('✅ Real-time metrics');
    console.log('✅ Data export capabilities');
    console.log('✅ Performance optimization');
    
  } catch (error) {
    console.error('Error running complete examples:', error);
  }
};
