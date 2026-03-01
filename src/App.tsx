import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layouts/AppLayout";
import { GtmLoader } from "@/components/GtmLoader";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import Index from "./pages/Index";
import Materials from "./pages/Materials";
import MaterialDetail from "./pages/MaterialDetail";
import Slabs from "./pages/Slabs";
import SlabDetail from "./pages/SlabDetail";
import Quote from "./pages/Quote";
import Book from "./pages/Book";
import Login from "./pages/Login";
import CustomerDashboard from "./pages/CustomerDashboard";
import TrackOrder from "./pages/TrackOrder";
import FAQ from "./pages/FAQ";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AdminAiInsights from "./pages/admin/AdminAiInsights";
import Schedule from "./pages/Schedule";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GtmLoader />
      <BrowserRouter>
        <Routes>
          {/* Customer routes */}
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/materials" element={<AppLayout><Materials /></AppLayout>} />
          <Route path="/materials/:id" element={<AppLayout><MaterialDetail /></AppLayout>} />
          <Route path="/slabs" element={<AppLayout><Slabs /></AppLayout>} />
          <Route path="/slabs/:id" element={<AppLayout><SlabDetail /></AppLayout>} />
          <Route path="/quote" element={<AppLayout><Quote /></AppLayout>} />
          <Route path="/book" element={<AppLayout><Book /></AppLayout>} />
          <Route path="/schedule/:reservationId" element={<AppLayout><Schedule /></AppLayout>} />
          <Route path="/login" element={<AppLayout><Login /></AppLayout>} />
          <Route path="/dashboard" element={<AppLayout><CustomerDashboard /></AppLayout>} />
          <Route path="/track/:id" element={<AppLayout><TrackOrder /></AppLayout>} />
          <Route path="/faq" element={<AppLayout><FAQ /></AppLayout>} />
          <Route path="/legal/:type" element={<AppLayout><Legal /></AppLayout>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
          <Route path="/admin/availability" element={<AdminLayout><AdminAvailability /></AdminLayout>} />
          <Route path="/admin/ai" element={<AdminLayout><AdminAiInsights /></AdminLayout>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
