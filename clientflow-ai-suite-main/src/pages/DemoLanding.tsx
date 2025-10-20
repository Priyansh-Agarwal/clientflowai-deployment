import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, TrendingUp, Users, Calendar, DollarSign, Clock, ArrowRight, Sparkles } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DemoLanding() {
  // Sample data for charts
  const callVolumeData = [
    { day: "Mon", calls: 45, answered: 42, converted: 28 },
    { day: "Tue", calls: 52, answered: 50, converted: 35 },
    { day: "Wed", calls: 48, answered: 46, converted: 32 },
    { day: "Thu", calls: 61, answered: 58, converted: 41 },
    { day: "Fri", calls: 55, answered: 53, converted: 38 },
    { day: "Sat", calls: 38, answered: 36, converted: 24 },
    { day: "Sun", calls: 32, answered: 30, converted: 20 },
  ];

  const revenueData = [
    { month: "Jan", revenue: 48500 },
    { month: "Feb", revenue: 52300 },
    { month: "Mar", revenue: 61200 },
    { month: "Apr", revenue: 58900 },
    { month: "May", revenue: 67400 },
    { month: "Jun", revenue: 71200 },
  ];

  const outcomeData = [
    { name: "Appointments Booked", value: 218, color: "#0EA5E9" },
    { name: "Qualified Leads", value: 156, color: "#14B8A6" },
    { name: "Follow-ups Scheduled", value: 89, color: "#8B5CF6" },
    { name: "Information Requests", value: 127, color: "#F59E0B" },
  ];

  const recentCalls = [
    { id: 1, name: "Sarah Johnson", phone: "(555) 123-4567", outcome: "Booked", time: "2 min ago", duration: "4:32" },
    { id: 2, name: "Michael Chen", phone: "(555) 234-5678", outcome: "Qualified", time: "8 min ago", duration: "6:15" },
    { id: 3, name: "Emily Davis", phone: "(555) 345-6789", outcome: "Booked", time: "15 min ago", duration: "5:47" },
    { id: 4, name: "Robert Wilson", phone: "(555) 456-7890", outcome: "Follow-up", time: "23 min ago", duration: "3:28" },
    { id: 5, name: "Lisa Anderson", phone: "(555) 567-8901", outcome: "Booked", time: "31 min ago", duration: "7:02" },
  ];

  const upcomingAppointments = [
    { id: 1, client: "Sarah Johnson", service: "Strategy Consultation", time: "Today, 2:00 PM", status: "Confirmed" },
    { id: 2, client: "David Martinez", service: "Implementation Review", time: "Today, 4:30 PM", status: "Confirmed" },
    { id: 3, client: "Jennifer Lee", service: "Discovery Call", time: "Tomorrow, 10:00 AM", status: "Confirmed" },
    { id: 4, client: "James Brown", service: "Quarterly Review", time: "Tomorrow, 2:00 PM", status: "Pending" },
  ];

  const metrics = [
    {
      title: "Total Calls",
      value: "2,847",
      change: "+18.2%",
      trend: "up",
      icon: Phone,
      color: "from-sky-500 to-blue-600",
    },
    {
      title: "Conversion Rate",
      value: "68.4%",
      change: "+5.3%",
      trend: "up",
      icon: TrendingUp,
      color: "from-teal-500 to-emerald-600",
    },
    {
      title: "Monthly Revenue",
      value: "$71,200",
      change: "+12.8%",
      trend: "up",
      icon: DollarSign,
      color: "from-purple-500 to-indigo-600",
    },
    {
      title: "Active Clients",
      value: "342",
      change: "+23",
      trend: "up",
      icon: Users,
      color: "from-orange-500 to-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Phone className="w-8 h-8 text-sky-500" />
                <Sparkles className="w-4 h-4 text-teal-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">ClientFlow AI</span>
                <Badge className="ml-2 bg-teal-100 text-teal-700 hover:bg-teal-100">Demo</Badge>
              </div>
            </div>
            <Button
              onClick={() => window.location.href = '/auth'}
              className="bg-gradient-to-r from-sky-500 to-teal-500 hover:opacity-90 text-white font-semibold"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Banner */}
        <div className="mb-8 bg-gradient-to-r from-sky-500 to-teal-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Interactive Demo Dashboard</h1>
              <p className="text-white/90 text-lg">
                Experience how ClientFlow AI transforms your business operations with real-time automation
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Live simulation with sample data</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow border-0">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600 font-medium">{metric.change}</span>
                        <span className="text-xs text-gray-500 ml-2">vs last month</span>
                      </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Call Volume Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Weekly Call Performance</CardTitle>
              <p className="text-sm text-gray-600">Calls received, answered, and converted</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={callVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="calls" stroke="#0EA5E9" strokeWidth={2} name="Total Calls" />
                  <Line type="monotone" dataKey="answered" stroke="#14B8A6" strokeWidth={2} name="Answered" />
                  <Line type="monotone" dataKey="converted" stroke="#8B5CF6" strokeWidth={2} name="Converted" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Monthly Revenue Growth</CardTitle>
              <p className="text-sm text-gray-600">Revenue generated through AI automation</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Call Outcomes Pie Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Call Outcomes</CardTitle>
              <p className="text-sm text-gray-600">Distribution of call results</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(entry) => `${entry.value}`}
                  >
                    {outcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {outcomeData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Calls */}
          <Card className="shadow-lg border-0 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Recent Calls</CardTitle>
              <p className="text-sm text-gray-600">Latest customer interactions handled by AI</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                        {call.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{call.name}</p>
                        <p className="text-sm text-gray-600">{call.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <Badge className={
                          call.outcome === "Booked" ? "bg-green-100 text-green-700" :
                          call.outcome === "Qualified" ? "bg-blue-100 text-blue-700" :
                          "bg-purple-100 text-purple-700"
                        }>
                          {call.outcome}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{call.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{call.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card className="shadow-lg border-0 mt-6">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-sky-500" />
              Upcoming Appointments
            </CardTitle>
            <p className="text-sm text-gray-600">Automatically scheduled by AI</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="p-4 bg-gradient-to-br from-sky-50 to-teal-50 rounded-lg border border-sky-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{apt.client}</p>
                      <p className="text-sm text-gray-600 mt-1">{apt.service}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-700">
                        <Clock className="w-4 h-4 mr-1 text-sky-500" />
                        {apt.time}
                      </div>
                    </div>
                    <Badge className={
                      apt.status === "Confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }>
                      {apt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-navy via-primary to-accent rounded-xl p-8 text-white text-center shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">
            This is just a glimpse of what ClientFlow AI can do. Start automating your operations today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => window.location.href = '/auth'}
              className="bg-white hover:bg-white/90 text-navy text-lg px-10 py-6 shadow-xl font-bold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-10 py-6 font-semibold"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
