import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      // No webhook secret configured - parse event directly (development mode)
      event = JSON.parse(body);
    }

    console.log("Webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const orderId = session.metadata?.order_id;
      const customerId = session.metadata?.customer_id;
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

      // Update stripe_payments
      if (session.id) {
        await supabaseAdmin
          .from("stripe_payments")
          .update({
            status: "paid",
            stripe_payment_intent_id: paymentIntentId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_checkout_session_id", session.id);
      }

      // Update order deposit_paid
      if (orderId) {
        const amountPaid = (session.amount_total || 0) / 100;

        // Get current order
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("deposit_paid, total_amount, status")
          .eq("id", orderId)
          .single();

        if (order) {
          const newDeposit = Number(order.deposit_paid) + amountPaid;
          const newStatus = newDeposit >= Number(order.total_amount) ? "confirmed" : order.status;

          await supabaseAdmin
            .from("orders")
            .update({
              deposit_paid: newDeposit,
              status: newStatus === "pending" ? "confirmed" : newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }

        // Record in payments table too
        await supabaseAdmin.from("payments").insert({
          order_id: orderId,
          amount: amountPaid,
          payment_method: "stripe",
          status: "completed",
          transaction_reference: paymentIntentId || session.id,
          notes: `Stripe payment - ${session.metadata?.payment_type || "payment"}`,
        });
      }

      // Send confirmation emails
      try {
        const customerEmail = session.customer_details?.email || session.customer_email;
        if (customerEmail && orderId) {
          await supabaseAdmin.functions.invoke("send-email", {
            body: {
              to: customerEmail,
              subject: "Payment Received – Altar Stone",
              html: `<div style="font-family: 'Playfair Display', Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; border-bottom: 2px solid #C4932A; padding-bottom: 20px; margin-bottom: 30px;">
                  <h1 style="color: #C4932A; margin: 0;">Altar Stone</h1>
                </div>
                <h2 style="color: #333;">Payment Confirmed</h2>
                <p>Thank you for your payment of <strong>$${((session.amount_total || 0) / 100).toFixed(2)}</strong>.</p>
                <p>Order: <strong>#${orderId.slice(0, 8).toUpperCase()}</strong></p>
                <p>We will update you on the progress of your order.</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center;">
                  <p>Altar Stone Countertops · Sarasota, FL</p>
                </div>
              </div>`,
            },
          });

          // Notify admin
          await supabaseAdmin.functions.invoke("send-email", {
            body: {
              to: "info@countertopsaltarstone.com",
              subject: `Payment Received - Order #${orderId.slice(0, 8).toUpperCase()}`,
              html: `<p>Payment of $${((session.amount_total || 0) / 100).toFixed(2)} received for order #${orderId.slice(0, 8).toUpperCase()}.</p>
              <p>Customer: ${session.customer_details?.name || "Unknown"} (${customerEmail})</p>`,
            },
          });
        }
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as any;
      if (session.id) {
        await supabaseAdmin
          .from("stripe_payments")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("stripe_checkout_session_id", session.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
