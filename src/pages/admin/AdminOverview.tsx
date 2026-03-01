import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Calendar, Users } from "lucide-react";

interface KPI {
  label: string;
  value: string;
  icon: React.ElementType;
  description: string;
}

const AdminOverview = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [slabs, orders, appointments, customers] = await Promise.all([
        supabase.from("slabs").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);

      setKpis([
        { label: "Total Slabs", value: String(slabs.count ?? 0), icon: Package, description: "Inventory items" },
        { label: "Orders", value: String(orders.count ?? 0), icon: ShoppingCart, description: "All time" },
        { label: "Appointments", value: String(appointments.count ?? 0), icon: Calendar, description: "All time" },
        { label: "Customers", value: String(customers.count ?? 0), icon: Users, description: "Registered" },
      ]);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-24" />
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
};

export default AdminOverview;
