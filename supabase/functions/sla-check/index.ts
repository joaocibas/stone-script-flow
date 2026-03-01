import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Load SLA settings
  const { data: settings } = await supabase
    .from("business_settings")
    .select("key, value")
    .in("key", [
      "sla_max_contact_hours",
      "sla_max_schedule_hours",
      "sla_max_final_quote_hours",
    ]);

  const cfg: Record<string, number> = {};
  for (const s of settings ?? []) {
    cfg[s.key] = Number(s.value);
  }
  const maxContact = cfg.sla_max_contact_hours ?? 4;
  const maxSchedule = cfg.sla_max_schedule_hours ?? 24;
  const maxFinalQuote = cfg.sla_max_final_quote_hours ?? 48;

  // Get active reservations
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, created_at")
    .eq("status", "active");

  let alertsCreated = 0;

  for (const res of reservations ?? []) {
    const depositTime = new Date(res.created_at);
    const now = new Date();
    const hoursSinceDeposit = (now.getTime() - depositTime.getTime()) / (1000 * 60 * 60);

    // Get existing SLA events for this reservation
    const { data: events } = await supabase
      .from("sla_events")
      .select("event_type")
      .eq("reservation_id", res.id);

    const eventTypes = new Set((events ?? []).map((e) => e.event_type));

    // Get existing alerts to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from("sla_alerts")
      .select("breach_type")
      .eq("reservation_id", res.id)
      .eq("acknowledged", false);

    const existingBreaches = new Set((existingAlerts ?? []).map((a) => a.breach_type));

    // Check first contact SLA
    if (
      hoursSinceDeposit > maxContact &&
      !eventTypes.has("first_contact") &&
      !existingBreaches.has("first_contact")
    ) {
      await supabase.from("sla_alerts").insert({
        reservation_id: res.id,
        breach_type: "first_contact",
      });
      alertsCreated++;
    }

    // Check scheduling SLA
    if (
      hoursSinceDeposit > maxSchedule &&
      !eventTypes.has("appointment_scheduled") &&
      !existingBreaches.has("appointment_scheduled")
    ) {
      await supabase.from("sla_alerts").insert({
        reservation_id: res.id,
        breach_type: "appointment_scheduled",
      });
      alertsCreated++;
    }

    // Check final quote SLA (only if measurement completed)
    if (eventTypes.has("measurement_completed")) {
      const { data: measEvent } = await supabase
        .from("sla_events")
        .select("occurred_at")
        .eq("reservation_id", res.id)
        .eq("event_type", "measurement_completed")
        .single();

      if (measEvent) {
        const hoursSinceMeasurement =
          (now.getTime() - new Date(measEvent.occurred_at).getTime()) / (1000 * 60 * 60);
        if (
          hoursSinceMeasurement > maxFinalQuote &&
          !eventTypes.has("final_quote_sent") &&
          !existingBreaches.has("final_quote_sent")
        ) {
          await supabase.from("sla_alerts").insert({
            reservation_id: res.id,
            breach_type: "final_quote_sent",
          });
          alertsCreated++;
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ checked: reservations?.length ?? 0, alertsCreated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
