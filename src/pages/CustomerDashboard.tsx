import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { LogOut, FileText, Package, CalendarDays } from "lucide-react";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [quotes, setQuotes] = useState<Tables<"quotes">[]>([]);
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [reservations, setReservations] = useState<Tables<"reservations">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUser(data.user);

      // Fetch customer data
      supabase.from("customers").select("id").eq("user_id", data.user.id).single().then(({ data: customer }) => {
        if (!customer) { setLoading(false); return; }

        Promise.all([
          supabase.from("quotes").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("orders").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }).limit(10),
          supabase.from("reservations").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }).limit(10),
        ]).then(([q, o, r]) => {
          setQuotes(q.data || []);
          setOrders(o.data || []);
          setReservations(r.data || []);
          setLoading(false);
        });
      });
    });
  }, [navigate]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>
      )}
    </Section>
  );
};

export default CustomerDashboard;
