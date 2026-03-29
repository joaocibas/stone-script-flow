import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action } = body;

    // ─── CREATE CHECKOUT SESSION ───
    if (action === "create") {
      const { order_id, customer_id, customer_email, customer_name, amount, payment_type } = body;

      if (!order_id || !amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "order_id and positive amount required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amountCents = Math.round(amount * 100);

      // Check for existing Stripe customer
      let customerId: string | undefined;
      if (customer_email) {
        const customers = await stripe.customers.list({ email: customer_email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const newCust = await stripe.customers.create({
            email: customer_email,
            name: customer_name || undefined,
          });
          customerId = newCust.id;
        }
      }

      const origin = req.headers.get("origin") || "https://altarstonecountertops.com";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : customer_email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Altar Stone - ${payment_type === "deposit" ? "Deposit (50%)" : payment_type === "final" ? "Final Payment" : payment_type === "full" ? "Full Payment" : "Payment"}`,
                description: `Order #${order_id.slice(0, 8).toUpperCase()}`,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order_id}`,
        cancel_url: `${origin}/admin/orders/${order_id}`,
        metadata: {
          order_id,
          customer_id: customer_id || "",
          payment_type,
        },
      });

      // Save to stripe_payments table
      const { data: sp, error: spErr } = await supabaseAdmin
        .from("stripe_payments")
        .insert({
          order_id,
          customer_id: customer_id || null,
          amount,
          payment_type,
          stripe_checkout_session_id: session.id,
          stripe_url: session.url,
          status: "pending",
        })
        .select()
        .single();

      if (spErr) console.error("Error saving stripe_payment:", spErr);

      return new Response(
        JSON.stringify({ url: session.url, session_id: session.id, stripe_payment_id: sp?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ─── CANCEL / EXPIRE SESSION ───
    if (action === "cancel") {
      const { stripe_payment_id, stripe_checkout_session_id } = body;

      if (stripe_checkout_session_id) {
        try {
          await stripe.checkout.sessions.expire(stripe_checkout_session_id);
        } catch (e) {
          console.log("Session may already be expired:", e.message);
        }
      }

      if (stripe_payment_id) {
        await supabaseAdmin
          .from("stripe_payments")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", stripe_payment_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ─── REFUND ───
    if (action === "refund") {
      const { stripe_payment_id, stripe_payment_intent_id, refund_amount } = body;

      if (!stripe_payment_intent_id) {
        return new Response(JSON.stringify({ error: "payment_intent_id required for refund" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refundParams: any = { payment_intent: stripe_payment_intent_id };
      if (refund_amount) {
        refundParams.amount = Math.round(refund_amount * 100);
      }

      const refund = await stripe.refunds.create(refundParams);

      if (stripe_payment_id) {
        const refundedAmt = (refund.amount || 0) / 100;
        await supabaseAdmin
          .from("stripe_payments")
          .update({
            status: refund_amount ? "partially_refunded" : "refunded",
            refund_amount: refundedAmt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stripe_payment_id);
      }

      return new Response(JSON.stringify({ success: true, refund_id: refund.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ─── GET SESSION STATUS ───
    if (action === "status") {
      const { stripe_checkout_session_id } = body;
      const session = await stripe.checkout.sessions.retrieve(stripe_checkout_session_id, {
        expand: ["payment_intent"],
      });

      return new Response(
        JSON.stringify({
          status: session.status,
          payment_status: session.payment_status,
          payment_intent: typeof session.payment_intent === "object" ? session.payment_intent?.id : session.payment_intent,
          amount_total: (session.amount_total || 0) / 100,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // ─── LIST PAYMENTS SUMMARY (for financials) ───
    if (action === "financials") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all stripe_payments
      const { data: allPayments } = await supabaseAdmin
        .from("stripe_payments")
        .select("*")
        .order("created_at", { ascending: false });

      const payments = allPayments || [];
      const thisMonth = payments.filter(
        (p) => new Date(p.created_at) >= startOfMonth
      );

      const totalCollected = thisMonth
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalPending = payments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalRefunded = payments
        .filter((p) => p.status === "refunded" || p.status === "partially_refunded")
        .reduce((sum, p) => sum + Number(p.refund_amount || 0), 0);

      return new Response(
        JSON.stringify({ totalCollected, totalPending, totalRefunded, recentPayments: payments.slice(0, 20) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
