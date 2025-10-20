// ClientFlow AI Suite - Advanced Reporting & Business Intelligence
// Complete reporting system with custom reports, scheduled delivery, and executive dashboards

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Report Templates Configuration
const REPORT_TEMPLATES = {
  executive_summary: {
    name: 'Executive Summary',
    description: 'High-level business metrics and KPIs',
    sections: ['revenue', 'contacts', 'deals', 'conversion', 'team_performance'],
    frequency: ['weekly', 'monthly', 'quarterly']
  },
  sales_performance: {
    name: 'Sales Performance',
    description: 'Detailed sales metrics and pipeline analysis',
    sections: ['pipeline_value', 'conversion_rates', 'sales_velocity', 'forecasting'],
    frequency: ['daily', 'weekly', 'monthly']
  },
  customer_analytics: {
    name: 'Customer Analytics',
    description: 'Customer behavior and engagement metrics',
    sections: ['customer_lifecycle', 'engagement_score', 'retention_rate', 'satisfaction'],
    frequency: ['weekly', 'monthly']
  },
  team_productivity: {
    name: 'Team Productivity',
    description: 'Team performance and productivity metrics',
    sections: ['activity_levels', 'task_completion', 'response_times', 'goals'],
    frequency: ['weekly', 'monthly']
  },
  financial_report: {
    name: 'Financial Report',
    description: 'Revenue, costs, and profitability analysis',
    sections: ['revenue_breakdown', 'cost_analysis', 'profitability', 'forecasting'],
    frequency: ['monthly', 'quarterly']
  }
};

// Generate Executive Summary Report
router.post('/reports/executive-summary', async (req, res) => {
  try {
    const { organizationId, period = 'monthly', format = 'pdf' } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    // Calculate date range
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
    }

    // Gather comprehensive data
    const [
      revenueData,
      contactData,
      dealData,
      teamData,
      messageData
    ] = await Promise.all([
      getRevenueMetrics(organizationId, startDate, endDate),
      getContactMetrics(organizationId, startDate, endDate),
      getDealMetrics(organizationId, startDate, endDate),
      getTeamMetrics(organizationId, startDate, endDate),
      getMessageMetrics(organizationId, startDate, endDate)
    ]);

    // Generate report data
    const reportData = {
      period: period,
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      executive_summary: {
        total_revenue: revenueData.total,
        revenue_growth: revenueData.growth_rate,
        total_contacts: contactData.total,
        contact_growth: contactData.growth_rate,
        active_deals: dealData.active,
        conversion_rate: dealData.conversion_rate,
        team_productivity: teamData.productivity_score
      },
      key_metrics: {
        revenue: revenueData,
        contacts: contactData,
        deals: dealData,
        team: teamData,
        communication: messageData
      },
      insights: generateInsights(revenueData, contactData, dealData, teamData),
      recommendations: generateRecommendations(revenueData, contactData, dealData, teamData)
    };

    if (format === 'pdf') {
      const pdfBuffer = await generatePDFReport(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="executive_summary.pdf"');
      res.send(pdfBuffer);
    } else if (format === 'excel') {
      const excelBuffer = await generateExcelReport(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="executive_summary.xlsx"');
      res.send(excelBuffer);
    } else {
      res.json({
        success: true,
        data: reportData
      });
    }
  } catch (error) {
    console.error('Error generating executive summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate executive summary report'
    });
  }
});

