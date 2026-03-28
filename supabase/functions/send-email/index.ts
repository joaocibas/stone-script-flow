import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function readLine(reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder): Promise<string> {
  let line = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    line += decoder.decode(value, { stream: true });
    if (line.includes("\r\n")) break;
  }
  return line.trim();
}

async function sendSmtpCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  encoder: TextEncoder,
  command: string
): Promise<string> {
  await writer.write(encoder.encode(command + "\r\n"));
  const response = await readLine(reader, decoder);
  console.log(`SMTP: ${command.startsWith("AUTH") || command.startsWith("PASS") ? "[REDACTED]" : command} -> ${response}`);
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
    if (!SMTP_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "SMTP_PASSWORD not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const username = "info@countertopsaltarstone.com";
    const fromName = "Altar Stone";

    // Connect via TLS to port 465
    const conn = await Deno.connectTls({
      hostname: "smtp.hostinger.com",
      port: 465,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = conn.readable.getReader();
    const writer = conn.writable.getWriter();

    // Read greeting
    const greeting = await readLine(reader, decoder);
    console.log("SMTP greeting:", greeting);

    // EHLO
    await sendSmtpCommand(writer, reader, decoder, encoder, "EHLO countertopsaltarstone.com");
    // Read extra EHLO lines
    await new Promise(r => setTimeout(r, 300));

    // AUTH LOGIN
    await writer.write(encoder.encode("AUTH LOGIN\r\n"));
    await new Promise(r => setTimeout(r, 300));
    const authResp = await readLine(reader, decoder);
    console.log("AUTH LOGIN ->", authResp);

    // Send username (base64)
    await writer.write(encoder.encode(base64Encode(encoder.encode(username)) + "\r\n"));
    await new Promise(r => setTimeout(r, 300));
    const userResp = await readLine(reader, decoder);
    console.log("Username ->", userResp);

    // Send password (base64)
    await writer.write(encoder.encode(base64Encode(encoder.encode(SMTP_PASSWORD)) + "\r\n"));
    await new Promise(r => setTimeout(r, 300));
    const passResp = await readLine(reader, decoder);
    console.log("Password ->", passResp);

    if (!passResp.startsWith("235")) {
      conn.close();
      return new Response(
        JSON.stringify({ error: `SMTP auth failed: ${passResp}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MAIL FROM
    await sendSmtpCommand(writer, reader, decoder, encoder, `MAIL FROM:<${username}>`);

    // RCPT TO
    await sendSmtpCommand(writer, reader, decoder, encoder, `RCPT TO:<${to}>`);

    // DATA
    await sendSmtpCommand(writer, reader, decoder, encoder, "DATA");

    // Build message
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
    await new Promise(r => setTimeout(r, 500));
    const dataResp = await readLine(reader, decoder);
    console.log("DATA response:", dataResp);

    // QUIT
    await sendSmtpCommand(writer, reader, decoder, encoder, "QUIT");

    try { conn.close(); } catch {}

    if (dataResp.startsWith("250")) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: `Send failed: ${dataResp}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
