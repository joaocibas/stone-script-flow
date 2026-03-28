// Altar Stone email templates — branded with gold accent

const BRAND = {
  primary: "#1a1a2e",
  accent: "#C4932A",
  bg: "#f9f8f6",
  text: "#333",
  muted: "#777",
};

const logoHeader = `
  <div style="background:${BRAND.primary};padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:${BRAND.accent};font-size:26px;letter-spacing:2px;font-family:'Playfair Display',Georgia,serif;">ALTAR STONE</h1>
    <p style="margin:6px 0 0;color:#ccc;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Premium Countertops</p>
  </div>`;

const footer = `
  <div style="background:${BRAND.bg};padding:24px 32px;text-align:center;font-size:11px;color:${BRAND.muted};border-top:1px solid #e5e5e5;">
    <p style="margin:0;font-weight:600;">Altar Stone Countertops</p>
    <p style="margin:4px 0;">info@countertopsaltarstone.com</p>
    <p style="margin:4px 0;">© ${new Date().getFullYear()} Altar Stone. All rights reserved.</p>
    <p style="margin:8px 0 0;font-size:10px;color:#aaa;">If you no longer wish to receive these emails, please contact us.</p>
  </div>`;

const wrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    ${logoHeader}
    <div style="padding:32px;">
      ${content}
    </div>
    ${footer}
  </div>
</body>
</html>`;

const btn = (text: string, url?: string) => `
  <div style="text-align:center;margin:28px 0;">
    <a href="${url || '#'}" style="display:inline-block;background:${BRAND.accent};color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.5px;">${text}</a>
  </div>`;

const row = (label: string, value: string) =>
  `<tr><td style="padding:8px 0;color:${BRAND.muted};width:160px;font-size:14px;">${label}</td><td style="padding:8px 0;font-size:14px;font-weight:600;">${value}</td></tr>`;

const infoBox = (rows: string) => `
  <div style="background:${BRAND.bg};border-radius:8px;padding:20px;margin:20px 0;">
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>`;

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── 1. NEW QUOTE SUBMITTED → Customer ───
export function quoteReceivedCustomerEmail(data: {
  customerName: string;
  quoteId: string;
  material: string;
  sqft: number;
  rangeMin: number;
  rangeMax: number;
}) {
  return {
    subject: "Your Quote Request Has Been Received – Altar Stone",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>Thank you for requesting a quote! We've received your information and our team is reviewing it.</p>
      ${infoBox(
        row("Quote ID", data.quoteId.slice(0, 8).toUpperCase()) +
        row("Material", data.material) +
        row("Area", `${data.sqft} sq ft`) +
        row("Estimate Range", `${fmt(data.rangeMin)} — ${fmt(data.rangeMax)}`)
      )}
      <p><strong>Next Steps:</strong></p>
      <ul style="color:${BRAND.text};font-size:14px;line-height:1.8;">
        <li>Our team will review your quote within 24 hours</li>
        <li>We'll contact you to schedule a measurement consultation</li>
        <li>You can track your quote in your customer dashboard</li>
      </ul>
      <p style="color:${BRAND.muted};font-size:13px;margin-top:24px;">If you have any questions, don't hesitate to reach out.</p>
    `),
  };
}

// ─── 10. NEW QUOTE SUBMITTED → Admin ───
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
    to: "info@countertopsaltarstone.com",
    subject: `New Quote Received – ${data.customerName}`,
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;">New Quote Submitted</h2>
      ${infoBox(
        row("Customer", data.customerName) +
        row("Email", data.email) +
        row("Phone", data.phone || "—") +
        row("Material", data.material) +
        row("Area", `${data.sqft} sq ft`) +
        row("Estimate Range", `${fmt(data.rangeMin)} — ${fmt(data.rangeMax)}`) +
        row("Quote ID", data.quoteId.slice(0, 8).toUpperCase())
      )}
      <p style="color:${BRAND.muted};font-size:13px;">Log in to the admin panel to view and manage this quote.</p>
    `),
  };
}

// ─── 2. QUOTE APPROVED ───
export function quoteApprovedEmail(data: {
  customerName: string;
  material: string;
  sqft: number;
  total: number;
  depositRequired: number;
}) {
  return {
    subject: "Your Quote Has Been Approved – Altar Stone",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>Great news! Your countertop estimate has been approved and is ready for review.</p>
      ${infoBox(
        row("Material", data.material) +
        row("Area", `${data.sqft} sq ft`) +
        `<tr style="border-top:1px solid #ddd;"><td style="padding:12px 0 6px;font-weight:700;">Total</td><td style="padding:12px 0 6px;text-align:right;font-weight:700;font-size:18px;color:${BRAND.accent};">${fmt(data.total)}</td></tr>` +
        row("Deposit Required (50%)", fmt(data.depositRequired))
      )}
      <p><strong>To confirm your order:</strong> Log in to your dashboard to review the full estimate and proceed with your deposit.</p>
      ${btn("View Your Estimate")}
      <p style="color:${BRAND.muted};font-size:13px;">This estimate is valid for 30 days.</p>
    `),
  };
}

