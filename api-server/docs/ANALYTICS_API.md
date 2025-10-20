# Analytics Dashboard API

Real-time business intelligence and analytics dashboard with SQL aggregation queries, chart-ready data formats, and comprehensive KPI tracking. Features optimized database queries, growth calculations, and visualization-ready responses for modern dashboard interfaces.

## 🎯 Features

### Dashboard KPIs
- **Call Metrics**: Total calls, answered calls, missed calls, conversion rates, average duration
- **Appointment Analytics**: Bookings, confirmations, cancellations, no-show rates
- **Revenue Tracking**: Total revenue, daily averages, growth rates, projections
- **Customer Insights**: Total customers, active customers, retention rates, new customers

### Advanced Analytics
- **SQL Aggregation**: Optimized GROUP BY queries for performance
- **Time Series Data**: Daily metrics with trend analysis
- **Growth Calculations**: Period-over-period comparisons with percentage changes
- **Chart-Ready Formats**: Pre-formatted data for frontend visualization libraries

### Business Intelligence
- **Outcome Distribution**: Call outcomes breakdown with percentages
- **Conversion Tracking**: End-to-end conversion from calls → appointments → revenue
- **Performance Metrics**: Real-time KPIs with historical context
- **Export Capabilities**: Data export in JSON/CSV formats

---

## 📊 Analytics Dashboard Endpoints

### Authentication
```http
Authorization: Bearer <your-supabase-jwt-token>
```

---

## 🎯 Main Dashboard Analytics Endpoint

### **GET /analytics/realtime - Real-time Dashboard Metrics**

The primary endpoint for comprehensive business dashboard analytics with SQL GROUP BY aggregation.

#### Request
```http
GET /api/analytics/dashboard?period=30d&granularity=day&chart_type=dashboard&include_calls=true&include_appointments=true&include_revenue=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `period` - Time range: `7d`, `30d`, `90d`, `1y`, `custom`
- `start_date` - Custom start date (ISO string, required with `custom` period)
- `end_date` - Custom end date (ISO string, required with `custom` period)
- `compare_period` - `previous`, `year_ago` for growth calculations
- `granularity` - `day`, `week`, `month` for time series grouping
- `include_calls` - Include call metrics (default: true)
- `include_appointments` - Include appointment metrics (default: true)
- `include_revenue` - Include revenue metrics (default: true)
- `group_by` - `source`, `channel`, `service`, `customer_type`
- `chart_type` - `dashboard`, `trends`, `distribution`, `comparison`
- `timezone` - Timezone for date calculations (default: UTC)
- `aggregation_level` - `summary`, `detailed`, `raw`

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "kpis": {
      "calls": {
        "total": 1247,
        "answered": 986,
        "missed": 261,
        "conversion_rate": 79.1,
        "average_duration": 165
      },
      "appointments": {
        "total": 856,
        "confirmed": 743,
        "completed": 698,
        "cancelled": 89,
        "conversion_rate": 86.8,
        "no_show_rate": 6.1
      },
      "revenue": {
        "total": "$42,650.00",
        "daily_average": "$1,421.67",
        "growth_rate": 12.5,
        "projected_monthly": "$44,189.80"
      },
      "customers": {
        "total": 2847,
        "active": 1923
        "new_this_period": 127,
        "retention_rate": 87.3
      }
    },
    
    "callOutcomeDistribution": [
      {
        "outcome": "Appointment Booked",
        "count": 486,
        "percentage": 39.0
      },
      {
        "outcome": "Follow-up Required", 
        "count": 234,
        "percentage": 18.8
      },
      {
        "outcome": "No Answer",
        "count": 189,
        "percentage": 15.2
      },
      {
        "outcome": "Not Interested",
        "count": 156,
        "percentage": 12.5
      },
      {
        "outcome": "Line Busy",
        "count": 87,
        "percentage": 7.0
      },
      {
        "outcome": "Callback Requested",
        "count": 95,
        "percentage": 7.6
      }
    ],
    
    "dailyMetrics": [
      {
        "date": "2024-01-01",
        "bookings": 12,
        "revenue": 1450.00,
        "calls": 28,
        "appointments": 24
      },
      {
        "date": "2024-01-02", 
        "bookings": 8,
        "revenue": 980.00,
        "calls": 22,
        "appointments": 18
      }
      // ... 30 days of data
    ],
    
    "charts": {
      "callOutcomePie": [
        {
          "label": "Appointment Booked",
          "value": 486,
          "percentage": 39.0
        }
        // ... other outcomes
      ],
      
      "dailyTrendsLine": [
        {
          "date": "2024-01-01",
          "calls": 28,
          "appointments": 24,
          "revenue": 1450.00,
          "bookings": 12
        }
        // ... daily data for line charts
      ],
      
      "revenueBar": [
        {
          "date": "2024-01-25",
          "value": 1680.00,
          "formatted_value": "$1,680.00",
          "growth": 15.2
        }
        // ... 7-day revenue bar chart data
      ],
      
      "growthIndicators": {
        "revenue": {
          "current": 42650.00,
          "previous": 37920.00,
          "growth_rate": 12.5,
          "trend": "up"
        },
        "bookings": {
          "current": 743,
          "previous": 657,
          "growth_rate": 13.1,
          "trend": "up"
        },
        "calls": {
          "current": 1247,
          "previous": 1134,
          "growth_rate": 10.0,
          "trend": "up"
        }
      }
    }
  },
  
  "metadata": {
    "period": {
      "start_date": "2024-01-15T00:00:00Z",
      "end_date": "2024-02-14T23:59:59Z",
      "period": "30d"
    },
    "generated_at": "2024-02-14T14:30:00Z",
    "query_time_ms": 234,
    "total_records": {
      "calls": 1247,
      "appointments": 856,
      "customers": 2847
    },
    "filters_applied": [
      "business_id=business-uuid-123",
      "period=30d",
      "include_calls=true",
      "include_appointments=true",
      "include_revenue=true"
    ]
  }
}
```

