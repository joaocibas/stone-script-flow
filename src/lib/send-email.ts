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
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}
