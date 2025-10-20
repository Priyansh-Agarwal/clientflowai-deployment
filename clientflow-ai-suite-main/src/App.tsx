import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Landing from "./pages/Landing";
import DemoLanding from "./pages/DemoLanding";
import Dashboard from "./pages/Dashboard";
import AICopilot from "./pages/AICopilot";
import Calls from "./pages/Calls";
import Conversations from "./pages/Conversations";
import Appointments from "./pages/Appointments";
import Reviews from "./pages/Reviews";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<DemoLanding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/ai-copilot" element={<DashboardLayout><AICopilot /></DashboardLayout>} />
          <Route path="/calls" element={<DashboardLayout><Calls /></DashboardLayout>} />
          <Route path="/conversations" element={<DashboardLayout><Conversations /></DashboardLayout>} />
          <Route path="/appointments" element={<DashboardLayout><Appointments /></DashboardLayout>} />
          <Route path="/reviews" element={<DashboardLayout><Reviews /></DashboardLayout>} />
          <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