// Custom Report Builder
router.post('/reports/custom', async (req, res) => {
  try {
    const { 
      organizationId, 
      name, 
      description, 
      metrics, 
      filters, 
      groupBy, 
      dateRange,
      format = 'json'
    } = req.body;
    
    if (!organizationId || !name || !metrics) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, name, and metrics required'
      });
    }

    // Build dynamic query based on metrics and filters
    const queryBuilder = buildCustomQuery(metrics, filters, groupBy, dateRange);
    
    // Execute query
    const { data: reportData, error } = await supabase
      .from(queryBuilder.table)
      .select(queryBuilder.select)
      .eq('organization_id', organizationId);

    if (error) throw error;

    // Process and format data
    const processedData = processCustomReportData(reportData, metrics, groupBy);

    // Save custom report template
    await supabase
      .from('custom_reports')
      .insert({
        organization_id: organizationId,
        name: name,
        description: description,
        metrics: metrics,
        filters: filters,
        group_by: groupBy,
        created_at: new Date().toISOString()
      });

    res.json({
      success: true,
      data: {
        report_name: name,
        data: processedData,
        metadata: {
          total_records: reportData.length,
          generated_at: new Date().toISOString(),
          filters_applied: filters
        }
      }
    });
  } catch (error) {
    console.error('Error generating custom report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate custom report'
    });
  }
});

// Scheduled Reports
router.post('/reports/schedule', async (req, res) => {
  try {
    const {
      organizationId,
      reportType,
      frequency,
      recipients,
      format = 'pdf',
      timezone = 'UTC'
    } = req.body;
    
    if (!organizationId || !reportType || !frequency || !recipients) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, report type, frequency, and recipients required'
      });
    }

    // Create scheduled report
    const { data: scheduledReport, error } = await supabase
      .from('scheduled_reports')
      .insert({
        organization_id: organizationId,
        report_type: reportType,
        frequency: frequency,
        recipients: recipients,
        format: format,
        timezone: timezone,
        is_active: true,
        next_run: calculateNextRun(frequency, timezone),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule cron job
    scheduleReportJob(scheduledReport);

    res.json({
      success: true,
      data: scheduledReport
    });
  } catch (error) {
    console.error('Error scheduling report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule report'
    });
  }
});

// Real-time Dashboard Data
router.get('/dashboard/realtime', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    const { metrics = 'all' } = req.query;
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    // Get real-time metrics
    const realtimeData = await Promise.all([
      getRealtimeContacts(orgId),
      getRealtimeDeals(orgId),
      getRealtimeMessages(orgId),
      getRealtimeRevenue(orgId),
      getRealtimeTeamActivity(orgId)
    ]);

    const [contacts, deals, messages, revenue, teamActivity] = realtimeData;

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        metrics: {
          contacts: contacts,
          deals: deals,
          messages: messages,
          revenue: revenue,
          team_activity: teamActivity
        },
        trends: {
          contacts_trend: calculateTrend(contacts.current, contacts.previous),
          deals_trend: calculateTrend(deals.current, deals.previous),
          revenue_trend: calculateTrend(revenue.current, revenue.previous)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching real-time dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time dashboard data'
    });
  }
});

// Data Export for External BI Tools
router.get('/export/bi-tools', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'];
    const { tool = 'powerbi', format = 'json' } = req.query;
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID required'
      });
    }

    // Get comprehensive data for BI tools
    const biData = await getBIData(orgId, tool);

    if (format === 'csv') {
      const csvData = convertToCSV(biData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="clientflow_bi_data.csv"');
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: biData,
        metadata: {
          tool: tool,
          exported_at: new Date().toISOString(),
          record_count: biData.length
        }
      });
    }
  } catch (error) {
    console.error('Error exporting BI data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export BI data'
    });
  }
});

// Helper Functions
async function getRevenueMetrics(orgId, startDate, endDate) {
  const { data: deals } = await supabase
    .from('deals')
    .select('value_cents, stage, created_at')
    .eq('organization_id', orgId)
    .eq('stage', 'won')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const total = deals?.reduce((sum, deal) => sum + deal.value_cents, 0) || 0;
  
  // Get previous period for comparison
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - periodLength);
  const prevEndDate = new Date(endDate.getTime() - periodLength);
  
  const { data: prevDeals } = await supabase
    .from('deals')
    .select('value_cents')
    .eq('organization_id', orgId)
    .eq('stage', 'won')
    .gte('created_at', prevStartDate.toISOString())
    .lte('created_at', prevEndDate.toISOString());

  const previous = prevDeals?.reduce((sum, deal) => sum + deal.value_cents, 0) || 0;
  const growthRate = previous > 0 ? ((total - previous) / previous) * 100 : 0;

  return {
    total: total / 100,
    previous: previous / 100,
    growth_rate: growthRate,
    deal_count: deals?.length || 0
  };
}

