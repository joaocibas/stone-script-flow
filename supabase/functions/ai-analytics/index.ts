import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPORT_TYPES = [
  "icp_analysis",
  "funnel_analysis",
  "pricing_validation",
  "sla_monitoring",
  "reservation_conflicts",
  "followup_emails",
  "revenue_by_material",
] as const;

type ReportType = (typeof REPORT_TYPES)[number];

// Map report type to the view(s) it needs
const VIEW_MAP: Record<ReportType, string[]> = {
  icp_analysis: ["v_icp_signals", "v_funnel_metrics"],
  funnel_analysis: ["v_funnel_metrics", "v_scheduling_patterns"],
  pricing_validation: ["v_pricing_validation"],
  sla_monitoring: ["v_sla_summary"],
  reservation_conflicts: ["v_reservation_patterns"],
  followup_emails: ["v_funnel_metrics", "v_reservation_patterns", "v_scheduling_patterns"],
  revenue_by_material: ["v_revenue_by_material"],
};

// System prompts per report type
const PROMPTS: Record<ReportType, string> = {
  icp_analysis: `You are a business analyst for a countertop company in Sarasota, FL. Analyze the provided anonymized customer data and identify the Ideal Customer Profile (ICP). Focus on: buying patterns, order frequency, average lifetime value, geographic concentration, and material preferences. Provide actionable segmentation recommendations.`,
  funnel_analysis: `You are a conversion optimization specialist for a countertop company. Analyze the provided funnel metrics (quotes → reservations → orders) and scheduling data. Identify bottlenecks, drop-off points, and recommend specific improvements to increase conversion at each stage.`,
  pricing_validation: `You are a pricing strategist for a countertop company. Analyze the provided pricing data including per-material rates, quote volumes, and price ranges. Identify pricing anomalies, materials that may be over/under-priced relative to demand, and recommend adjustments.`,
  sla_monitoring: `You are an operations analyst for a countertop company. Analyze the SLA breach data including breach types, frequency, and acknowledgment rates. Identify systemic issues, patterns in breaches, and recommend process improvements to reduce SLA violations.`,
  reservation_conflicts: `You are an inventory operations analyst for a countertop company. Analyze reservation patterns including hold durations, expiration rates, cancellation rates, and conversion rates. Identify conflicts, inefficiencies in the reservation system, and recommend deposit/hold duration optimizations.`,
  followup_emails: `You are a customer success specialist for a countertop company. Based on the provided funnel, reservation, and scheduling data, generate 3-5 follow-up email templates for different scenarios (abandoned quote, expired reservation, post-appointment follow-up, re-engagement). Each email should have a subject line, body text, and recommended send timing.`,
  revenue_by_material: `You are a revenue analyst for a countertop company. Analyze revenue breakdown by material type including order counts, total revenue, average order value, and customer distribution. Identify top-performing materials, underperformers, and recommend inventory/marketing focus areas.`,
};

