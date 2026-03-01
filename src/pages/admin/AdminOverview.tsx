import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, ShoppingCart, Calendar, Users, DollarSign,
  TrendingUp, Percent, AlertTriangle, BarChart3, Lock, Monitor, Loader2,
} from "lucide-react";
import { SlaAlertBanner } from "@/components/admin/SlaAlertBanner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format } from "date-fns";

interface DashboardKpis {
  total_revenue: number;
  avg_project_value: number;
  total_orders: number;
  completed_orders: number;
  total_deposits_collected: number;
}

interface ReservationPatterns {
  total_reservations: number;
  active_reservations: number;
  expired_reservations: number;
  cancelled_reservations: number;
  converted_reservations: number;
  avg_hold_hours: number;
  avg_deposit: number;
}

interface RevenueByMaterial {
  material_name: string;
  category: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
  unique_customers: number;
}

interface MarginEstimation {
  material_name: string;
  category: string;
  customer_rate: number;
  labor_rate_per_sqft: number;
  internal_cost_per_sqft: number;
  estimated_margin_pct: number | null;
  order_count: number;
  total_revenue: number;
}

interface RevenueTrend {
  month: string;
  order_count: number;
  revenue: number;
  deposits: number;
}

const CHART_COLORS = [
  "hsl(38, 65%, 50%)",   // gold/accent
  "hsl(30, 8%, 18%)",    // primary dark
  "hsl(140, 12%, 42%)",  // sage
  "hsl(35, 25%, 70%)",   // warm beige
  "hsl(0, 72%, 51%)",    // destructive
  "hsl(200, 40%, 50%)",  // blue accent
];

const fmt = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

