import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { resolveEdgeProfile } from "./estimateDisplay";

interface CustomerQuotePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any | null;
}

const roundMoney = (v: number) => Math.round(v * 100) / 100;

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
  const edgeProfile = resolveEdgeProfile(quote?.edge_profile);
  const referenceNumber = quote?.id ? `QTE-${quote.id.slice(0, 8).toUpperCase()}` : "—";

  // Fetch slabs for this material to derive pricing from slab services
  const { data: slabData } = useQuery({
    queryKey: ["quote-preview-slab", quote?.material_id],
    queryFn: async () => {
      // Get available slabs for this material
      const { data: slabs } = await supabase
        .from("slabs")
        .select("id, sales_value, length_inches, width_inches, usable_sqft_override, material_id")
        .eq("material_id", quote.material_id)
        .eq("status", "available")
        .limit(1);

      const slab = slabs?.[0];
      if (!slab) return null;

      // Get services assigned to this slab
      const [servicesRes, slabServicesRes] = await Promise.all([
        supabase.from("service_items").select("id, category, pricing_unit, cost_value, name").eq("is_active", true),
        supabase.from("slab_services").select("service_id, override_cost, override_multiplier, is_active").eq("slab_id", slab.id).eq("is_active", true),
      ]);

      return { slab, services: servicesRes.data || [], slabServices: slabServicesRes.data || [] };
    },
    enabled: open && !!quote?.material_id,
  });

  // Compute pricing from slab services or fall back to quote estimated_total
  const computePricing = () => {
    const sqft = Number(quote?.calculated_sqft) || 0;
    const numCutouts = Number(quote?.num_cutouts) || 0;
    const lengthIn = Number(quote?.length_inches) || 0;
    const widthIn = Number(quote?.width_inches) || 0;
    const perimeterLinFt = (lengthIn && widthIn) ? (2 * (lengthIn + widthIn)) / 12 : 0;
    const slabsNeeded = Number(quote?.slabs_needed) || 1;

    if (slabData && slabData.slabServices.length > 0) {
      const { slab, services, slabServices } = slabData;
      const assignedIds = slabServices.map((ss: any) => ss.service_id);
      const overrides = new Map<string, { cost: number | null; multiplier: number | null }>();
      for (const ss of slabServices) {
        overrides.set(ss.service_id, {
          cost: ss.override_cost != null ? Number(ss.override_cost) : null,
          multiplier: ss.override_multiplier != null ? Number(ss.override_multiplier) : null,
        });
      }

      let laborTotal = 0;
      const laborItems = services.filter((s: any) => s.category === "labor" && assignedIds.includes(s.id));
      for (const s of laborItems) {
        const ov = overrides.get(s.id);
        const costVal = ov?.cost != null ? ov.cost : s.cost_value;
        const mult = ov?.multiplier != null ? ov.multiplier : 1;
        if (s.pricing_unit === "per_sqft") {
          laborTotal += costVal * mult * sqft;
        } else {
          laborTotal += costVal * mult;
        }
      }

      const sumCat = (cat: string) => {
        const items = services.filter((s: any) => s.category === cat && assignedIds.includes(s.id));
        return items.reduce((total: number, s: any) => {
          const ov = overrides.get(s.id);
          const costVal = ov?.cost != null ? ov.cost : s.cost_value;
          const mult = ov?.multiplier != null ? ov.multiplier : 1;
          let unitCost: number;
          switch (s.pricing_unit) {
            case "per_sqft": unitCost = costVal * sqft; break;
            case "per_linear_ft": unitCost = costVal * perimeterLinFt; break;
            case "per_cutout": unitCost = costVal * numCutouts; break;
            default: unitCost = costVal; break;
          }
          return total + unitCost * mult;
        }, 0);
      };

      laborTotal += sumCat("edge_profile") + sumCat("cutout") + sumCat("fabrication");
      const addonTotal = sumCat("addon");
      const materialTotal = (Number(slab?.sales_value) || 0) * slabsNeeded;

      const subtotal = roundMoney(laborTotal + materialTotal + addonTotal);
      const taxAmount = roundMoney(subtotal * 0.07);
      const total = roundMoney(subtotal + taxAmount);
      const depositRequired = roundMoney(total * 0.5);

      return {
        labor: roundMoney(laborTotal),
        material: roundMoney(materialTotal),
        addons: roundMoney(addonTotal),
        subtotal,
        taxAmount,
        total,
        depositRequired,
        remainingBalance: roundMoney(total - depositRequired),
      };
    }

    // Fallback: derive from estimated_total
    const total = roundMoney(Number(quote?.estimated_total) || 0);
    const subtotal = total > 0 ? roundMoney(total / 1.07) : 0;
    const taxAmount = roundMoney(total - subtotal);
    const depositRequired = roundMoney(total * 0.5);

    return {
      labor: 0,
      material: 0,
      addons: 0,
      subtotal,
      taxAmount,
      total,
      depositRequired,
      remainingBalance: roundMoney(total - depositRequired),
    };
  };

  const pricing = computePricing();

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
                <DetailRow label="Category" value={material?.category || "—"} />
                <DetailRow label="Edge Profile" value={edgeProfile} />
                <DetailRow label="Measurements" value={quote.calculated_sqft ? `${Number(quote.calculated_sqft).toFixed(1)} sq ft` : "—"} />
                <DetailRow label="Slabs Needed" value={quote.slabs_needed ? String(quote.slabs_needed) : "—"} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pricing Details</h3>
                <DetailRow label="Labor Cost" value={formatCurrency(pricing.labor)} />
                <DetailRow label="Material Cost" value={formatCurrency(pricing.material)} />
                <DetailRow label="Add-ons" value={formatCurrency(pricing.addons)} />
                <DetailRow label="Subtotal" value={formatCurrency(pricing.subtotal)} />
                <DetailRow label="Tax (7%)" value={formatCurrency(pricing.taxAmount)} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Summary</h3>
                <DetailRow label="Total" value={formatCurrency(pricing.total)} />
                <DetailRow label="Deposit Required (50%)" value={formatCurrency(pricing.depositRequired)} />
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
