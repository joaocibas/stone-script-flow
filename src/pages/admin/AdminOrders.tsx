import { useState } from "react";
import { sendEmail } from "@/lib/send-email";
import { orderConfirmedEmail, orderStatusUpdateEmail } from "@/lib/email-templates";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, ShoppingCart, DollarSign, Clock, CheckCircle2, Eye, Trash2, ArrowUp, ArrowDown, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CustomerQuotePreviewDialog } from "@/components/admin/orders/CustomerQuotePreviewDialog";
import { resolveEdgeProfile } from "@/components/admin/orders/estimateDisplay";
import { computeSelectedServicePricing } from "@/components/admin/orders/estimateCalculations";
import { calculateOrderTotal } from "@/lib/calculations";
import { useOrders } from "@/hooks/useOrder";
import { useQuotes } from "@/hooks/useQuote";

type SortKey = "id" | "customer" | "deposit_paid" | "status" | "created_at";
type SortDir = "asc" | "desc";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const quoteStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  calculated: "bg-blue-100 text-blue-800 border-blue-200",
  expired: "bg-red-100 text-red-800 border-red-200",
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);

  const { data: orders, isLoading } = useOrders({ includeCustomer: true });

  const { data: quotes } = useQuotes({ includeRelations: true });

  // Filter quotes that are NOT yet linked to an order
  const unlinkedQuotes = (quotes || []).filter((q) => {
    const linkedQuoteIds = (orders || []).map((o) => o.quote_id).filter(Boolean);
    return !linkedQuoteIds.includes(q.id);
  });

  const previewQuote = unlinkedQuotes.find((q) => q.id === previewQuoteId) || null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("orders").delete().eq("id", deleteId);
    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    }
    setDeleteId(null);
  };

  const handleDeleteQuote = async () => {
    if (!deleteQuoteId) return;
    const { error } = await supabase.from("quotes").delete().eq("id", deleteQuoteId);
    if (error) {
      toast.error("Failed to delete quote");
    } else {
      toast.success("Quote deleted");
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
    setDeleteQuoteId(null);
  };

  const handleConvertQuoteToOrder = async (quoteId: string) => {
    setConvertingQuoteId(quoteId);
    const quote = (quotes || []).find((q) => q.id === quoteId);
    if (!quote || !quote.customer_id) {
      toast.error("Quote must be linked to a customer");
      setConvertingQuoteId(null);
      return;
    }

    const cust = quote.customers as any;
    const mat = quote.materials as any;
    const sqft = Number(quote.calculated_sqft) || 0;
    const numCutouts = Number(quote.num_cutouts) || 0;
    const lengthIn = Number(quote.length_inches) || 0;
    const widthIn = Number(quote.width_inches) || 0;
    const perimeterLinFt = (lengthIn && widthIn) ? (2 * (lengthIn + widthIn)) / 12 : 0;
    const slabsNeeded = Number(quote.slabs_needed) || 1;
    const edgeProfile = resolveEdgeProfile(quote.edge_profile);

    // Fetch the actual slab name from the slab linked to the order, or first available slab
    let slabName = "";
    let slabId: string | null = null;
    try {
      const { data: slabs } = await supabase
        .from("slabs")
        .select("id, name, sales_value")
        .eq("material_id", quote.material_id)
        .eq("status", "available")
        .limit(1);
      const slab = slabs?.[0];
      if (slab) {
        slabName = slab.name || "";
        slabId = slab.id;
      }
    } catch {}

    // Try to compute pricing from slab services
    let labor = 0, material = 0, addons = 0;
    let laborRatePerSqft = 0;
    let laborFixed = 0;
    try {
      if (slabId) {
        const [servicesRes, slabServicesRes] = await Promise.all([
          supabase.from("service_items").select("id, category, pricing_unit, cost_value, name").eq("is_active", true),
          supabase.from("slab_services").select("service_id, override_cost, override_multiplier").eq("slab_id", slabId).eq("is_active", true),
        ]);

        const { data: slabData } = await supabase.from("slabs").select("sales_value").eq("id", slabId).single();

        const calculated = computeSelectedServicePricing({
          selectedServiceIds: (slabServicesRes.data || []).map((service: any) => service.service_id),
          services: servicesRes.data || [],
          slabServices: slabServicesRes.data || [],
          sqft,
          numCutouts,
          lengthInches: lengthIn,
          widthInches: widthIn,
          slabUnitPrice: Number(slabData?.sales_value) || 0,
          slabQuantity: slabsNeeded,
        });

        if (calculated) {
          labor = calculated.labor;
          addons = calculated.addon;
          material = calculated.materialCost ?? 0;
          laborRatePerSqft = calculated.rates.laborRatePerSqft;
          laborFixed = calculated.rates.laborFixed;
        }
      }
    } catch { /* pricing will be 0, admin can edit */ }

    const pricing = calculateOrderTotal({
      slabs: [{ price: material, quantity: 1 }],
      services: [
        { price: laborRatePerSqft, sqft },
        { price: laborFixed || (laborRatePerSqft ? 0 : labor), sqft: laborFixed ? 1 : laborRatePerSqft ? 0 : 1 },
      ].filter((line) => line.price > 0 && line.sqft > 0),
      serviceAddons: [{ price: addons }],
      taxRate: 7,
    });

    const { data: order, error } = await supabase.from("orders").insert({
      customer_id: quote.customer_id,
      quote_id: quote.id,
      slab_id: slabId,
      total_amount: pricing.total || (quote.estimated_total || 0),
      deposit_paid: 0,
      status: "pending",
    }).select().single();

    if (error) {
      toast.error("Failed to create order: " + error.message);
      setConvertingQuoteId(null);
      return;
    }

    // Create full estimate record — material = category, color = slab name
    await supabase.from("estimates").insert({
      order_id: order.id,
      estimate_number: `EST-${order.id.slice(0, 6).toUpperCase()}`,
      customer_name: cust?.full_name || "",
      phone: cust?.phone || "",
      email: cust?.email || "",
      billing_address: cust?.address || "",
      project_address: cust?.address || "",
      material: mat?.name || "",
      color: slabName || mat?.name || "",
      edge_profile: edgeProfile,
      measurements_sqft: sqft || null,
      labor_cost: labor,
      material_cost: material,
      addons_cost: addons,
      subtotal: pricing.subtotal,
      tax: 7,
      total: pricing.total,
      deposit_required: pricing.depositRequired,
      scope_of_work: "",
      notes: "",
      status: "active",
    });

    toast.success("Order created from quote");

    // Send order confirmation email to customer
    if (cust?.email) {
      try {
        const emailPayload = orderConfirmedEmail({
          customerName: cust.full_name || "Customer",
          orderId: order.id,
          total: pricing.total || (quote.estimated_total || 0),
        });
        sendEmail({ ...emailPayload, to: cust.email });
      } catch {}
    }

    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    navigate(`/admin/orders/${order.id}`);
    setConvertingQuoteId(null);
  };

  const filtered = (orders || []).filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const cust = o.customers as any;
    return (
      o.id.toLowerCase().includes(q) ||
      (cust?.full_name || "").toLowerCase().includes(q) ||
      (cust?.email || "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const custA = a.customers as any;
    const custB = b.customers as any;
    switch (sortKey) {
      case "id": return dir * a.id.localeCompare(b.id);
      case "customer": return dir * (custA?.full_name || "").localeCompare(custB?.full_name || "");
      case "deposit_paid": return dir * (Number(a.deposit_paid) - Number(b.deposit_paid));
      case "status": return dir * a.status.localeCompare(b.status);
      case "created_at": return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default: return 0;
    }
  });

  const counts = {
    total: (orders || []).length,
    pending: (orders || []).filter((o) => o.status === "pending").length,
    in_progress: (orders || []).filter((o) => o.status === "in_progress").length,
    completed: (orders || []).filter((o) => o.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><ShoppingCart className="h-4 w-4" /> Total</div>
            <p className="text-2xl font-bold mt-1">{counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Clock className="h-4 w-4" /> Pending</div>
            <p className="text-2xl font-bold mt-1">{counts.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="h-4 w-4" /> In Progress</div>
            <p className="text-2xl font-bold mt-1">{counts.in_progress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><CheckCircle2 className="h-4 w-4" /> Completed</div>
            <p className="text-2xl font-bold mt-1">{counts.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Quotes — not yet converted to orders */}
      {unlinkedQuotes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" /> Customer Quotes — Not Yet Converted to Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Sq Ft</TableHead>
                    <TableHead>Estimated Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlinkedQuotes.map((q) => {
                    const cust = q.customers as any;
                    const mat = q.materials as any;
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-xs">{q.id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="font-medium">{cust?.full_name || "Guest"}</TableCell>
                        <TableCell>{mat?.name || "—"}</TableCell>
                        <TableCell>{q.calculated_sqft ? Number(q.calculated_sqft).toFixed(1) : "—"}</TableCell>
                        <TableCell>{q.estimated_total ? `$${Number(q.estimated_total).toFixed(2)}` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", quoteStatusColors[q.status] || "")}>
                            {q.status}
                          </Badge>
                          <div className="mt-1 text-xs text-muted-foreground">{resolveEdgeProfile(q.edge_profile)}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(q.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewQuoteId(q.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!q.customer_id || convertingQuoteId === q.id}
                            onClick={() => handleConvertQuoteToOrder(q.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Create Order
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteQuoteId(q.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by customer or order ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading orders...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("id")}>Order ID <SortIcon col="id" /></TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("customer")}>Customer <SortIcon col="customer" /></TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("deposit_paid")}>Deposit <SortIcon col="deposit_paid" /></TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>Status <SortIcon col="status" /></TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("created_at")}>Date <SortIcon col="created_at" /></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((order) => {
                    const cust = order.customers as any;
                    return (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="font-medium">{cust?.full_name || "—"}</TableCell>
                        <TableCell>${Number(order.total_amount).toFixed(2)}</TableCell>
                        <TableCell>${Number(order.deposit_paid).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", statusColors[order.status] || "")}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(order.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this order?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteQuoteId} onOpenChange={(open) => !open && setDeleteQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this quote?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerQuotePreviewDialog
        open={!!previewQuoteId}
        onOpenChange={(open) => !open && setPreviewQuoteId(null)}
        quote={previewQuote}
      />
    </div>
  );
};

export default AdminOrders;