const fmtFull = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [reservations, setReservations] = useState<ReservationPatterns | null>(null);
  const [revenueByMaterial, setRevenueByMaterial] = useState<RevenueByMaterial[]>([]);
  const [margins, setMargins] = useState<MarginEstimation[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [counts, setCounts] = useState({ slabs: 0, orders: 0, appointments: 0, customers: 0 });

  useEffect(() => {
    const load = async () => {
      const [
        kpiRes, resPatterns, revMat, marginRes, trendRes,
        slabCount, orderCount, apptCount, custCount,
      ] = await Promise.all([
        supabase.from("v_dashboard_kpis").select("*").single(),
        supabase.from("v_reservation_patterns").select("*").single(),
        supabase.from("v_revenue_by_material").select("*"),
        supabase.from("v_margin_estimation").select("*"),
        supabase.from("v_revenue_trend").select("*"),
        supabase.from("slabs").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);

      if (kpiRes.data) setKpis(kpiRes.data as unknown as DashboardKpis);
      if (resPatterns.data) setReservations(resPatterns.data as unknown as ReservationPatterns);
      if (revMat.data) setRevenueByMaterial(revMat.data as unknown as RevenueByMaterial[]);
      if (marginRes.data) setMargins(marginRes.data as unknown as MarginEstimation[]);
      if (trendRes.data) setRevenueTrend(trendRes.data as unknown as RevenueTrend[]);
      setCounts({
        slabs: slabCount.count ?? 0,
        orders: orderCount.count ?? 0,
        appointments: apptCount.count ?? 0,
        customers: custCount.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const depositToInstallRate =
    reservations && reservations.total_reservations > 0
      ? (reservations.converted_reservations / reservations.total_reservations) * 100
      : 0;

  const expirationRate =
    reservations && reservations.total_reservations > 0
      ? (reservations.expired_reservations / reservations.total_reservations) * 100
      : 0;

  // Prepare chart data
  const trendChartData = revenueTrend.map((t) => ({
    ...t,
    label: t.month ? format(new Date(t.month), "MMM yyyy") : "",
  }));

  const materialBarData = revenueByMaterial.map((m) => ({
    name: m.material_name.length > 15 ? m.material_name.slice(0, 15) + "…" : m.material_name,
    fullName: m.material_name,
    revenue: m.total_revenue,
    orders: m.order_count,
    avgValue: m.avg_order_value,
  }));

  const materialPieData = revenueByMaterial
    .filter((m) => m.total_revenue > 0 || m.order_count > 0)
    .map((m) => ({
      name: m.material_name,
      value: m.total_revenue > 0 ? m.total_revenue : m.order_count,
    }));

  // If no pie data (all zeros), show order counts or a placeholder
  const showPie = materialPieData.length > 0;
  const pieDataFallback = revenueByMaterial.map((m) => ({
    name: m.material_name,
    value: 1, // equal distribution placeholder
  }));

  return (
    <div className="space-y-6">
      <SlaAlertBanner />

      <h1 className="font-display text-2xl font-semibold">Dashboard Overview</h1>

      {/* Top KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={kpis ? fmtFull(kpis.total_revenue) : "$0"}
          icon={DollarSign}
          description={`${kpis?.total_orders ?? 0} orders`}
          accent
        />
        <KpiCard
          label="Avg Project Value"
          value={kpis ? fmt(kpis.avg_project_value) : "$0"}
          icon={TrendingUp}
          description="Per completed order"
        />
        <KpiCard
          label="Deposit → Install"
          value={pct(depositToInstallRate)}
          icon={Percent}
          description={`${reservations?.converted_reservations ?? 0} of ${reservations?.total_reservations ?? 0}`}
        />
        <KpiCard
          label="Expiration Rate"
          value={pct(expirationRate)}
          icon={AlertTriangle}
          description={`${reservations?.expired_reservations ?? 0} expired`}
          warn={expirationRate > 30}
        />
      </div>

      {/* Quick counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniCard label="Slabs" value={counts.slabs} icon={Package} />
        <MiniCard label="Orders" value={counts.orders} icon={ShoppingCart} />
        <MiniCard label="Appointments" value={counts.appointments} icon={Calendar} />
        <MiniCard label="Customers" value={counts.customers} icon={Users} />
      </div>

      <Separator />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Monthly revenue and deposits over time</CardDescription>
          </CardHeader>
          <CardContent>
            {trendChartData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground italic">
                No order data yet — chart will populate as orders come in
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 15%, 88%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(30, 8%, 45%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(30, 8%, 45%)" tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmtFull(value), name === "revenue" ? "Revenue" : "Deposits"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(35, 15%, 88%)", background: "hsl(40, 20%, 97%)" }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(38, 65%, 50%)" strokeWidth={2} dot={{ fill: "hsl(38, 65%, 50%)", r: 4 }} name="Revenue" />
                  <Line type="monotone" dataKey="deposits" stroke="hsl(140, 12%, 42%)" strokeWidth={2} dot={{ fill: "hsl(140, 12%, 42%)", r: 4 }} name="Deposits" />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Material Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Material Distribution
            </CardTitle>
            <CardDescription>
              {showPie ? "Revenue share by material" : "Materials in catalog (no revenue data yet)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={showPie ? materialPieData : pieDataFallback}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + "…" : name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "hsl(30, 8%, 45%)" }}
                >
                  {(showPie ? materialPieData : pieDataFallback).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => showPie ? fmtFull(value) : "—"}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(35, 15%, 88%)", background: "hsl(40, 20%, 97%)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Material Bar Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Revenue by Material</CardTitle>
            <Badge variant="outline" className="text-xs ml-auto">
              <Lock className="h-3 w-3 mr-1" /> Internal
            </Badge>
          </div>
          <CardDescription>Aggregated performance by material type</CardDescription>
        </CardHeader>
        <CardContent>
          {materialBarData.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No material data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materialBarData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 15%, 88%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(30, 8%, 45%)" tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(30, 8%, 45%)" width={130} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "revenue") return [fmtFull(value), "Revenue"];
                    if (name === "avgValue") return [fmtFull(value), "Avg Order"];
                    return [value, name];
                  }}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(35, 15%, 88%)", background: "hsl(40, 20%, 97%)" }}
                />
                <Bar dataKey="revenue" fill="hsl(38, 65%, 50%)" radius={[0, 4, 4, 0]} name="revenue" />
                <Bar dataKey="avgValue" fill="hsl(140, 12%, 42%)" radius={[0, 4, 4, 0]} name="avgValue" />
                <Legend formatter={(value) => value === "revenue" ? "Total Revenue" : "Avg Order Value"} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Margin estimation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">Margin Estimation</CardTitle>
            <Badge variant="destructive" className="text-xs ml-auto">Confidential</Badge>
          </div>
          <CardDescription>
            Based on internal cost vs customer rate — uses <code>internal_price_per_sqft</code> from settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {margins.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Set <code>internal_price_per_sqft</code> in Settings to enable margin tracking
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Material</th>
                    <th className="pb-2 font-medium text-right">Customer $/sqft</th>
                    <th className="pb-2 font-medium text-right">Internal $/sqft</th>
                    <th className="pb-2 font-medium text-right">Est. Margin</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {margins.map((m) => (
                    <tr key={m.material_name} className="border-b last:border-0">
                      <td className="py-2">
                        <span className="font-medium">{m.material_name}</span>
                        <Badge variant="secondary" className="text-xs ml-2">{m.category}</Badge>
                      </td>
                      <td className="py-2 text-right">${m.customer_rate}</td>
                      <td className="py-2 text-right">${m.internal_cost_per_sqft}</td>
                      <td className="py-2 text-right">
                        {m.estimated_margin_pct != null ? (
                          <span
                            className={
                              m.estimated_margin_pct >= 30
                                ? "text-green-600 font-medium"
                                : m.estimated_margin_pct >= 15
                                ? "text-yellow-600 font-medium"
                                : "text-destructive font-medium"
                            }
                          >
                            {m.estimated_margin_pct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right">{fmtFull(m.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reservation patterns */}
      {reservations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reservation Patterns</CardTitle>
            <CardDescription>Hold durations and conversion metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricBox label="Active" value={reservations.active_reservations} />
              <MetricBox label="Converted" value={reservations.converted_reservations} />
              <MetricBox label="Expired" value={reservations.expired_reservations} />
              <MetricBox label="Avg Hold" value={`${(reservations.avg_hold_hours ?? 0).toFixed(0)}h`} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion by device — placeholder */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base text-muted-foreground">Conversion by Device</CardTitle>
          </div>
          <CardDescription>
            Requires server-side event forwarding from GTM. Device data is not yet stored in the database.
            Enable <code>server_side_tracking_enabled</code> in Settings and configure GTM server container to populate this section.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

function KpiCard({
  label, value, icon: Icon, description, accent, warn,
}: {
  label: string; value: string; icon: React.ElementType; description: string;
  accent?: boolean; warn?: boolean;
}) {
  return (
    <Card className={warn ? "border-destructive/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ? "text-accent" : warn ? "text-destructive" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent ? "text-accent" : ""}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MiniCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

export default AdminOverview;
