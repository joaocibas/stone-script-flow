// Altar Stone email templates

const BRAND = {
  primary: "#1a1a2e",
  accent: "#c9a96e",
  bg: "#f9f8f6",
  text: "#333",
  muted: "#777",
};

const wrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,sans-serif;color:${BRAND.text};">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:${BRAND.primary};padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:${BRAND.accent};font-size:24px;letter-spacing:1px;">ALTAR STONE</h1>
      <p style="margin:4px 0 0;color:#ccc;font-size:12px;letter-spacing:2px;">COUNTERTOPS</p>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="background:${BRAND.bg};padding:20px 32px;text-align:center;font-size:12px;color:${BRAND.muted};">
      <p style="margin:0;">Altar Stone Countertops</p>
      <p style="margin:4px 0 0;">info@altarstonecountertops.com</p>
    </div>
  </div>
</body>
</html>`;

export function newQuoteEmail(data: {
  customerName: string;
  email: string;
  phone: string;
  material: string;
  sqft: number;
  rangeMin: number;
  rangeMax: number;
  quoteId: string;
}) {
  return {
    to: "info@altarstonecountertops.com",
    subject: `New Quote Request — ${data.customerName}`,
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;">New Quote Submitted</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:${BRAND.muted};width:140px;">Customer</td><td style="padding:8px 0;font-weight:600;">${data.customerName}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};">Email</td><td style="padding:8px 0;">${data.email}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};">Phone</td><td style="padding:8px 0;">${data.phone || "—"}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};">Material</td><td style="padding:8px 0;">${data.material}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};">Area</td><td style="padding:8px 0;">${data.sqft} sq ft</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};">Estimate Range</td><td style="padding:8px 0;font-weight:600;">$${data.rangeMin.toLocaleString()} — $${data.rangeMax.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 0;color:${BRAND.muted};">Quote ID</td><td style="padding:8px 0;font-size:12px;">${data.quoteId}</td></tr>
      </table>
    `),
  };
}

export function quoteApprovedEmail(data: {
  customerName: string;
  material: string;
  sqft: number;
  total: number;
  depositRequired: number;
}) {
  return {
    subject: `Your Altar Stone Estimate Is Ready`,
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;">Hi ${data.customerName},</h2>
      <p>Great news! Your countertop estimate has been approved and is ready for review.</p>
      <div style="background:${BRAND.bg};border-radius:8px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:${BRAND.muted};">Material</td><td style="padding:6px 0;text-align:right;">${data.material}</td></tr>
          <tr><td style="padding:6px 0;color:${BRAND.muted};">Area</td><td style="padding:6px 0;text-align:right;">${data.sqft} sq ft</td></tr>
          <tr style="border-top:1px solid #ddd;"><td style="padding:12px 0 6px;font-weight:700;">Total</td><td style="padding:12px 0 6px;text-align:right;font-weight:700;font-size:18px;color:${BRAND.accent};">$${data.total.toLocaleString()}</td></tr>
          <tr><td style="padding:6px 0;color:${BRAND.muted};">Deposit Required (50%)</td><td style="padding:6px 0;text-align:right;">$${data.depositRequired.toLocaleString()}</td></tr>
        </table>
      </div>
      <p style="color:${BRAND.muted};font-size:13px;">Log in to your dashboard to view the full estimate and schedule your consultation.</p>
    `),
  };
}

export function orderConfirmedEmail(data: {
  customerName: string;
  orderId: string;
  total: number;
}) {
  return {
    subject: `Order Confirmed — Altar Stone`,
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;">Hi ${data.customerName},</h2>
      <p>Your order has been confirmed! We're excited to get started on your project.</p>
      <div style="background:${BRAND.bg};border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0;color:${BRAND.muted};font-size:13px;">Order Reference</p>
        <p style="margin:4px 0 12px;font-weight:700;font-size:16px;">${data.orderId.slice(0, 8).toUpperCase()}</p>
        <p style="margin:0;color:${BRAND.muted};font-size:13px;">Total</p>
        <p style="margin:4px 0 0;font-weight:700;font-size:22px;color:${BRAND.accent};">$${data.total.toLocaleString()}</p>
      </div>
      <p>Our team will be in touch shortly to coordinate next steps. You can also log in to your dashboard to track your order.</p>
    `),
  };
}

export function appointmentScheduledEmail(data: {
  customerName: string;
  date: string;
  time: string;
  address: string;
}) {
  return {
    subject: `Appointment Scheduled — ${data.date}`,
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;">Hi ${data.customerName},</h2>
      <p>Your measurement consultation has been scheduled. Here are the details:</p>
      <div style="background:${BRAND.bg};border-radius:8px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:${BRAND.muted};width:100px;">Date</td><td style="padding:8px 0;font-weight:600;">${data.date}</td></tr>
          <tr><td style="padding:8px 0;color:${BRAND.muted};">Time</td><td style="padding:8px 0;font-weight:600;">${data.time}</td></tr>
          ${data.address ? `<tr><td style="padding:8px 0;color:${BRAND.muted};">Address</td><td style="padding:8px 0;">${data.address}</td></tr>` : ""}
        </table>
      </div>
      <p style="color:${BRAND.muted};font-size:13px;">Need to reschedule? Log in to your dashboard to make changes.</p>
    `),
  };
}