// Tool schemas for structured output per report type
function getToolSchema(type: ReportType) {
  const base = {
    icp_analysis: {
      name: "return_icp_analysis",
      description: "Return structured ICP analysis results",
      parameters: {
        type: "object",
        properties: {
          segments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                estimated_percentage: { type: "number" },
                avg_lifetime_value: { type: "number" },
                key_characteristics: { type: "array", items: { type: "string" } },
              },
              required: ["name", "description", "key_characteristics"],
            },
          },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["segments", "recommendations", "summary"],
      },
    },
    funnel_analysis: {
      name: "return_funnel_analysis",
      description: "Return structured funnel analysis results",
      parameters: {
        type: "object",
        properties: {
          stages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                stage: { type: "string" },
                count: { type: "number" },
                conversion_rate: { type: "number" },
                bottleneck_severity: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["stage", "count"],
            },
          },
          bottlenecks: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["stages", "recommendations", "summary"],
      },
    },
    pricing_validation: {
      name: "return_pricing_validation",
      description: "Return structured pricing validation results",
      parameters: {
        type: "object",
        properties: {
          materials: {
            type: "array",
            items: {
              type: "object",
              properties: {
                material: { type: "string" },
                current_price_sqft: { type: "number" },
                suggested_action: { type: "string", enum: ["keep", "increase", "decrease", "review"] },
                reasoning: { type: "string" },
              },
              required: ["material", "suggested_action", "reasoning"],
            },
          },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["materials", "recommendations", "summary"],
      },
    },
    sla_monitoring: {
      name: "return_sla_monitoring",
      description: "Return structured SLA monitoring results",
      parameters: {
        type: "object",
        properties: {
          breach_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                breach_type: { type: "string" },
                count: { type: "number" },
                severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                root_cause: { type: "string" },
              },
              required: ["breach_type", "severity", "root_cause"],
            },
          },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["breach_analysis", "recommendations", "summary"],
      },
    },
    reservation_conflicts: {
      name: "return_reservation_analysis",
      description: "Return structured reservation conflict analysis",
      parameters: {
        type: "object",
        properties: {
          metrics: {
            type: "object",
            properties: {
              conversion_rate: { type: "number" },
              expiration_rate: { type: "number" },
              avg_hold_hours: { type: "number" },
              optimal_hold_hours: { type: "number" },
            },
          },
          issues: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["metrics", "recommendations", "summary"],
      },
    },
    followup_emails: {
      name: "return_followup_emails",
      description: "Return structured follow-up email templates",
      parameters: {
        type: "object",
        properties: {
          emails: {
            type: "array",
            items: {
              type: "object",
              properties: {
                scenario: { type: "string" },
                subject: { type: "string" },
                body: { type: "string" },
                send_timing: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
              },
              required: ["scenario", "subject", "body", "send_timing"],
            },
          },
          summary: { type: "string" },
        },
        required: ["emails", "summary"],
      },
    },
    revenue_by_material: {
      name: "return_revenue_analysis",
      description: "Return structured revenue by material analysis",
      parameters: {
        type: "object",
        properties: {
          materials: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                order_count: { type: "number" },
                total_revenue: { type: "number" },
                avg_order_value: { type: "number" },
                performance: { type: "string", enum: ["top", "average", "underperforming"] },
              },
              required: ["name", "performance"],
            },
          },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
        required: ["materials", "recommendations", "summary"],
      },
    },
  };
  return base[type];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabaseUser.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { report_type } = await req.json();

    if (!REPORT_TYPES.includes(report_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid report_type. Must be one of: ${REPORT_TYPES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const type = report_type as ReportType;

    // Fetch anonymized data from views (using service role to bypass RLS on views)
    const viewData: Record<string, unknown> = {};
    for (const viewName of VIEW_MAP[type]) {
      const { data, error } = await supabaseAdmin.from(viewName).select("*");
      if (error) {
        console.error(`Error fetching ${viewName}:`, error);
        viewData[viewName] = { error: error.message };
      } else {
        viewData[viewName] = data;
      }
    }

    // Call AI Gateway with tool calling for structured output
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolSchema = getToolSchema(type);
    const userPrompt = `Here is the anonymized business data for analysis:\n\n${JSON.stringify(viewData, null, 2)}\n\nAnalyze this data and provide your structured findings.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: PROMPTS[type] },
          { role: "user", content: userPrompt },
        ],
        tools: [{ type: "function", function: toolSchema }],
        tool_choice: { type: "function", function: { name: toolSchema.name } },
      }),
    });

    if (!aiResponse.ok) {
      const statusCode = aiResponse.status;
      if (statusCode === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (statusCode === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", statusCode, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let resultJson: unknown;
    if (toolCall?.function?.arguments) {
      try {
        resultJson = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch {
        resultJson = { raw: toolCall.function.arguments };
      }
    } else {
      // Fallback: use message content
      resultJson = { raw: aiData.choices?.[0]?.message?.content ?? "No response" };
    }

    // Store report
    const { data: report, error: insertErr } = await supabaseAdmin
      .from("admin_ai_reports")
      .insert({
        report_type: type,
        period: "snapshot",
        result_json: resultJson,
        model_used: "google/gemini-3-flash-preview",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to store report:", insertErr);
    }

    return new Response(
      JSON.stringify({ report_id: report?.id, report_type: type, result: resultJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-analytics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
