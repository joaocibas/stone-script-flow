import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Expire overdue reservations and release slabs
  const { data: expirationResult, error: expErr } = await supabase
    .rpc("expire_overdue_reservations");

  if (expErr) {
    console.error("Expiration error:", expErr);
    return new Response(
      JSON.stringify({ error: "Failed to expire reservations", details: expErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const expired = expirationResult?.[0]?.expired_count ?? 0;
  const released = expirationResult?.[0]?.slabs_released ?? 0;

  console.log(`Reservation maintenance: ${expired} expired, ${released} slabs released`);

  // 2. Also run SLA checks while we're here
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

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, created_at")
    .eq("status", "active");

  let alertsCreated = 0;

  for (const res of reservations ?? []) {
    const depositTime = new Date(res.created_at);
    const now = new Date();
    const hoursSinceDeposit =
      (now.getTime() - depositTime.getTime()) / (1000 * 60 * 60);

    const { data: events } = await supabase
      .from("sla_events")
      .select("event_type")
      .eq("reservation_id", res.id);

    const eventTypes = new Set((events ?? []).map((e: any) => e.event_type));

    const { data: existingAlerts } = await supabase
      .from("sla_alerts")
      .select("breach_type")
      .eq("reservation_id", res.id)
      .eq("acknowledged", false);

    const existingBreaches = new Set(
      (existingAlerts ?? []).map((a: any) => a.breach_type)
    );

    if (
      hoursSinceDeposit > maxContact &&
      !eventTypes.has("first_contact") &&
      !existingBreaches.has("first_contact")
    ) {
      await supabase
        .from("sla_alerts")
        .insert({ reservation_id: res.id, breach_type: "first_contact" });
      alertsCreated++;
    }

    if (
      hoursSinceDeposit > maxSchedule &&
      !eventTypes.has("appointment_scheduled") &&
      !existingBreaches.has("appointment_scheduled")
    ) {
      await supabase
        .from("sla_alerts")
        .insert({ reservation_id: res.id, breach_type: "appointment_scheduled" });
      alertsCreated++;
    }

    if (eventTypes.has("measurement_completed")) {
      const { data: measEvent } = await supabase
        .from("sla_events")
        .select("occurred_at")
        .eq("reservation_id", res.id)
        .eq("event_type", "measurement_completed")
        .single();

      if (measEvent) {
        const hoursSinceMeasurement =
          (now.getTime() - new Date(measEvent.occurred_at).getTime()) /
          (1000 * 60 * 60);
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
    JSON.stringify({
      reservations_expired: expired,
      slabs_released: released,
      sla_checked: reservations?.length ?? 0,
      sla_alerts_created: alertsCreated,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
