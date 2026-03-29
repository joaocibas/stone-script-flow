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
      event = JSON.parse(body);
    }

    console.log("Webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const orderId = session.metadata?.order_id;
      const customerId = session.metadata?.customer_id;
      const paymentType = session.metadata?.payment_type || "payment";
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
      const amountPaid = (session.amount_total || 0) / 100;

      // Update stripe_payments — mark as paid with auto-confirmation
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

      // Update order
      if (orderId) {
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("deposit_paid, total_amount, status")
          .eq("id", orderId)
          .single();

        if (order) {
          const newDeposit = Number(order.deposit_paid) + amountPaid;
          let newStatus = order.status;
          if (paymentType === "full" || newDeposit >= Number(order.total_amount)) {
            newStatus = "confirmed";
          } else if (paymentType === "deposit" && order.status === "pending") {
            newStatus = "confirmed";
          } else if (order.status === "pending") {
            newStatus = "confirmed";
          }

          await supabaseAdmin
            .from("orders")
            .update({
              deposit_paid: newDeposit,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }

        // Record in payments table with auto-confirmation
        await supabaseAdmin.from("payments").insert({
          order_id: orderId,
          amount: amountPaid,
          payment_method: "stripe",
          status: "completed",
          transaction_reference: paymentIntentId || session.id,
          notes: `Stripe ${paymentType} — auto-confirmed`,
          confirmed_by: "stripe",
          paid_at: new Date().toISOString(),
        });
      }

      // Send branded confirmation emails
      try {
        const customerEmail = session.customer_details?.email || session.customer_email;
        const customerName = session.customer_details?.name || "Customer";

        if (customerEmail && orderId) {
          // Customer confirmation
          await supabaseAdmin.functions.invoke("send-email", {
            body: {
              to: customerEmail,
              subject: "Payment Received – Altar Stone",
              html: buildPaymentEmailHtml({
                customerName,
                amount: amountPaid,
                orderId,
                paymentType,
                transactionRef: paymentIntentId || session.id,
              }),
            },
          });

          // Admin notification
          await supabaseAdmin.functions.invoke("send-email", {
            body: {
              to: "info@countertopsaltarstone.com",
              subject: `💰 Payment Received — $${amountPaid.toFixed(2)} — Order #${orderId.slice(0, 8).toUpperCase()}`,
              html: buildAdminPaymentNotificationHtml({
                customerName,
                customerEmail,
                amount: amountPaid,
                orderId,
                paymentType,
              }),
            },
          });
        }
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as any;
      console.log("Payment intent succeeded:", pi.id);
      // Already handled by checkout.session.completed in most cases
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

// ── Branded Email Templates ──

function buildPaymentEmailHtml(data: { customerName: string; amount: number; orderId: string; paymentType: string; transactionRef: string }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  </head><body style="margin:0;padding:0;background:#f9f8f6;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#C4932A;font-size:26px;letter-spacing:2px;font-family:'Playfair Display',Georgia,serif;">ALTAR STONE</h1>
      <p style="margin:6px 0 0;color:#ccc;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Premium Countertops</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1a1a2e;margin-top:0;font-family:'Playfair Display',Georgia,serif;">Payment Confirmed</h2>
      <p>Hi ${data.customerName},</p>
      <p>We've received your payment. Thank you!</p>
      <div style="background:#f9f8f6;border-radius:8px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#777;font-size:14px;">Amount Paid</td><td style="padding:8px 0;font-size:14px;font-weight:600;">$${data.amount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0;color:#777;font-size:14px;">Payment Type</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-transform:capitalize;">${data.paymentType.replace(/_/g, " ")}</td></tr>
          <tr><td style="padding:8px 0;color:#777;font-size:14px;">Order</td><td style="padding:8px 0;font-size:14px;font-weight:600;">#${data.orderId.slice(0, 8).toUpperCase()}</td></tr>
          <tr><td style="padding:8px 0;color:#777;font-size:14px;">Reference</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${data.transactionRef.slice(0, 16)}...</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://countertopsaltarstone.com/dashboard" style="display:inline-block;background:#C4932A;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View Your Dashboard</a>
      </div>
      <p style="color:#777;font-size:13px;">A receipt is available in your dashboard.</p>
    </div>
    <div style="background:#f9f8f6;padding:24px 32px;text-align:center;font-size:11px;color:#777;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-weight:600;">Altar Stone Countertops</p>
      <p style="margin:4px 0;">info@countertopsaltarstone.com</p>
    </div>
  </div></body></html>`;
}

function buildAdminPaymentNotificationHtml(data: { customerName: string; customerEmail: string; amount: number; orderId: string; paymentType: string }) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;color:#333;">
  <h2 style="color:#C4932A;">💰 Payment Received</h2>
  <table style="border-collapse:collapse;">
    <tr><td style="padding:6px 12px 6px 0;color:#777;">Customer</td><td style="padding:6px 0;font-weight:600;">${data.customerName}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#777;">Email</td><td style="padding:6px 0;">${data.customerEmail}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#777;">Amount</td><td style="padding:6px 0;font-weight:600;color:green;">$${data.amount.toFixed(2)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#777;">Type</td><td style="padding:6px 0;text-transform:capitalize;">${data.paymentType.replace(/_/g, " ")}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#777;">Order</td><td style="padding:6px 0;font-family:monospace;">#${data.orderId.slice(0, 8).toUpperCase()}</td></tr>
  </table>
  <p style="margin-top:16px;"><a href="https://countertopsaltarstone.com/admin/orders/${data.orderId}" style="background:#C4932A;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">View Order</a></p>
  </body></html>`;
}
