import { supabase } from "@/integrations/supabase/client";

export async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: payload,
    });
    if (error) {
      console.error("Email send failed:", error);
      await logNotification(payload, "failed", error.message);
      return false;
    }
    await logNotification(payload, "sent");
    return true;
  } catch (err: any) {
    console.error("Email send error:", err);
    await logNotification(payload, "failed", err?.message);
    return false;
  }
}

async function logNotification(
  payload: { to: string; subject: string },
  status: string,
  errorMessage?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("notifications" as any).insert({
      user_id: user?.id || null,
      type: deriveType(payload.subject),
      subject: payload.subject,
      recipient_email: payload.to,
      status,
      error_message: errorMessage || null,
    });
  } catch {
    // Don't break main flow if logging fails
  }
}

function deriveType(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("quote") && s.includes("received")) return "quote_submitted";
  if (s.includes("quote") && s.includes("approved")) return "quote_approved";
  if (s.includes("order") && s.includes("confirmed")) return "order_confirmed";
  if (s.includes("order update")) return "order_status_update";
  if (s.includes("appointment confirmed")) return "appointment_scheduled";
  if (s.includes("reminder")) return "appointment_reminder";
  if (s.includes("payment received")) return "payment_received";
  if (s.includes("welcome")) return "account_created";
  if (s.includes("new quote")) return "admin_new_quote";
  return "general";
}
