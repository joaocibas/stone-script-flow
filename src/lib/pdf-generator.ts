/**
 * Generates a printable PDF document by opening a styled print window.
 * Uses the browser's native print-to-PDF functionality.
 */

type PdfSection = {
  label: string;
  value: string | number;
};

type PdfConfig = {
  title: string;
  documentNumber: string;
  date: string;
  sections: {
    heading?: string;
    rows: PdfSection[];
  }[];
  companyInfo?: string;
  notes?: string;
  footer?: string;
};

export function generatePdfDocument(config: PdfConfig) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const renderRows = (rows: PdfSection[]) =>
    rows
      .filter((r) => r.value !== "" && r.value !== 0 && r.value !== "0")
      .map(
        (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e2dc;color:#6b6560;font-size:13px;width:40%;">${r.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e2dc;font-size:13px;font-weight:500;">${
          typeof r.value === "number" ? `$${r.value.toFixed(2)}` : r.value
        }</td>
      </tr>`
      )
      .join("");

  const sectionsHtml = config.sections
    .map(
      (s) => `
    ${s.heading ? `<h3 style="font-family:'Playfair Display',Georgia,serif;font-size:14px;color:#2d2a26;margin:24px 0 8px;padding-bottom:6px;border-bottom:2px solid #c8973e;display:inline-block;">${s.heading}</h3>` : ""}
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      ${renderRows(s.rows)}
    </table>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${config.title} - ${config.documentNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #2d2a26; background: #fff; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { margin: 0.6in; size: letter; }
    }
  </style>
</head>
<body style="padding:40px;max-width:800px;margin:0 auto;">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #c8973e;">
    <div>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:#2d2a26;margin-bottom:4px;">
        ${config.companyInfo?.split("\n")[0] || "Altar Stones Countertops"}
      </h1>
      <p style="font-size:12px;color:#6b6560;">
        ${config.companyInfo?.split("\n").slice(1).join(" · ") || "Sarasota, FL"}
      </p>
    </div>
    <div style="text-align:right;">
      <p style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:600;color:#c8973e;text-transform:uppercase;letter-spacing:1px;">${config.title}</p>
      <p style="font-size:13px;color:#6b6560;margin-top:4px;">${config.documentNumber}</p>
      <p style="font-size:12px;color:#6b6560;">${config.date}</p>
    </div>
  </div>

  <!-- Content -->
  ${sectionsHtml}

  <!-- Notes -->
  ${config.notes ? `
  <div style="margin-top:24px;padding:16px;background:#f9f7f4;border-radius:6px;border-left:3px solid #c8973e;">
    <p style="font-size:11px;color:#6b6560;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;font-weight:600;">Notes</p>
    <p style="font-size:13px;color:#2d2a26;white-space:pre-wrap;">${config.notes}</p>
  </div>` : ""}

  <!-- Footer -->
  ${config.footer ? `
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e2dc;">
    <p style="font-size:11px;color:#6b6560;white-space:pre-wrap;">${config.footer}</p>
  </div>` : ""}

  <!-- Print button -->
  <div class="no-print" style="margin-top:32px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 28px;background:#2d2a26;color:#f5f0e8;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:500;">
      Download PDF / Print
    </button>
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
