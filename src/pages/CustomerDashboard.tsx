import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { LogOut, FileText, Package, CalendarDays, User, Save, Receipt, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentViewerDialog } from "@/components/customer/DocumentViewerDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrders } from "@/hooks/useOrder";
import { useQuotes } from "@/hooks/useQuote";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", address: "" });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState<"estimate" | "receipt" | "quote">("quote");
  const [selectedEstimate, setSelectedEstimate] = useState<Tables<"estimates"> | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Tables<"receipts"> | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Tables<"quotes"> | null>(null);

  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !authUser) navigate("/login", { replace: true });
  }, [authUser, authLoading, navigate, toast]);

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["customer-profile", authUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", authUser!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!authUser,
  });

  useEffect(() => {
    if (!customer) return;
    setProfileForm((prev) => ({
      ...prev,
      full_name: customer.full_name,
      phone: customer.phone || "",
      address: customer.address || "",
    }));
  }, [customer]);

  const { data: quotes = [], isLoading: quotesLoading } = useQuotes({
    customerId: customer?.id,
    enabled: !!customer?.id,
  });

  const { data: orders = [], isLoading: ordersLoading } = useOrders({
    customerId: customer?.id,
    enabled: !!customer?.id,
  });

  const orderIds = useMemo(() => orders.map((order) => order.id), [orders]);

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ["reservations", customer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id,
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", customer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("customer_id", customer!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id,
  });

  const { data: estimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: ["estimates", ...orderIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimates")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: orderIds.length > 0,
  });

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery({
    queryKey: ["receipts", ...orderIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: orderIds.length > 0,
  });

  const loading = authLoading || customerLoading || quotesLoading || ordersLoading || reservationsLoading || appointmentsLoading || (orderIds.length > 0 && (estimatesLoading || receiptsLoading));

  const handleSaveProfile = async () => {
    if (!customer) return;
    const { error } = await supabase.from("customers").update({
      full_name: profileForm.full_name,
      phone: profileForm.phone || null,
      address: profileForm.address || null,
    }).eq("id", customer.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["customer-profile", authUser?.id] });
      toast({ title: "Profile updated" });
      setEditing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">{authUser?.email}</p>
        </div>
        <Button variant="ghost" onClick={handleLogout} size="sm">
          <LogOut className="h-4 w-4 mr-1" /> Sign Out
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : !customer ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No client profile was found for this account yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Profile Section */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-accent" /> My Profile
              </CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-3 max-w-md">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={profileForm.full_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd>{customer?.full_name || "—"}</dd>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{customer?.email}</dd>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{customer?.phone || "—"}</dd>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd>{customer?.address || "—"}</dd>
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quotes */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" /> My Quotes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No quotes yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {quotes.map((q) => (
                      <li key={q.id} className="flex items-center justify-between text-sm">
                        <button
                          className="text-accent hover:underline truncate text-left"
                          onClick={() => { setSelectedQuote(q); setViewerType("quote"); setViewerOpen(true); }}
                        >
                          {new Date(q.created_at).toLocaleDateString()}
                        </button>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{q.status}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedQuote(q); setViewerType("quote"); setViewerOpen(true); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant="link" className="px-0 mt-3 text-accent">
                  <Link to="/quote">Get New Estimate</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Orders */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" /> My Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {orders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between text-sm">
                        <Link to={`/track/${o.id}`} className="text-accent hover:underline truncate">
                          {new Date(o.created_at).toLocaleDateString()}
                        </Link>
                        <Badge variant="secondary" className="capitalize">{o.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Estimates (from Orders) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" /> My Estimates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {estimates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No estimates yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {estimates.map((e) => (
                      <li key={e.id} className="flex items-center justify-between text-sm">
                        <button
                          className="text-accent hover:underline truncate text-left"
                          onClick={() => { setSelectedEstimate(e); setViewerType("estimate"); setViewerOpen(true); }}
                        >
                          {e.estimate_number || new Date(e.created_at).toLocaleDateString()}
                        </button>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{e.status}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedEstimate(e); setViewerType("estimate"); setViewerOpen(true); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Invoices (Receipts) */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-accent" /> My Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {receipts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {receipts.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <button
                          className="text-accent hover:underline truncate text-left"
                          onClick={() => { setSelectedReceipt(r); setViewerType("receipt"); setViewerOpen(true); }}
                        >
                          {r.receipt_number || new Date(r.created_at).toLocaleDateString()}
                        </button>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{r.status}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedReceipt(r); setViewerType("receipt"); setViewerOpen(true); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Reservations */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-accent" /> My Reservations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reservations yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {reservations.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">Held until {new Date(r.reserved_until).toLocaleDateString()}</span>
                        <Badge variant="secondary" className="capitalize">{r.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant="link" className="px-0 mt-3 text-accent">
                  <Link to="/slabs">Browse Slabs</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Appointments */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-accent" /> My Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointments yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {appointments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">
                          {a.preferred_date ? new Date(a.preferred_date).toLocaleDateString() : "Pending"}
                        </span>
                        <Badge variant="secondary" className="capitalize">{a.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <DocumentViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        type={viewerType}
        estimate={selectedEstimate}
        receipt={selectedReceipt}
        quote={selectedQuote}
      />
    </Section>
  );
};

export default CustomerDashboard;
