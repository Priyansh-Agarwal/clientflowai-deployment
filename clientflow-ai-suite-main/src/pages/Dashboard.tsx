import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Phone, Calendar, TrendingUp, DollarSign, Users, Clock, Target, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalCalls: number;
  totalAppointments: number;
  conversionRate: number;
  totalRevenue: number;
  answeredCalls: number;
  avgCallDuration: number;
  customerSatisfaction: number;
  activeCustomers: number;
}

interface ChartData {
  date: string;
  calls: number;
  bookings: number;
  revenue: number;
}

interface OutcomeData {
  name: string;
  value: number;
}

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export default function EnhancedDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    totalAppointments: 0,
    conversionRate: 0,
    totalRevenue: 0,
    answeredCalls: 0,
    avgCallDuration: 0,
    customerSatisfaction: 0,
    activeCustomers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [outcomeData, setOutcomeData] = useState<OutcomeData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.business_id) {
        setLoading(false);
        return;
      }

      const [callsRes, appointmentsRes, metricsRes] = await Promise.all([
        supabase
          .from("calls")
          .select("*", { count: "exact" })
          .eq("business_id", profile.business_id),
        supabase
          .from("appointments")
          .select("*", { count: "exact" })
          .eq("business_id", profile.business_id),
        supabase
          .from("metrics")
          .select("*")
          .eq("business_id", profile.business_id)
          .order("date", { ascending: false })
          .limit(30),
      ]);

      const totalCalls = callsRes.count || 0;
      const totalAppointments = appointmentsRes.count || 0;
      const conversionRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0;
      
      const totalRevenue = metricsRes.data?.reduce((sum, m) => sum + Number(m.revenue || 0), 0) || 0;
      const answeredCalls = callsRes.data?.length || 0;
      const avgDuration = callsRes.data?.reduce((sum, c) => sum + (c.duration || 0), 0) / (answeredCalls || 1);
      
      // Calculate outcome distribution
      const outcomes = callsRes.data?.reduce((acc: Record<string, number>, call) => {
        const outcome = call.outcome || 'unknown';
        acc[outcome] = (acc[outcome] || 0) + 1;
        return acc;
      }, {});
      
      const outcomeChartData = Object.entries(outcomes || {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value as number,
      }));

      setStats({
        totalCalls,
        totalAppointments,
        conversionRate,
        totalRevenue,
        answeredCalls,
        avgCallDuration: Math.round(avgDuration),
        customerSatisfaction: 4.8,
        activeCustomers: appointmentsRes.data?.length || 0,
      });

      setOutcomeData(outcomeChartData);

      if (metricsRes.data) {
        const formattedData = metricsRes.data
          .reverse()
          .map((m) => ({
            date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            calls: m.total_calls,
            bookings: m.bookings,
            revenue: Number(m.revenue),
          }));
        setChartData(formattedData);
      }

      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const primaryStats = [
    {
      title: "Total Calls",
      value: stats.totalCalls,
      change: "+12.5%",
      icon: Phone,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Appointments",
      value: stats.totalAppointments,
      change: "+8.2%",
      icon: Calendar,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate.toFixed(1)}%`,
      change: "+3.1%",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: "+18.9%",
      icon: DollarSign,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const secondaryStats = [
    {
      title: "Active Customers",
      value: stats.activeCustomers,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Avg Call Duration",
      value: `${stats.avgCallDuration}s`,
      icon: Clock,
      color: "text-accent",
    },
    {
      title: "Success Rate",
      value: `${stats.conversionRate.toFixed(0)}%`,
      icon: Target,
      color: "text-success",
    },
    {
      title: "Customer Satisfaction",
      value: stats.customerSatisfaction.toFixed(1),
      icon: Award,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-premium p-8 rounded-xl shadow-premium">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-white/90 text-lg">
          Welcome back! Here's a comprehensive view of your business performance.
        </p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-premium hover:shadow-elevated transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <p className="text-xs text-success font-medium">{stat.change} from last month</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {secondaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calls & Bookings Trend */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="text-xl">Performance Trends (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorCalls)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="hsl(var(--accent))"
                  fillOpacity={1}
                  fill="url(#colorBookings)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Overview */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="text-xl">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Call Outcomes */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="text-xl">Call Outcomes Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="text-xl">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Total Calls</span>
                  <span className="text-sm font-bold">{stats.totalCalls}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-primary h-3 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Qualified Leads</span>
                  <span className="text-sm font-bold">{Math.round(stats.totalCalls * 0.7)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-accent h-3 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Appointments Set</span>
                  <span className="text-sm font-bold">{stats.totalAppointments}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-success h-3 rounded-full" style={{ width: `${stats.conversionRate}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Converted Sales</span>
                  <span className="text-sm font-bold">{Math.round(stats.totalAppointments * 0.6)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-warning h-3 rounded-full" style={{ width: `${stats.conversionRate * 0.6}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
