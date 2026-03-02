import { useAdminGuard } from "@/hooks/useAdminGuard";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Settings,
  Package,
  DollarSign,
  ShoppingCart,
  Calendar,
  Users,
  BarChart3,
  Brain,
  Scale,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createContext, useContext } from "react";

type AdminContextType = { isAdmin: boolean; isSales: boolean; isStaff: boolean };
const AdminContext = createContext<AdminContextType>({ isAdmin: false, isSales: false, isStaff: false });
export const useAdminRole = () => useContext(AdminContext);

type NavItem = {
  title: string;
  url: string;
  icon: any;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Inventory", url: "/admin/inventory", icon: Package },
  { title: "Pricing", url: "/admin/pricing", icon: DollarSign, adminOnly: true },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Appointments", url: "/admin/appointments", icon: Calendar },
  { title: "Availability", url: "/admin/availability", icon: Calendar },
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, adminOnly: true },
  { title: "AI Insights", url: "/admin/ai", icon: Brain, adminOnly: true },
  { title: "Legal", url: "/admin/legal", icon: Scale, adminOnly: true },
  { title: "Settings", url: "/admin/settings", icon: Settings, adminOnly: true },
];

function AdminSidebar({ isAdmin }: { isAdmin: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-4">
            {!collapsed && (
              <span className="font-display text-base font-semibold tracking-tight">
                Altar <span className="text-sidebar-primary">Admin</span>
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, isSales, isStaff } = useAdminGuard();

  if (loading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ isAdmin, isSales, isStaff }}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar isAdmin={isAdmin} />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center border-b bg-background/95 backdrop-blur px-4 gap-3">
              <SidebarTrigger />
              <span className="text-sm font-medium text-muted-foreground">
                {isAdmin ? "Admin" : "Sales"} Dashboard
              </span>
            </header>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AdminContext.Provider>
  );
}
