import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuoteRequest {
  material_id: string;
  slab_id?: string;
  length_inches: number;
  width_inches: number;
  edge_profile?: string;
  num_cutouts: number;
  layout_url?: string;
  reference_measurement_inches?: number;
  calculated_sqft?: number;
  customer_id?: string;
}

interface ServiceItem {
  category: string;
  pricing_unit: string;
  cost_value: number;
}

interface SlabServiceRow {
  service_id: string;
  override_cost: number | null;
  override_multiplier: number | null;
  is_active: boolean;
  service_items: ServiceItem;
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

function sumServicesByCategory(
  services: ServiceItem[],
  category: string,
  areaSqft: number,
  numCutouts: number,
  perimeterLinFt: number,
  overrides?: Map<string, { cost: number | null; multiplier: number | null }>,
  serviceIds?: string[],
): number {
  let items = services.filter((s) => s.category === category);
  // If we have slab-specific service IDs, only use those for this category
  if (serviceIds) {
    items = items.filter((s: any) => serviceIds.includes(s.id));
  }
  return items.reduce((total, s) => {
    const sId = (s as any).id;
    const ov = overrides?.get(sId);
    const costValue = ov?.cost != null ? ov.cost : s.cost_value;
    const multiplier = ov?.multiplier != null ? ov.multiplier : 1;
    let unitCost: number;
    switch (s.pricing_unit) {
      case "per_sqft":
        unitCost = costValue * areaSqft;
        break;
      case "per_linear_ft":
        unitCost = costValue * perimeterLinFt;
        break;
      case "per_cutout":
        unitCost = costValue * numCutouts;
        break;
      case "per_project":
      case "fixed":
      default:
        unitCost = costValue;
        break;
    }
    return total + unitCost * multiplier;
  }, 0);
}

function loadSettings(settings: { key: string; value: string }[] | null): Record<string, number> {
  const cfg: Record<string, number> = {};
  for (const s of settings || []) {
    cfg[s.key] = parseFloat(s.value) || 0;
  }
  return cfg;
}

// ────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth (optional — quotes can be anonymous)
    const authHeader = req.headers.get("authorization");
    let customerId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .single();
        customerId = customer?.id || null;
      }
    }

    const body: QuoteRequest = await req.json();

    // Validate
    if (!body.material_id) {
      return new Response(JSON.stringify({ error: "material_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lengthInches = Number(body.length_inches);
    const widthInches = Number(body.width_inches);
    const numCutouts = Number(body.num_cutouts) || 0;
    const calculatedSqft = body.calculated_sqft;

    if ((!lengthInches || !widthInches) && !calculatedSqft) {
      return new Response(JSON.stringify({ error: "Dimensions or calculated_sqft required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Fetch settings, services, slabs, pricing rules in parallel ──
    const fetchPromises: Promise<any>[] = [
      supabase.from("business_settings").select("key, value"),
      supabase.from("service_items").select("id, category, pricing_unit, cost_value").eq("is_active", true),
      supabase.from("slabs").select("sales_value").eq("material_id", body.material_id).eq("status", "available"),
      supabase.from("pricing_rules").select("*").eq("material_id", body.material_id).eq("is_active", true).single(),
    ];

    // If a specific slab is referenced, fetch its best_option overrides + assigned services
    if (body.slab_id) {
      fetchPromises.push(
        supabase.from("slabs")
          .select("best_option_preset, usable_sqft_override, overage_pct_override, sales_value")
          .eq("id", body.slab_id)
          .single()
      );
      fetchPromises.push(
        supabase.from("slab_services")
          .select("service_id, override_cost, override_multiplier, is_active")
          .eq("slab_id", body.slab_id)
          .eq("is_active", true)
      );
    }

    const [settingsRes, servicesRes, slabsRes, pricingRes, selectedSlabRes, slabServicesRes] = await Promise.all(fetchPromises);

    const cfg = loadSettings(settingsRes.data);
    const activeServices: ServiceItem[] = (servicesRes.data as ServiceItem[]) || [];

    let overagePct = cfg["overage_pct"] ?? 10;
    const taxRate = cfg["tax_rate"] ?? 7;
    const lowerBufferPct = cfg["lower_buffer_pct"] ?? 8;
    const upperBufferPct = cfg["upper_buffer_pct"] ?? 18;
    const slabStandardMax = cfg["slab_standard_max_sqft"] ?? 45;
    const slabJumboMax = cfg["slab_jumbo_max_sqft"] ?? 55;
    const slabSuperJumboMax = cfg["slab_super_jumbo_max_sqft"] ?? 65;

    // Fallback defaults from business_settings
    const fallbackFabricationAvg = cfg["estimated_fabrication_avg"] ?? 500;
    const fallbackAddonAvg = cfg["estimated_addon_avg"] ?? 300;

    // ── 1b. Apply slab-level overrides if a specific slab was selected ──
    const selectedSlab = selectedSlabRes?.data ?? null;

    // Override overage % if slab has one set
    if (selectedSlab?.overage_pct_override != null) {
      overagePct = Number(selectedSlab.overage_pct_override);
    }

    // ── 2. Calculate square footage ──
    let areaSqft: number;
    if (selectedSlab?.usable_sqft_override != null && Number(selectedSlab.usable_sqft_override) > 0) {
      // Admin override for defects/vein direction
      areaSqft = Number(selectedSlab.usable_sqft_override);
    } else if (calculatedSqft && calculatedSqft > 0) {
      areaSqft = calculatedSqft;
    } else {
      areaSqft = (lengthInches * widthInches) / 144;
    }

    const areaWithOverage = areaSqft * (1 + overagePct / 100);

    // Perimeter in linear feet (for per_linear_ft pricing)
    const perimeterLinFt = lengthInches && widthInches
      ? (2 * (lengthInches + widthInches)) / 12
      : 0;

    // ── 3. Slab category — prefer slab's best_option_preset if set ──
    let slabCategory: string;
    if (selectedSlab?.best_option_preset) {
      // Map preset key to label
      const presetKey = selectedSlab.best_option_preset;
      if (presetKey === "custom") {
        slabCategory = "Custom";
      } else {
        slabCategory = presetKey.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
    } else {
      if (areaWithOverage <= slabStandardMax) slabCategory = "Standard";
      else if (areaWithOverage <= slabJumboMax) slabCategory = "Jumbo";
      else if (areaWithOverage <= slabSuperJumboMax) slabCategory = "Super Jumbo";
      else slabCategory = "Custom";
    }

    // ── 4. Slabs needed & cost ──
    const slabsNeeded = Math.ceil(areaWithOverage / slabStandardMax);

    let avgSlabValue = 0;
    if (selectedSlab?.sales_value != null) {
      // Use the specific slab's sales value when one is selected
      avgSlabValue = Number(selectedSlab.sales_value);
    } else {
      const availableSlabs = slabsRes.data;
      if (availableSlabs && availableSlabs.length > 0) {
        const total = availableSlabs.reduce((sum: number, s: any) => sum + (Number(s.sales_value) || 0), 0);
        avgSlabValue = total / availableSlabs.length;
      }
    }
    const slabCost = slabsNeeded * avgSlabValue;

    // ── 5. Service costs from service_items table ──
    // Build slab-specific overrides map if a slab has assigned services
    const slabServiceRows: any[] = slabServicesRes?.data ?? [];
    const hasSlabServices = slabServiceRows.length > 0;
    const slabServiceIds = hasSlabServices ? slabServiceRows.map((r: any) => r.service_id) : null;
    const overridesMap = new Map<string, { cost: number | null; multiplier: number | null }>();
    for (const r of slabServiceRows) {
      overridesMap.set(r.service_id, {
        cost: r.override_cost != null ? Number(r.override_cost) : null,
        multiplier: r.override_multiplier != null ? Number(r.override_multiplier) : null,
      });
    }

    const hasServicesForCategory = (cat: string) => {
      if (hasSlabServices) {
        // Only consider assigned services
        return activeServices.some((s: any) => s.category === cat && slabServiceIds!.includes(s.id));
      }
      return activeServices.some((s) => s.category === cat);
    };

    const svcArgs = (cat: string): [ServiceItem[], string, number, number, number, Map<string, { cost: number | null; multiplier: number | null }> | undefined, string[] | undefined] =>
      [activeServices, cat, areaWithOverage, numCutouts, perimeterLinFt, hasSlabServices ? overridesMap : undefined, slabServiceIds ?? undefined];

    const laborCost = hasServicesForCategory("labor")
      ? sumServicesByCategory(...svcArgs("labor"))
      : areaWithOverage * (pricingRes.data?.labor_rate_per_sqft ? Number(pricingRes.data.labor_rate_per_sqft) : 0);

    const edgeCost = hasServicesForCategory("edge_profile")
      ? sumServicesByCategory(...svcArgs("edge_profile"))
      : (body.edge_profile && pricingRes.data?.edge_profile_cost ? Number(pricingRes.data.edge_profile_cost) : 0);

    const cutoutCost = hasServicesForCategory("cutout")
      ? sumServicesByCategory(...svcArgs("cutout"))
      : (pricingRes.data?.cutout_cost ? numCutouts * Number(pricingRes.data.cutout_cost) : 0);

    const fabricationCost = hasServicesForCategory("fabrication")
      ? sumServicesByCategory(...svcArgs("fabrication"))
      : fallbackFabricationAvg;

    const addonCost = hasServicesForCategory("addon")
      ? sumServicesByCategory(...svcArgs("addon"))
      : fallbackAddonAvg;

    // ── 6. Internal total (NEVER EXPOSED) ──
    const subtotal = slabCost + laborCost + edgeCost + cutoutCost + fabricationCost + addonCost;
    const tax = subtotal * (taxRate / 100);
    const internalTotal = subtotal + tax;

    // ── 7. Conservative Smart Range ──
    const rangeMin = Math.round(internalTotal * (1 + lowerBufferPct / 100));
    const rangeMax = Math.round(internalTotal * (1 + upperBufferPct / 100));

    // ── 8. Store quote ──
    const { data: quote, error: insertError } = await supabase
      .from("quotes")
      .insert({
        customer_id: customerId,
        material_id: body.material_id,
        length_inches: lengthInches || 0,
        width_inches: widthInches || 0,
        edge_profile: body.edge_profile || null,
        num_cutouts: numCutouts,
        estimated_total: internalTotal,
        calculated_sqft: areaSqft,
        slabs_needed: slabsNeeded,
        slab_category: slabCategory,
        range_min: rangeMin,
        range_max: rangeMax,
        layout_url: body.layout_url || null,
        reference_measurement_inches: body.reference_measurement_inches || null,
        status: "calculated",
      })
      .select("id, range_min, range_max, calculated_sqft, slabs_needed, slab_category")
      .single();

    if (insertError) {
      console.error("Quote insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create quote" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 9. Return ONLY the safe range ──
    return new Response(
      JSON.stringify({
        quote_id: quote.id,
        calculated_sqft: Number(quote.calculated_sqft).toFixed(1),
        slabs_needed: quote.slabs_needed,
        slab_category: quote.slab_category,
        range_min: quote.range_min,
        range_max: quote.range_max,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
