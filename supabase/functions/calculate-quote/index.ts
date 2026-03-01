import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuoteRequest {
  material_id: string;
  length_inches: number;
  width_inches: number;
  edge_profile?: string;
  num_cutouts: number;
  layout_url?: string;
  reference_measurement_inches?: number;
  calculated_sqft?: number;
  customer_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get auth user from request (optional - quotes can be anonymous)
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    let customerId: string | null = null;

    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", userId)
          .single();
        customerId = customer?.id || null;
      }
    }

    const body: QuoteRequest = await req.json();

    // Validate input
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

    // ──────────────────────────────────────────
    // 1. Fetch ALL settings (using service role — bypasses RLS)
    // ──────────────────────────────────────────
    const { data: settings } = await supabase
      .from("business_settings")
      .select("key, value");

    const cfg: Record<string, number> = {};
    for (const s of settings || []) {
      cfg[s.key] = parseFloat(s.value) || 0;
    }

    const overagePct = cfg["overage_pct"] ?? 10;
    const taxRate = cfg["tax_rate"] ?? 7;
    const internalPricePerSqft = cfg["internal_price_per_sqft"] ?? 45;
    const estimatedFabricationAvg = cfg["estimated_fabrication_avg"] ?? 500;
    const estimatedAddonAvg = cfg["estimated_addon_avg"] ?? 300;
    const lowerBufferPct = cfg["lower_buffer_pct"] ?? 8;
    const upperBufferPct = cfg["upper_buffer_pct"] ?? 18;
    const slabStandardMax = cfg["slab_standard_max_sqft"] ?? 45;
    const slabJumboMax = cfg["slab_jumbo_max_sqft"] ?? 55;
    const slabSuperJumboMax = cfg["slab_super_jumbo_max_sqft"] ?? 65;

    // ──────────────────────────────────────────
    // 2. Calculate square footage
    // ──────────────────────────────────────────
    let areaSqft: number;
    if (calculatedSqft && calculatedSqft > 0) {
      areaSqft = calculatedSqft;
    } else {
      areaSqft = (lengthInches * widthInches) / 144;
    }

    // Apply overage
    const areaWithOverage = areaSqft * (1 + overagePct / 100);

    // ──────────────────────────────────────────
    // 3. Determine slab category
    // ──────────────────────────────────────────
    let slabCategory: string;
    if (areaWithOverage <= slabStandardMax) {
      slabCategory = "Standard";
    } else if (areaWithOverage <= slabJumboMax) {
      slabCategory = "Jumbo";
    } else if (areaWithOverage <= slabSuperJumboMax) {
      slabCategory = "Super Jumbo";
    } else {
      slabCategory = "Custom";
    }

    // ──────────────────────────────────────────
    // 4. Calculate slabs needed
    //    Using standard slab size as base (standard max) for calculation
    // ──────────────────────────────────────────
    const slabsNeeded = Math.ceil(areaWithOverage / slabStandardMax);

    // ──────────────────────────────────────────
    // 5. Fetch pricing rules for material (ADMIN-ONLY data, never returned)
    // ──────────────────────────────────────────
    const { data: pricingRule } = await supabase
      .from("pricing_rules")
      .select("*")
      .eq("material_id", body.material_id)
      .eq("is_active", true)
      .single();

    // Use material-specific pricing if available, otherwise internal default
    const pricePerSqft = pricingRule?.price_per_sqft
      ? Number(pricingRule.price_per_sqft)
      : internalPricePerSqft;
    const laborRate = pricingRule?.labor_rate_per_sqft
      ? Number(pricingRule.labor_rate_per_sqft)
      : 0;
    const edgeCost = body.edge_profile && pricingRule?.edge_profile_cost
      ? Number(pricingRule.edge_profile_cost)
      : 0;
    const cutoutCost = pricingRule?.cutout_cost
      ? numCutouts * Number(pricingRule.cutout_cost)
      : 0;

    // ──────────────────────────────────────────
    // 6. Calculate internal_total (NEVER EXPOSED)
    // ──────────────────────────────────────────
    const materialCost = areaWithOverage * pricePerSqft;
    const laborCost = areaWithOverage * laborRate;
    const subtotal =
      materialCost +
      laborCost +
      edgeCost +
      cutoutCost +
      estimatedFabricationAvg +
      estimatedAddonAvg;
    const tax = subtotal * (taxRate / 100);
    const internalTotal = subtotal + tax;

    // ──────────────────────────────────────────
    // 7. Generate Conservative Smart Range
    //    range_min = internal_total × (1 + lower_buffer)
    //    range_max = internal_total × (1 + upper_buffer)
    // ──────────────────────────────────────────
    const rangeMin = Math.round(internalTotal * (1 + lowerBufferPct / 100));
    const rangeMax = Math.round(internalTotal * (1 + upperBufferPct / 100));

    // ──────────────────────────────────────────
    // 8. Store quote in database (internal_total stored but never returned)
    // ──────────────────────────────────────────
    const { data: quote, error: insertError } = await supabase
      .from("quotes")
      .insert({
        customer_id: customerId,
        material_id: body.material_id,
        length_inches: lengthInches || 0,
        width_inches: widthInches || 0,
        edge_profile: body.edge_profile || null,
        num_cutouts: numCutouts,
        estimated_total: internalTotal, // stored server-side only
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

    // ──────────────────────────────────────────
    // 9. Return ONLY the safe range — no internal pricing
    // ──────────────────────────────────────────
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
