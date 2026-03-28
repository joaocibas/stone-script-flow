import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BRAND_PRIMARY = "#1a1a2e";
const BRAND_ACCENT = "#C4932A";
const BRAND_BG = "#f9f8f6";
const BRAND_MUTED = "#777";

function reminderHtml(data: { customerName: string; date: string; time: string; address: string }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:Arial,Helvetica,sans-serif;color:#333;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:${BRAND_PRIMARY};padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:${BRAND_ACCENT};font-size:26px;letter-spacing:2px;font-family:'Playfair Display',Georgia,serif;">ALTAR STONE</h1>
      <p style="margin:6px 0 0;color:#ccc;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Premium Countertops</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:${BRAND_PRIMARY};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>This is a friendly reminder that you have an appointment tomorrow.</p>
      <div style="background:${BRAND_BG};border-radius:8px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:${BRAND_MUTED};width:160px;font-size:14px;">Date</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${data.date}</td></tr>
          <tr><td style="padding:8px 0;color:${BRAND_MUTED};font-size:14px;">Time</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${data.time}</td></tr>
          ${data.address ? `<tr><td style="padding:8px 0;color:${BRAND_MUTED};font-size:14px;">Address</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${data.address}</td></tr>` : ""}
        </table>
      </div>
      <p>If you need to reschedule, please contact us as soon as possible.</p>
      <p style="color:${BRAND_MUTED};font-size:13px;">📞 Contact: info@countertopsaltarstone.com</p>
    </div>
    <div style="background:${BRAND_BG};padding:24px 32px;text-align:center;font-size:11px;color:${BRAND_MUTED};border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-weight:600;">Altar Stone Countertops</p>
      <p style="margin:4px 0;">info@countertopsaltarstone.com</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendSmtpEmail(to: string, subject: string, html: string) {
  const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
  if (!SMTP_PASSWORD) throw new Error("SMTP_PASSWORD not configured");

  const username = "info@countertopsaltarstone.com";
  const fromName = "Altar Stone";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connectTls({ hostname: "smtp.hostinger.com", port: 465 });
  const reader = conn.readable.getReader();
  const writer = conn.writable.getWriter();

  const readLine = async (): Promise<string> => {
    let line = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      line += decoder.decode(value, { stream: true });
      if (line.includes("\r\n")) break;
    }
    return line.trim();
  };

  const send = async (cmd: string) => {
    await writer.write(encoder.encode(cmd + "\r\n"));
    await new Promise((r) => setTimeout(r, 300));
    return readLine();
  };

  await readLine(); // greeting
  await send("EHLO countertopsaltarstone.com");
  await writer.write(encoder.encode("AUTH LOGIN\r\n"));
  await new Promise((r) => setTimeout(r, 300));
  await readLine();
  await writer.write(encoder.encode(base64Encode(encoder.encode(username)) + "\r\n"));
  await new Promise((r) => setTimeout(r, 300));
  await readLine();
  await writer.write(encoder.encode(base64Encode(encoder.encode(SMTP_PASSWORD)) + "\r\n"));
  await new Promise((r) => setTimeout(r, 300));
  const passResp = await readLine();
  if (!passResp.startsWith("235")) {
    conn.close();
    throw new Error(`SMTP auth failed: ${passResp}`);
  }

  await send(`MAIL FROM:<${username}>`);
  await send(`RCPT TO:<${to}>`);
  await send("DATA");

  const boundary = "----=_Part_" + crypto.randomUUID().replace(/-/g, "");
  const message = [
    `From: ${fromName} <${username}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    html,
    "",
    `--${boundary}--`,
    ".",
  ].join("\r\n");

  await writer.write(encoder.encode(message + "\r\n"));
  await new Promise((r) => setTimeout(r, 500));
  const dataResp = await readLine();
  await send("QUIT");
  try { conn.close(); } catch {}

  if (!dataResp.startsWith("250")) {
    throw new Error(`Send failed: ${dataResp}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find appointments scheduled for tomorrow with status "confirmed"
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("preferred_date", tomorrowStr)
      .eq("status", "confirmed");

    if (error) throw error;

    let sentCount = 0;
    for (const appt of appointments || []) {
      if (!appt.customer_email) continue;

      try {
        const html = reminderHtml({
          customerName: appt.customer_name,
          date: tomorrowStr,
          time: appt.preferred_time || "TBD",
          address: appt.address,
        });

        await sendSmtpEmail(
          appt.customer_email,
          "Reminder: Your Appointment Tomorrow – Altar Stone",
          html
        );

        // Log notification
        await supabase.from("notifications").insert({
          type: "appointment_reminder",
          subject: "Reminder: Your Appointment Tomorrow – Altar Stone",
          recipient_email: appt.customer_email,
          status: "sent",
          user_id: appt.customer_id || null,
        });

        sentCount++;
        console.log(`Reminder sent to ${appt.customer_email}`);
      } catch (err: any) {
        console.error(`Failed to send reminder to ${appt.customer_email}:`, err.message);
        await supabase.from("notifications").insert({
          type: "appointment_reminder",
          subject: "Reminder: Your Appointment Tomorrow – Altar Stone",
          recipient_email: appt.customer_email,
          status: "failed",
          error_message: err.message,
          user_id: appt.customer_id || null,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sentCount, total_appointments: (appointments || []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Reminder cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
