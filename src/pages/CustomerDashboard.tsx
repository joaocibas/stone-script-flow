import { useEffect, useState } from "react";
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

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [customer, setCustomer] = useState<Tables<"customers"> | null>(null);
  const [quotes, setQuotes] = useState<Tables<"quotes">[]>([]);
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [estimates, setEstimates] = useState<Tables<"estimates">[]>([]);
  const [receipts, setReceipts] = useState<Tables<"receipts">[]>([]);
  const [reservations, setReservations] = useState<Tables<"reservations">[]>([]);
  const [appointments, setAppointments] = useState<Tables<"appointments">[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", address: "" });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerType, setViewerType] = useState<"estimate" | "receipt" | "quote">("quote");
  const [selectedEstimate, setSelectedEstimate] = useState<Tables<"estimates"> | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Tables<"receipts"> | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Tables<"quotes"> | null>(null);

  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      navigate("/login");
      return;
    }
    setUser(authUser);

    const loadDashboard = async () => {
      try {
        const { data: cust, error: custError } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (custError) {
          console.error("Customer fetch error:", custError);
          toast({ title: "Error loading profile", description: custError.message, variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!cust) {
          console.warn("No customer record found for user:", authUser.id);
          setLoading(false);
          return;
        }

        setCustomer(cust);
        setProfileForm({ full_name: cust.full_name, phone: cust.phone || "", address: cust.address || "" });

        const [q, o, r, a] = await Promise.all([
          supabase.from("quotes").select("*").eq("customer_id", cust.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("orders").select("*").eq("customer_id", cust.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("reservations").select("*").eq("customer_id", cust.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("appointments").select("*").eq("customer_id", cust.id).order("created_at", { ascending: false }).limit(10),
        ]);

        if (q.error) console.error("Quotes fetch error:", q.error);
        if (o.error) console.error("Orders fetch error:", o.error);

        setQuotes(q.data || []);
        const orderData = o.data || [];
        setOrders(orderData);
        setReservations(r.data || []);
        setAppointments(a.data || []);

        // Load estimates & receipts linked to customer's orders
        const orderIds = orderData.map((ord) => ord.id);
        if (orderIds.length > 0) {
          const [est, rec] = await Promise.all([
            supabase.from("estimates").select("*").in("order_id", orderIds).order("created_at", { ascending: false }),
            supabase.from("receipts").select("*").in("order_id", orderIds).order("created_at", { ascending: false }),
          ]);
          if (est.error) console.error("Estimates fetch error:", est.error);
          if (rec.error) console.error("Receipts fetch error:", rec.error);
          setEstimates(est.data || []);
          setReceipts(rec.data || []);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [authUser, authLoading, navigate, toast]);

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
          <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
        </div>
        <Button variant="ghost" onClick={handleLogout} size="sm">
          <LogOut className="h-4 w-4 mr-1" /> Sign Out
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
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
                    <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
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
                        <span className="truncate">{new Date(q.created_at).toLocaleDateString()}</span>
                        <Badge variant="secondary" className="capitalize">{q.status}</Badge>
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
                        <span className="truncate">
                          {e.estimate_number || new Date(e.created_at).toLocaleDateString()}
                        </span>
                        <Badge variant="secondary" className="capitalize">{e.status}</Badge>
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
                        <span className="truncate">
                          {r.receipt_number || new Date(r.created_at).toLocaleDateString()}
                        </span>
                        <Badge variant="secondary" className="capitalize">{r.status}</Badge>
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
    </Section>
  );
};

export default CustomerDashboard;
