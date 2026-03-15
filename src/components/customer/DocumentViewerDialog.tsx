import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";
import { generatePdfDocument } from "@/lib/pdf-generator";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type DocType = "estimate" | "receipt" | "quote";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DocType;
  estimate?: Tables<"estimates"> | null;
  receipt?: Tables<"receipts"> | null;
  quote?: Tables<"quotes"> | null;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d + (d.length === 10 ? "T12:00:00" : "")), "MMMM d, yyyy"); } catch { return d; }
}

function fmtCurrency(v: number | null | undefined) {
  return v != null ? `$${Number(v).toFixed(2)}` : "—";
}

export function DocumentViewerDialog({ open, onOpenChange, type, estimate, receipt, quote }: DocumentViewerDialogProps) {
  const handleExportEstimate = () => {
    if (!estimate) return;
    const taxPct = Number(estimate.tax) || 0;
    const subtotal = Number(estimate.subtotal) || 0;
    const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100;
    generatePdfDocument({
      title: "Estimate",
      documentNumber: estimate.estimate_number || "",
      date: fmtDate(estimate.date),
      sections: [
        { heading: "Customer Information", rows: [
          { label: "Customer Name", value: estimate.customer_name || "" },
          { label: "Phone", value: estimate.phone || "" },
          { label: "Email", value: estimate.email || "" },
          { label: "Billing Address", value: estimate.billing_address || "" },
          { label: "Project Address", value: estimate.project_address || "" },
        ]},
        { heading: "Materials & Scope", rows: [
          { label: "Material", value: estimate.material || "" },
          { label: "Color", value: estimate.color || "" },
          { label: "Finish", value: estimate.finish || "" },
          { label: "Edge Profile", value: estimate.edge_profile || "" },
          { label: "Measurements (Sq Ft)", value: estimate.measurements_sqft ? String(estimate.measurements_sqft) : "" },
          { label: "Scope of Work", value: estimate.scope_of_work || "" },
        ]},
        { heading: "Pricing", rows: [
          { label: "Labor Cost", value: Number(estimate.labor_cost) || 0 },
          { label: "Material Cost", value: Number(estimate.material_cost) || 0 },
          { label: "Add-ons", value: Number(estimate.addons_cost) || 0 },
          { label: "Subtotal", value: subtotal },
          { label: `Tax (${taxPct}%)`, value: taxAmount },
          { label: "Total", value: Number(estimate.total) || 0 },
          { label: "Deposit Required", value: Number(estimate.deposit_required) || 0 },
        ]},
      ],
      notes: estimate.notes || undefined,
      footer: estimate.terms_conditions ? `Terms & Conditions\n${estimate.terms_conditions}` : undefined,
    });
  };

  const handleExportReceipt = () => {
    if (!receipt) return;
    generatePdfDocument({
      title: "Receipt",
      documentNumber: receipt.receipt_number || "",
      date: fmtDate(receipt.date),
      companyInfo: receipt.company_info || "Altar Stones Countertops\nSarasota, FL",
      sections: [
        { heading: "Payment Details", rows: [
          { label: "Received From", value: receipt.received_from || "" },
          { label: "Amount Paid", value: Number(receipt.amount) || 0 },
          { label: "Payment Method", value: (receipt.payment_method || "").replace(/_/g, " ") },
          { label: "Reference Number", value: receipt.transaction_reference || "" },
        ]},
        { heading: "Details", rows: [
          { label: "Description", value: receipt.description || "" },
          { label: "Type", value: receipt.receipt_type || "" },
        ]},
      ],
      notes: receipt.notes || undefined,
    });
  };

  if (type === "estimate" && estimate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Estimate {estimate.estimate_number}</span>
              <Badge variant="secondary" className="capitalize">{estimate.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <Row label="Date" value={fmtDate(estimate.date)} />
            <Row label="Customer" value={estimate.customer_name} />
            <Row label="Email" value={estimate.email} />
            <Row label="Phone" value={estimate.phone} />
            <Row label="Project Address" value={estimate.project_address} />
            <hr className="border-border" />
            <Row label="Material" value={estimate.material} />
            <Row label="Color" value={estimate.color} />
            <Row label="Edge Profile" value={estimate.edge_profile} />
            <Row label="Sq Ft" value={estimate.measurements_sqft ? String(estimate.measurements_sqft) : null} />
            <hr className="border-border" />
            <Row label="Labor" value={fmtCurrency(Number(estimate.labor_cost))} />
            <Row label="Material Cost" value={fmtCurrency(Number(estimate.material_cost))} />
            <Row label="Add-ons" value={fmtCurrency(Number(estimate.addons_cost))} />
            <Row label="Total" value={fmtCurrency(Number(estimate.total))} bold />
            <Row label="Deposit Required" value={fmtCurrency(Number(estimate.deposit_required))} />
            {estimate.notes && <><hr className="border-border" /><p className="text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p></>}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={handleExportEstimate}>
              <FileDown className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === "receipt" && receipt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Invoice {receipt.receipt_number}</span>
              <Badge variant="secondary" className="capitalize">{receipt.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <Row label="Date" value={fmtDate(receipt.date)} />
            <Row label="Received From" value={receipt.received_from} />
            <Row label="Amount" value={fmtCurrency(Number(receipt.amount))} bold />
            <Row label="Payment Method" value={(receipt.payment_method || "").replace(/_/g, " ")} />
            <Row label="Reference" value={receipt.transaction_reference} />
            <Row label="Type" value={receipt.receipt_type} />
            {receipt.description && <Row label="Description" value={receipt.description} />}
            {receipt.notes && <><hr className="border-border" /><p className="text-muted-foreground whitespace-pre-wrap">{receipt.notes}</p></>}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={handleExportReceipt}>
              <FileDown className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === "quote" && quote) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>Quote</span>
              <Badge variant="secondary" className="capitalize">{quote.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <Row label="Date" value={fmtDate(quote.created_at)} />
            <Row label="Dimensions" value={`${quote.length_inches}" × ${quote.width_inches}"`} />
            <Row label="Sq Ft" value={quote.calculated_sqft ? String(quote.calculated_sqft) : null} />
            <Row label="Edge Profile" value={quote.edge_profile} />
            <Row label="Cutouts" value={String(quote.num_cutouts)} />
            {quote.estimated_total != null && <Row label="Estimated Total" value={fmtCurrency(Number(quote.estimated_total))} bold />}
            {quote.range_min != null && quote.range_max != null && (
              <Row label="Range" value={`${fmtCurrency(Number(quote.range_min))} – ${fmtCurrency(Number(quote.range_max))}`} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

function Row({ label, value, bold }: { label: string; value: string | null | undefined; bold?: boolean }) {
  if (!value || value === "—" || value === "$0.00") return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