---

## 📈 Specialized Analytics Endpoints

### **1. Call Analytics**
```http
GET /api/analytics/calls?period=30d&include_conversion_rate=true&include_call_duration=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCalls": 1247,
      "outcomes": [...]
    },
    "charts": {
      "outcomeDistribution": [...],
      "dailyTrend": [...]
    }
  }
}
```

### **2. Revenue Analytics**
```http
GET /api/analytics/revenue?period=30d&breakdown_by=service&include_trends=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "current_period_revenue": "$42,650.00",
      "daily_average": "$1,421.67", 
      "growth_rate": 12.5,
      "projected_monthly": "$44,189.80"
    },
    "trends": [...],
    "comparison": {
      "current": 42650.00,
      "previous": 37920.00,
      "growth_rate": 12.5,
      "trend_direction": "up"
    }
  }
}
```

### **3. Appointment Analytics**
```http
GET /api/analytics/appointments?period=30d&include_status_breakdown=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalAppointments": 856,
      "confirmedAppointments": 743,
      "completedAppointments": 698,
      "conversionRate": 86.8,
      "noShowRate": 6.1
    },
    "charts": {
      "statusDistribution": [...],
      "dailyAppointments": [...]
    }
  }
}
```

### **4. Real-time Analytics**
```http
GET /api/analytics/realtime
Authorization: Bearer <token>
```

**Response:** Today's KPIs in real-time format for live dashboard updates.

---

## 🔍 Advanced SQL Aggregation Features

### **Optimized Database Queries**

The analytics system uses optimized SQL queries with proper indexing and aggregation:

```sql
-- Example: Daily metrics aggregation
SELECT 
  DATE(started_at) as date,
  COUNT(*) as calls,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as answered_calls,
  COUNT(CASE WHEN outcome = 'booked' THEN 1 END) as converted_calls
FROM calls 
WHERE business_id = $1 
  AND started_at >= $2 
  AND started_at <= $3
GROUP BY DATE(started_at)
ORDER BY date;
```

#### **Revenue Trends with Growth Calculations**
```sql
SELECT 
  DATE(scheduled_at) as date,
  SUM(total_price) as revenue,
  COUNT(*) as appointments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM appointments 
WHERE business_id = $1 
  AND status NOT IN ('cancelled')
  AND scheduled_at >= $2 
  AND scheduled_at <= $3
GROUP BY DATE(scheduled_at)
ORDER BY date;
```

#### **Call Outcome Distribution**
```sql
SELECT 
  outcome,
  COUNT(*) as count,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 1) as percentage
FROM calls 
WHERE business_id = $1 
  AND outcome IS NOT NULL
  AND started_at >= $2 
  AND started_at <= $3
GROUP BY outcome
ORDER BY count DESC;
```

---

## 📊 Chart-Ready Data Formats

### **Time Series Line Charts**
```javascript
{
  "dailyTrendsLine": [
    {
      "date": "2024-01-15",
      "calls": 28,
      "appointments": 24,
      "revenue": 1450.00,
      "bookings": 12
    }
  ]
}
```

### **Pie Chart Data**
```javascript
{
  "callOutcomePie": [
    {
      "label": "Appointment Booked",
      "value": 486,
      "percentage": 39.0
    }
  ]
}
```

### **Bar Chart Data**
```javascript
{
  "revenueBar": [
    {
      "date": "2024-01-25",
      "value": 1680.00,
      "formatted_value": "$1,680.00",
      "growth": 15.2
    }
  ]
}
```