// ─── 3. ORDER CONFIRMED ───
export function orderConfirmedEmail(data: {
  customerName: string;
  orderId: string;
  total: number;
  depositPaid?: number;
  remainingBalance?: number;
}) {
  const deposit = data.depositPaid || 0;
  const remaining = data.remainingBalance ?? (data.total - deposit);
  return {
    subject: "Your Order Has Been Confirmed – Altar Stone",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>Your order has been confirmed! We're excited to get started on your project.</p>
      ${infoBox(
        row("Order ID", data.orderId.slice(0, 8).toUpperCase()) +
        `<tr style="border-top:1px solid #ddd;"><td style="padding:12px 0 6px;font-weight:700;">Total</td><td style="padding:12px 0 6px;font-weight:700;font-size:18px;color:${BRAND.accent};">${fmt(data.total)}</td></tr>` +
        row("Deposit Paid", fmt(deposit)) +
        row("Remaining Balance", fmt(remaining))
      )}
      <p>Our team will be in touch shortly to coordinate next steps. You can also track your order in your dashboard.</p>
      ${btn("Track Your Order")}
    `),
  };
}

// ─── 4. ORDER STATUS UPDATED ───
export function orderStatusUpdateEmail(data: {
  customerName: string;
  orderId: string;
  newStatus: string;
}) {
  const statusMessages: Record<string, string> = {
    confirmed: "Your order has been confirmed and is being prepared.",
    in_progress: "Your countertops are now in production! Our craftsmen are working on your project.",
    completed: "Great news! Your order is complete and ready for delivery/installation.",
    cancelled: "Your order has been cancelled. Please contact us if you have questions.",
    pending: "Your order is pending review by our team.",
  };
  const message = statusMessages[data.newStatus] || `Your order status has been updated to: ${data.newStatus}.`;
  return {
    subject: "Order Update – Altar Stone",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>${message}</p>
      ${infoBox(
        row("Order ID", data.orderId.slice(0, 8).toUpperCase()) +
        row("New Status", `<span style="color:${BRAND.accent};font-weight:700;text-transform:capitalize;">${data.newStatus.replace("_", " ")}</span>`)
      )}
      <p>Log in to your dashboard for full details.</p>
      ${btn("View Order Details")}
    `),
  };
}

// ─── 5. APPOINTMENT SCHEDULED ───
export function appointmentScheduledEmail(data: {
  customerName: string;
  date: string;
  time: string;
  address: string;
  type?: string;
}) {
  return {
    subject: "Appointment Confirmed – Altar Stone",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>Your ${data.type || "consultation"} appointment has been scheduled. Here are the details:</p>
      ${infoBox(
        (data.type ? row("Type", data.type) : "") +
        row("Date", data.date) +
        row("Time", data.time || "TBD") +
        (data.address ? row("Address", data.address) : "")
      )}
      <p style="color:${BRAND.muted};font-size:13px;">Need to reschedule? Log in to your dashboard or contact us directly.</p>
    `),
  };
}

// ─── 6. APPOINTMENT REMINDER ───
export function appointmentReminderEmail(data: {
  customerName: string;
  date: string;
  time: string;
  address: string;
}) {
  return {
    subject: "Reminder: Your Appointment Tomorrow – Altar Stone",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>This is a friendly reminder that you have an appointment tomorrow.</p>
      ${infoBox(
        row("Date", data.date) +
        row("Time", data.time || "TBD") +
        (data.address ? row("Address", data.address) : "")
      )}
      <p>If you need to reschedule, please contact us as soon as possible.</p>
      <p style="color:${BRAND.muted};font-size:13px;">📞 Contact: info@countertopsaltarstone.com</p>
    `),
  };
}

// ─── 7. PAYMENT RECEIVED ───
export function paymentReceivedEmail(data: {
  customerName: string;
  amount: number;
  paymentType: string;
  remainingBalance: number;
  orderId: string;
  transactionRef?: string;
}) {
  return {
    subject: "Payment Received – Altar Stone",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Hi ${data.customerName},</h2>
      <p>We've received your payment. Thank you!</p>
      ${infoBox(
        row("Amount Paid", fmt(data.amount)) +
        row("Payment Type", data.paymentType) +
        row("Order ID", data.orderId.slice(0, 8).toUpperCase()) +
        (data.transactionRef ? row("Reference", data.transactionRef) : "") +
        `<tr style="border-top:1px solid #ddd;"><td style="padding:12px 0 6px;font-weight:700;">Remaining Balance</td><td style="padding:12px 0 6px;font-weight:700;font-size:16px;color:${BRAND.accent};">${fmt(data.remainingBalance)}</td></tr>`
      )}
      <p style="color:${BRAND.muted};font-size:13px;">This serves as your payment confirmation. A formal receipt is available in your dashboard.</p>
    `),
  };
}

// ─── 8. WELCOME / ACCOUNT CREATED ───
export function welcomeEmail(data: { customerName: string }) {
  return {
    subject: "Welcome to Altar Stone!",
    html: wrapper(`
      <h2 style="color:${BRAND.primary};margin-top:0;font-family:'Playfair Display',Georgia,serif;">Welcome, ${data.customerName}!</h2>
      <p>Thank you for creating your Altar Stone account. We're thrilled to have you.</p>
      <p>With your account, you can:</p>
      <ul style="color:${BRAND.text};font-size:14px;line-height:1.8;">
        <li>📐 Get instant countertop estimates</li>
        <li>📋 Track your orders in real time</li>
        <li>📅 Schedule measurement consultations</li>
        <li>📄 View estimates, invoices, and receipts</li>
      </ul>
      ${btn("Go to Your Dashboard")}
      <p style="color:${BRAND.muted};font-size:13px;">If you have any questions, we're here to help!</p>
    `),
  };
}
