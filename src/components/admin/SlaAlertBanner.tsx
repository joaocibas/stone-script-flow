import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlaAlert {
  id: string;
  breach_type: string;
  breached_at: string;
  reservation_id: string;
}

export const SlaAlertBanner = () => {
  const [alerts, setAlerts] = useState<SlaAlert[]>([]);

  useEffect(() => {
    supabase
      .from("sla_alerts")
      .select("*")
      .eq("acknowledged", false)
      .order("breached_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setAlerts(data);
      });
  }, []);

  const acknowledge = async (id: string) => {
    await supabase
      .from("sla_alerts")
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-display font-semibold text-destructive">
          {alerts.length} SLA Breach{alerts.length > 1 ? "es" : ""}
        </h3>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between bg-background rounded px-3 py-2 text-sm">
            <div>
              <span className="font-medium capitalize">
                {alert.breach_type.replace(/_/g, " ")}
              </span>
              <span className="text-muted-foreground ml-2">
                Reservation {alert.reservation_id.slice(0, 8)}…
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => acknowledge(alert.id)}>
              Dismiss
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
