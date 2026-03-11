import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANALYSIS_TYPES = ["lead_qualification", "appointment_briefing"] as const;
type AnalysisType = (typeof ANALYSIS_TYPES)[number];

const PROMPTS: Record<AnalysisType, string> = {
  lead_qualification: `You are a sales analyst for a countertop company in Sarasota, FL. Analyze the provided lead data and return structured analysis. Consider: project type, city, dimensions, material, options, whether files were uploaded, whether an appointment was scheduled, timeline urgency, and completeness of information.`,
  appointment_briefing: `You are a field operations coordinator for a countertop company. Based on the appointment and related lead/quote data, generate a concise consultation briefing for the estimator visiting the client. Include what to confirm on-site, likely needs, and preparation notes.`,
};

function getToolSchema(type: AnalysisType) {
  if (type === "lead_qualification") {
    return {
      name: "return_lead_analysis",
      description: "Return structured lead analysis",
      parameters: {
        type: "object",
        properties: {
          leadTemperature: { type: "string", enum: ["Hot Lead", "Warm Lead", "Cold Lead"] },
          temperatureReasoning: { type: "string" },
          projectSummary: { type: "string" },
          missingInformation: { type: "array", items: { type: "string" } },
          recommendedNextAction: { type: "string" },
          salesNotes: { type: "string" },
          followUpPriority: { type: "string", enum: ["immediate", "within_24h", "within_week", "low"] },
          followUpActions: { type: "array", items: { type: "string" } },
        },
        required: ["leadTemperature", "temperatureReasoning", "projectSummary", "missingInformation", "recommendedNextAction", "salesNotes", "followUpPriority", "followUpActions"],
      },
    };
  }
  return {
    name: "return_appointment_briefing",
    description: "Return structured appointment briefing",
    parameters: {
      type: "object",
      properties: {
        clientSummary: { type: "string" },
        projectOverview: { type: "string" },
        estimatedScope: { type: "string" },
        likelyNeeds: { type: "array", items: { type: "string" } },
        questionsToConfirm: { type: "array", items: { type: "string" } },
        preparationNotes: { type: "string" },
        importantFlags: { type: "array", items: { type: "string" } },
      },
      required: ["clientSummary", "projectOverview", "likelyNeeds", "questionsToConfirm", "preparationNotes"],
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Check admin or sales role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "sales"])
      .limit(1);

    if (!roleData?.length) {
      return new Response(JSON.stringify({ error: "Admin or sales access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { analysis_type, lead_id, appointment_id } = await req.json();

    if (!ANALYSIS_TYPES.includes(analysis_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid analysis_type. Must be: ${ANALYSIS_TYPES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const type = analysis_type as AnalysisType;

    // Gather context data
    let contextData: Record<string, unknown> = {};

    if (lead_id) {
      const { data: lead } = await supabaseAdmin.from("leads").select("*").eq("id", lead_id).single();
      contextData.lead = lead;

      // Get related quote if exists
      if (lead?.quote_id) {
        const { data: quote } = await supabaseAdmin.from("quotes").select("*, materials(name, category)").eq("id", lead.quote_id).single();
        contextData.quote = quote;
      }

      // Get related appointments
      const { data: appointments } = await supabaseAdmin
        .from("appointments")
        .select("*")
        .or(`customer_email.eq.${lead?.email}`);
      if (appointments?.length) contextData.appointments = appointments;
    }

    if (appointment_id) {
      const { data: appointment } = await supabaseAdmin.from("appointments").select("*").eq("id", appointment_id).single();
      contextData.appointment = appointment;

      // Find related lead by email
      if (appointment?.customer_email) {
        const { data: leads } = await supabaseAdmin
          .from("leads")
          .select("*")
          .eq("email", appointment.customer_email)
          .order("created_at", { ascending: false })
          .limit(1);
        if (leads?.length) {
          contextData.lead = leads[0];
          if (leads[0].quote_id) {
            const { data: quote } = await supabaseAdmin.from("quotes").select("*, materials(name, category)").eq("id", leads[0].quote_id).single();
            contextData.quote = quote;
          }
        }
      }
    }

    if (!contextData.lead && !contextData.appointment) {
      return new Response(JSON.stringify({ error: "No data found for the given ID" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolSchema = getToolSchema(type);
    const userPrompt = `Analyze the following data:\n\n${JSON.stringify(contextData, null, 2)}\n\nProvide your structured analysis.`;

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
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      resultJson = { raw: aiData.choices?.[0]?.message?.content ?? "No response" };
    }

    // Store analysis
    const insertData: Record<string, unknown> = {
      analysis_type: type,
      result_json: resultJson,
      model_used: "google/gemini-3-flash-preview",
    };
    if (lead_id) insertData.lead_id = lead_id;
    if (appointment_id) insertData.appointment_id = appointment_id;

    const { data: analysis, error: insertErr } = await supabaseAdmin
      .from("lead_ai_analyses")
      .insert(insertData)
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to store analysis:", insertErr);
    }

    return new Response(
      JSON.stringify({ analysis_id: analysis?.id, analysis_type: type, result: resultJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-lead-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