async function getContactMetrics(orgId, startDate, endDate) {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('created_at')
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const total = contacts?.length || 0;
  
  // Get previous period
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - periodLength);
  const prevEndDate = new Date(endDate.getTime() - periodLength);
  
  const { data: prevContacts } = await supabase
    .from('contacts')
    .select('created_at')
    .eq('organization_id', orgId)
    .gte('created_at', prevStartDate.toISOString())
    .lte('created_at', prevEndDate.toISOString());

  const previous = prevContacts?.length || 0;
  const growthRate = previous > 0 ? ((total - previous) / previous) * 100 : 0;

  return {
    total: total,
    previous: previous,
    growth_rate: growthRate
  };
}

async function getDealMetrics(orgId, startDate, endDate) {
  const { data: deals } = await supabase
    .from('deals')
    .select('stage, value_cents, created_at')
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const active = deals?.filter(deal => ['lead', 'qualified', 'proposal'].includes(deal.stage)).length || 0;
  const won = deals?.filter(deal => deal.stage === 'won').length || 0;
  const total = deals?.length || 0;
  const conversionRate = total > 0 ? (won / total) * 100 : 0;

  return {
    active: active,
    won: won,
    total: total,
    conversion_rate: conversionRate,
    pipeline_value: deals?.reduce((sum, deal) => sum + deal.value_cents, 0) / 100 || 0
  };
}

async function getTeamMetrics(orgId, startDate, endDate) {
  const { data: activities } = await supabase
    .from('user_activities')
    .select('user_id, activity_type, created_at')
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const uniqueUsers = new Set(activities?.map(activity => activity.user_id) || []).size;
  const totalActivities = activities?.length || 0;
  const productivityScore = uniqueUsers > 0 ? totalActivities / uniqueUsers : 0;

  return {
    active_users: uniqueUsers,
    total_activities: totalActivities,
    productivity_score: productivityScore
  };
}

async function getMessageMetrics(orgId, startDate, endDate) {
  const { data: messages } = await supabase
    .from('messages')
    .select('channel, direction, created_at')
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const total = messages?.length || 0;
  const inbound = messages?.filter(msg => msg.direction === 'inbound').length || 0;
  const outbound = messages?.filter(msg => msg.direction === 'outbound').length || 0;

  return {
    total: total,
    inbound: inbound,
    outbound: outbound,
    response_rate: inbound > 0 ? (outbound / inbound) * 100 : 0
  };
}

function generateInsights(revenue, contacts, deals, team) {
  const insights = [];
  
  if (revenue.growth_rate > 20) {
    insights.push('Revenue growth is strong at ' + revenue.growth_rate.toFixed(1) + '%');
  } else if (revenue.growth_rate < 0) {
    insights.push('Revenue declined by ' + Math.abs(revenue.growth_rate).toFixed(1) + '% - immediate attention needed');
  }
  
  if (deals.conversion_rate > 25) {
    insights.push('High conversion rate of ' + deals.conversion_rate.toFixed(1) + '% indicates effective sales process');
  } else if (deals.conversion_rate < 10) {
    insights.push('Low conversion rate of ' + deals.conversion_rate.toFixed(1) + '% suggests need for sales process improvement');
  }
  
  if (team.productivity_score > 50) {
    insights.push('Team productivity is high with ' + team.productivity_score.toFixed(1) + ' activities per user');
  }
  
  return insights;
}

