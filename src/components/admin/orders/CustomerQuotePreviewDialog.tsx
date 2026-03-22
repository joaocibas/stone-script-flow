import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { derivePricingSummary, resolveEdgeProfile } from "./estimateDisplay";

interface CustomerQuotePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any | null;
}

const formatCurrency = (value?: number | null) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return `$${amount.toFixed(2)}`;
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value || "—"}</span>
  </div>
);

export function CustomerQuotePreviewDialog({ open, onOpenChange, quote }: CustomerQuotePreviewDialogProps) {
  const customer = quote?.customers as any;
  const material = quote?.materials as any;
  const pricing = derivePricingSummary({ total: quote?.estimated_total, taxRate: 7 });
  const edgeProfile = resolveEdgeProfile(quote?.edge_profile);
  const referenceNumber = quote?.id ? `QTE-${quote.id.slice(0, 8).toUpperCase()}` : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Customer Quote Preview
            {quote?.status && <Badge variant="outline">{quote.status}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Review the saved quote details before converting it into an order.
          </DialogDescription>
        </DialogHeader>

        {quote && (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer</h3>
                <DetailRow label="Name" value={customer?.full_name || "Guest"} />
                <DetailRow label="Phone" value={customer?.phone || "—"} />
                <DetailRow label="Email" value={customer?.email || "—"} />
                <DetailRow label="Address" value={customer?.address || "—"} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quote</h3>
                <DetailRow label="Reference" value={referenceNumber} />
                <DetailRow label="Date" value={quote.created_at ? format(new Date(quote.created_at), "MMM d, yyyy") : "—"} />
                <DetailRow label="Material" value={material?.name || "—"} />
                <DetailRow label="Color" value={material?.category || "—"} />
                <DetailRow label="Finish" value="—" />
                <DetailRow label="Edge Profile" value={edgeProfile} />
                <DetailRow label="Measurements" value={quote.calculated_sqft ? `${Number(quote.calculated_sqft).toFixed(1)} sq ft` : "—"} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pricing Details</h3>
                <DetailRow label="Labor Cost" value="—" />
                <DetailRow label="Material Cost" value="—" />
                <DetailRow label="Add-ons" value="—" />
                <DetailRow label="Subtotal" value={formatCurrency(pricing.subtotal)} />
                <DetailRow label={`Tax (${pricing.taxRate}%)`} value={formatCurrency(pricing.taxAmount)} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Summary</h3>
                <DetailRow label="Total" value={formatCurrency(pricing.total)} />
                <DetailRow label="Deposit Required" value={formatCurrency(pricing.depositRequired)} />
                <DetailRow label="Remaining Balance" value={formatCurrency(pricing.remainingBalance)} />
                <DetailRow label="Status" value={quote.status || "—"} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