### **KPI Cards Data**
```javascript
{
  "kpis": {
    "calls": {
      "total": 1247,
      "answered": 986,
      "conversion_rate": 79.1,
      "trend": "up",
      "trend_percentage": 12.5
    }
  }
}
```

---

## ⚡ Performance Optimization

### **Database Indexing**
The analytics system relies on properly indexed columns for optimal performance:

```sql
-- Call analytics indexes
CREATE INDEX IF NOT EXISTS idx_calls_business_started ON calls(business_id, started_at);
CREATE INDEX IF NOT EXISTS idx_calls_outcome ON calls(business_id, outcome);

-- Appointment analytics indexes  
CREATE INDEX IF NOT EXISTS idx_appointments_business_scheduled ON appointments(business_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(business_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_price ON appointments(business_id, total_price);
```

### **Query Optimization Features**
- **Pagination Limits**: Results capped for performance
- **Concurrent Queries**: Parallel data fetching for sub-100ms response times
- **Caching Strategy**: Aggregated data cached for repeated queries
- **Efficient Aggregation**: Native SQL GROUP BY operations

### **Response Time Targets**
- Dashboard KPIs: **< 200ms**
- Daily metrics 30 days: **< 300ms**
- Revenue trends: **< 150ms**
- Real-time metrics: **< 100ms**

---

## 📱 Frontend Integration Examples

### **Chart.js Integration**
```javascript
// Get dashboard data
const response = await fetch('/api/analytics/dashboard?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Configure line chart for daily trends
const lineChartConfig = {
  type: 'line',
  data: {
    labels: data.data.charts.dailyTrendsLine.map(d => d.date),
    datasets: [
      {
        label: 'Calls',
        data: data.data.charts.dailyTrendsLine.map(d => d.calls),
        borderColor: '#3B82F6'
      },
      {
        label: 'Appointments', 
        data: data.data.charts.dailyTrendsLine.map(d => d.appointments),
        borderColor: '#10B981'
      }
    ]
  }
};

new Chart(document.getElementById('lineChart'), lineChartConfig);

// Configure pie chart for call outcomes
const pieChartConfig = {
  type: 'doughnut',
  data: {
    labels: data.data.charts.callOutcomePie.map(item => item.label),
    datasets: [{
      data: data.data.charts.callOutcomePie.map(item => item.count),
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
    }]
  }
};

new Chart(document.getElementById('pieChart'), pieChartConfig);
```

### **React Hook Example**
```javascript
import { useState, useEffect } from 'react';

function useAnalytics(timeRange = '30d') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/dashboard?period=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch analytics');
        
        const analyticsData = await response.json();
        setData(analyticsData.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  return { data, loading, error };
}

// Usage in component
function Dashboard() {
  const { data, loading, error } = useAnalytics('30d');

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Dashboard KPIs</h2>
      <div className="kpi-grid">
        <KPICard 
          title="Total Calls" 
          value={data.kpis.calls.total}
          trend={data.charts.growthIndicators.calls.trend}
          trendValue={data.charts.growthIndicators.calls.growth_rate}
        />
        <KPICard 
          title="Revenue" 
          value={data.kpis.revenue.total}
          trend={data.charts.growthIndicators.revenue.trend}
          trendValue={data.charts.growthIndicators.revenue.growth_rate}
        />
      </div>
    </div>
  );
}
```

### **Auto-refresh Dashboard**
```javascript
// Real-time dashboard updates
function useRealTimeAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    const fetchRealTime = async () => {
      const response = await fetch('/api/analytics/realtime', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAnalytics(data.data);
    };

    // Fetch immediately
    fetchRealTime();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRealTime, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return analytics;
}
```

---

## 🔧 Testing & Usage

### **Quick Health Check**
```bash
curl http://localhost:3001/api/analytics/health \
  -H "Authorization: Bearer your-token"
```

### **Dashboard Analytics**
```bash
curl "http://localhost:3001/api/analytics/dashboard?period=30d" \
  -H "Authorization: Bearer your-token"
```

### **Export Analytics Data**
```bash
# JSON export
curl "http://localhost:3001/api/analytics/export?period=30d&format=json" \
  -H "Authorization: Bearer your-token"

# CSV export
curl "http://localhost:3001/api/analytics/export?period=7d&format=csv" \
  -H "Authorization: Bearer your-token" \
  > analytics-export.csv
```

---

This comprehensive analytics API provides enterprise-level business intelligence with **optimized SQL aggregation**, **real-time KPI tracking**, **chart-ready data formats**, and **performance-optimized queries** for modern dashboard interfaces. The system aggregates data from calls, appointments, and revenue tables with **SQL GROUP BY queries**, **business isolation**, and **growth calculations** to deliver actionable business insights in real-time.
