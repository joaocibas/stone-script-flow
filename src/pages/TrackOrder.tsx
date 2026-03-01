import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Section } from "@/components/shared/Section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Package, CheckCircle2, Clock, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "in_progress", label: "In Progress", icon: Wrench },
  { key: "completed", label: "Completed", icon: Truck },
];

const TrackOrder = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Tables<"orders"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("orders").select("*").eq("id", id).single().then(({ data }) => {
      setOrder(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Section><div className="h-48 bg-muted rounded-lg animate-pulse max-w-lg mx-auto" /></Section>;
  if (!order) return <Section><p className="text-center text-muted-foreground">Order not found.</p></Section>;

  const currentIndex = statusSteps.findIndex((s) => s.key === order.status);

  return (
    <Section>
      <div className="max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-bold text-center mb-2">Order Tracking</h1>
        <p className="text-center text-muted-foreground text-sm mb-8">Order placed {new Date(order.created_at).toLocaleDateString()}</p>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-6">
              {statusSteps.map((step, i) => (
                <div key={step.key} className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    i <= currentIndex ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="pt-2">
                    <p className={cn("font-medium text-sm", i <= currentIndex ? "text-foreground" : "text-muted-foreground")}>
                      {step.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  );
};

export default TrackOrder;