function generateRecommendations(revenue, contacts, deals, team) {
  const recommendations = [];
  
  if (revenue.growth_rate < 10) {
    recommendations.push('Focus on increasing deal values and improving conversion rates');
  }
  
  if (deals.conversion_rate < 15) {
    recommendations.push('Implement sales training and improve lead qualification process');
  }
  
  if (team.productivity_score < 30) {
    recommendations.push('Provide additional training and tools to improve team productivity');
  }
  
  return recommendations;
}

async function generatePDFReport(data) {
  const doc = new PDFDocument();
  const buffers = [];
  
  doc.on('data', buffers.push.bind(buffers));
  
  // Add content to PDF
  doc.fontSize(20).text('Executive Summary Report', 50, 50);
  doc.fontSize(12).text(`Period: ${data.period}`, 50, 100);
  doc.text(`Date Range: ${data.date_range.start} to ${data.date_range.end}`, 50, 120);
  
  // Add metrics
  doc.text(`Total Revenue: $${data.executive_summary.total_revenue.toFixed(2)}`, 50, 160);
  doc.text(`Revenue Growth: ${data.executive_summary.revenue_growth.toFixed(1)}%`, 50, 180);
  doc.text(`Total Contacts: ${data.executive_summary.total_contacts}`, 50, 200);
  doc.text(`Conversion Rate: ${data.executive_summary.conversion_rate.toFixed(1)}%`, 50, 220);
  
  // Add insights
  doc.text('Key Insights:', 50, 260);
  data.insights.forEach((insight, index) => {
    doc.text(`• ${insight}`, 70, 280 + (index * 20));
  });
  
  doc.end();
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}

async function generateExcelReport(data) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Executive Summary');
  
  // Add headers
  worksheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
    { header: 'Growth Rate', key: 'growth', width: 20 }
  ];
  
  // Add data
  worksheet.addRow({ metric: 'Total Revenue', value: `$${data.executive_summary.total_revenue.toFixed(2)}`, growth: `${data.executive_summary.revenue_growth.toFixed(1)}%` });
  worksheet.addRow({ metric: 'Total Contacts', value: data.executive_summary.total_contacts, growth: `${data.executive_summary.contact_growth.toFixed(1)}%` });
  worksheet.addRow({ metric: 'Active Deals', value: data.executive_summary.active_deals, growth: '' });
  worksheet.addRow({ metric: 'Conversion Rate', value: `${data.executive_summary.conversion_rate.toFixed(1)}%`, growth: '' });
  
  return await workbook.xlsx.writeBuffer();
}

function calculateNextRun(frequency, timezone) {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

function scheduleReportJob(scheduledReport) {
  const cronExpression = getCronExpression(scheduledReport.frequency);
  
  cron.schedule(cronExpression, async () => {
    try {
      // Generate and send report
      await generateAndSendScheduledReport(scheduledReport);
      
      // Update next run time
      const nextRun = calculateNextRun(scheduledReport.frequency, scheduledReport.timezone);
      await supabase
        .from('scheduled_reports')
        .update({ next_run: nextRun.toISOString() })
        .eq('id', scheduledReport.id);
    } catch (error) {
      console.error('Error in scheduled report job:', error);
    }
  });
}

function getCronExpression(frequency) {
  switch (frequency) {
    case 'daily':
      return '0 9 * * *'; // 9 AM daily
    case 'weekly':
      return '0 9 * * 1'; // 9 AM every Monday
    case 'monthly':
      return '0 9 1 * *'; // 9 AM on 1st of every month
    default:
      return '0 9 * * *'; // Default to daily
  }
}

async function generateAndSendScheduledReport(scheduledReport) {
  // Generate report based on type
  const reportData = await generateReportData(scheduledReport);
  
  // Send via email
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: scheduledReport.recipients.join(', '),
    subject: `ClientFlow AI Suite - ${scheduledReport.report_type} Report`,
    html: generateEmailHTML(reportData),
    attachments: [
      {
        filename: `${scheduledReport.report_type}_report.pdf`,
        content: await generatePDFReport(reportData)
      }
    ]
  };
  
  await transporter.sendMail(mailOptions);
}

module.exports = router;
