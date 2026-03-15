import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Pencil, FileDown } from "lucide-react";
import { format } from "date-fns";
import { generatePdfDocument } from "@/lib/pdf-generator";
import { DocumentHeader, InfoBlock, DocumentSection, SummaryBox, DisclaimerBlock } from "./DocumentLayout";

const DEFAULT_TERMS = `Altar Stone Countertops does not connect or disconnect any plumbing, electrical systems, or appliances. It is the client's responsibility to hire licensed professionals to ensure that all conditions required for countertop installation are properly prepared before our team arrives.

Our team will perform only the tasks listed in the proposal or invoice. The client must arrange in advance for any necessary water, gas, or electrical connections or disconnections required for the installation.

If the service includes the removal of existing countertops, the client must ensure that all appliances, plumbing lines, sinks, cooktops, and electrical connections are properly disconnected prior to our team's arrival. If this condition is not met and our team is required to return to complete the installation, a return trip fee of $200 will be applied.

For payments made by credit card, a 3.5% processing fee will be added to the total amount.`;

type EstimateForm = {
  estimate_number: string;
  date: string;
  expiration_date: string;
  customer_name: string;
  phone: string;
  email: string;
  billing_address: string;
  project_address: string;
  material: string;
  color: string;
  finish: string;
  edge_profile: string;
  scope_of_work: string;
  measurements_sqft: number;
  labor_cost: number;
  material_cost: number;
  addons_cost: number;
  subtotal: number;
  tax: number;
  total: number;
  deposit_required: number;
  notes: string;
  terms_conditions: string;
};

interface EstimateTabProps {
  orderId: string;
  order: any;
  customer: any;
}

// Rate data extracted from slab services for reactive recalculation
type RateData = {
  laborRatePerSqft: number;   // sum of per_sqft labor service costs
  laborFixed: number;          // sum of fixed/non-sqft labor+edge+cutout+fabrication costs
  addonTotal: number;          // sum of addon service costs
  slabUnitPrice: number;       // single slab sales_value
  slabQuantity: number;        // slabs needed
};

export function EstimateTab({ orderId, order, customer }: EstimateTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [rateData, setRateData] = useState<RateData | null>(null);
  const [form, setForm] = useState<EstimateForm>({
    estimate_number: "",
    date: format(new Date(), "yyyy-MM-dd"),
    expiration_date: "",
    customer_name: "",
    phone: "",
    email: "",
    billing_address: "",
    project_address: "",
    material: "",
    color: "",
    finish: "",
    edge_profile: "",
    scope_of_work: "",
    measurements_sqft: 0,
    labor_cost: 0,
    material_cost: 0,
    addons_cost: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    deposit_required: 0,
    notes: "",
    terms_conditions: "",
  });

  const { data: estimate, isLoading } = useQuery({
    queryKey: ["estimate", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("estimates")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch quote + material for auto-population
  const { data: quoteData } = useQuery({
    queryKey: ["estimate-quote", order?.quote_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*, materials(name, category)")
        .eq("id", order.quote_id)
        .maybeSingle();
      return data;
    },
    enabled: !!order?.quote_id && !estimate,
  });

  // Fetch customer's most recent estimate from any order as fallback
  const { data: customerEstimate } = useQuery({
    queryKey: ["customer-latest-estimate", customer?.id, orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("estimates")
        .select("*")
        .neq("order_id", orderId)
        .in("order_id", 
          (await supabase.from("orders").select("id").eq("customer_id", customer.id)).data?.map((o: any) => o.id) || []
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.id && !estimate,
  });

  // Fetch lead for fallback auto-population
  const { data: leadData } = useQuery({
    queryKey: ["estimate-lead", order?.quote_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("quote_id", order.quote_id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!order?.quote_id && !estimate && !customer && !customerEstimate,
  });

  // Fetch slab + assigned services for auto-populating costs on new estimates
  const { data: slabServiceData } = useQuery({
    queryKey: ["estimate-slab-services", order?.slab_id],
    queryFn: async () => {
      const slabId = order.slab_id;
      const [slabRes, servicesRes, slabServicesRes] = await Promise.all([
        supabase.from("slabs").select("sales_value, length_inches, width_inches, usable_sqft_override, material_id, materials(name, category)").eq("id", slabId).single(),
        supabase.from("service_items").select("id, category, pricing_unit, cost_value, name").eq("is_active", true),
        supabase.from("slab_services").select("service_id, override_cost, override_multiplier, is_active").eq("slab_id", slabId).eq("is_active", true),
      ]);
      return {
        slab: slabRes.data,
        services: servicesRes.data || [],
        slabServices: slabServicesRes.data || [],
      };
    },
    enabled: !!order?.slab_id && !estimate,
  });

  // Helper: compute service costs from slab-assigned services
  // Returns both totals and rate data for reactive recalculation
  const computeSlabServiceCosts = (sqftOverride?: number) => {
    if (!slabServiceData || slabServiceData.slabServices.length === 0) return null;
    const { slab, services, slabServices } = slabServiceData;
    const assignedIds = slabServices.map((ss: any) => ss.service_id);
    const overrides = new Map<string, { cost: number | null; multiplier: number | null }>();
    for (const ss of slabServices) {
      overrides.set(ss.service_id, {
        cost: ss.override_cost != null ? Number(ss.override_cost) : null,
        multiplier: ss.override_multiplier != null ? Number(ss.override_multiplier) : null,
      });
    }

    const sqft = sqftOverride ?? (Number(quoteData?.calculated_sqft) || 0);
    const numCutouts = Number(quoteData?.num_cutouts) || 0;
    const lengthIn = Number(quoteData?.length_inches) || 0;
    const widthIn = Number(quoteData?.width_inches) || 0;
    const perimeterLinFt = (lengthIn && widthIn) ? (2 * (lengthIn + widthIn)) / 12 : 0;
    const slabsNeeded = Number(quoteData?.slabs_needed) || 1;

    // Separate per_sqft labor rate from fixed costs for reactive recalc
    let laborRatePerSqft = 0;
    let laborFixed = 0;

    const laborItems = services.filter((s: any) => s.category === "labor" && assignedIds.includes(s.id));
    for (const s of laborItems) {
      const ov = overrides.get(s.id);
      const costVal = ov?.cost != null ? ov.cost : s.cost_value;
      const mult = ov?.multiplier != null ? ov.multiplier : 1;
      if (s.pricing_unit === "per_sqft") {
        laborRatePerSqft += costVal * mult;
      } else {
        laborFixed += costVal * mult;
      }
    }

    // Sum non-labor service categories
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

    const edgeCost = sumCat("edge_profile");
    const cutoutCost = sumCat("cutout");
    const fabricationCost = sumCat("fabrication");
    const addonTotal = sumCat("addon");

    // Labor Total = laborRatePerSqft × sqft + laborFixed + edge + cutout + fabrication
    const laborTotal = (laborRatePerSqft * sqft) + laborFixed + edgeCost + cutoutCost + fabricationCost;
    // Material Total = slab price × quantity
    const slabUnitPrice = Number(slab?.sales_value) || 0;
    const materialTotal = slabUnitPrice * slabsNeeded;

    return {
      labor: laborTotal,
      addon: addonTotal,
      materialCost: materialTotal,
      slabMaterial: (slab?.materials as any)?.name || "",
      slabCategory: (slab?.materials as any)?.category || "",
      rates: {
        laborRatePerSqft,
        laborFixed: laborFixed + edgeCost + cutoutCost + fabricationCost,
        addonTotal,
        slabUnitPrice,
        slabQuantity: slabsNeeded,
      } as RateData,
    };
  };

  useEffect(() => {
    if (estimate) {
      // Load saved estimate — recalculate to ensure consistency
      const labor = Number(estimate.labor_cost) || 0;
      const material = Number(estimate.material_cost) || 0;
      const addons = Number(estimate.addons_cost) || 0;
      const taxPct = Number(estimate.tax) || 0;
      const subtotal = labor + material + addons;
      const taxAmt = Math.round(subtotal * (taxPct / 100) * 100) / 100;
      const total = subtotal + taxAmt;
      const deposit = Number(estimate.deposit_required) || 0;

      setForm({
        estimate_number: estimate.estimate_number || "",
        date: estimate.date || format(new Date(), "yyyy-MM-dd"),
        expiration_date: estimate.expiration_date || "",
        customer_name: estimate.customer_name || "",
        phone: estimate.phone || "",
        email: estimate.email || "",
        billing_address: estimate.billing_address || "",
        project_address: estimate.project_address || "",
        material: estimate.material || "",
        color: estimate.color || "",
        finish: estimate.finish || "",
        edge_profile: estimate.edge_profile || "",
        scope_of_work: estimate.scope_of_work || "",
        measurements_sqft: Number(estimate.measurements_sqft) || 0,
        labor_cost: labor,
        material_cost: material,
        addons_cost: addons,
        subtotal,
        tax: taxPct,
        total,
        deposit_required: deposit,
        notes: estimate.notes || "",
        terms_conditions: estimate.terms_conditions || DEFAULT_TERMS,
      });
      setEditing(false);
    } else if (customerEstimate) {
      // Fallback: use customer's most recent estimate — recalculate for consistency
      const ce = customerEstimate;
      const labor = Number(ce.labor_cost) || 0;
      const material = Number(ce.material_cost) || 0;
      const addons = Number(ce.addons_cost) || 0;
      const taxPct = Number(ce.tax) || 0;
      const subtotal = labor + material + addons;
      const taxAmt = Math.round(subtotal * (taxPct / 100) * 100) / 100;
      const total = subtotal + taxAmt;

      setForm((prev) => ({
        ...prev,
        estimate_number: `EST-${orderId.slice(0, 6).toUpperCase()}`,
        customer_name: ce.customer_name || customer?.full_name || "",
        phone: ce.phone || customer?.phone || "",
        email: ce.email || customer?.email || "",
        billing_address: ce.billing_address || customer?.address || "",
        project_address: ce.project_address || customer?.address || "",
        material: ce.material || "",
        color: ce.color || "",
        finish: ce.finish || "",
        edge_profile: ce.edge_profile || "",
        scope_of_work: ce.scope_of_work || "",
        measurements_sqft: Number(ce.measurements_sqft) || 0,
        labor_cost: labor,
        material_cost: material,
        addons_cost: addons,
        subtotal,
        tax: taxPct,
        total,
        deposit_required: Number(ce.deposit_required) || Math.round(total * 0.5 * 100) / 100,
        notes: ce.notes || "",
        terms_conditions: ce.terms_conditions || DEFAULT_TERMS,
      }));
      setEditing(true);
    } else {
      // New estimate — cascade: customer → lead for contact info
      const name = customer?.full_name || leadData?.full_name || "";
      const phone = customer?.phone || leadData?.phone || "";
      const email = customer?.email || leadData?.email || "";
      const address = customer?.address || "";

      // Quote/material data
      const materialObj = quoteData?.materials as any;
      const edge_profile = quoteData?.edge_profile || "";
      const measurements_sqft = Number(quoteData?.calculated_sqft) || 0;

      // Auto-populate from slab services if available
      const svcCosts = computeSlabServiceCosts();

      const labor_cost = svcCosts ? (svcCosts.labor + svcCosts.edge + svcCosts.cutout + svcCosts.fabrication) : 0;
      const material_cost = svcCosts ? svcCosts.slabCost : 0;
      const addons_cost = svcCosts ? svcCosts.addon : 0;
      const material = svcCosts?.slabMaterial || materialObj?.name || "";
      const color = svcCosts?.slabCategory || materialObj?.category || "";

      const subtotal = labor_cost + material_cost + addons_cost;
      const taxPct = 0;
      const total = subtotal; // tax 0% initially

      setForm((prev) => ({
        ...prev,
        estimate_number: `EST-${orderId.slice(0, 6).toUpperCase()}`,
        customer_name: name,
        phone,
        email,
        billing_address: address,
        project_address: address,
        material,
        color,
        edge_profile,
        measurements_sqft,
        labor_cost,
        material_cost,
        addons_cost,
        subtotal,
        tax: taxPct,
        total,
        deposit_required: Math.round(total * 0.5 * 100) / 100,
        terms_conditions: DEFAULT_TERMS,
      }));
      setEditing(true);
    }
  }, [estimate, customer, order, orderId, quoteData, leadData, customerEstimate, slabServiceData]);

  // Tax is stored as percentage; taxAmount is derived
  const calcTaxAmount = (subtotal: number, taxPct: number) =>
    Math.round(subtotal * (taxPct / 100) * 100) / 100;

  const recalculate = (updated: Partial<EstimateForm>) => {
    const merged = { ...form, ...updated };
    const subtotal = Number(merged.labor_cost) + Number(merged.material_cost) + Number(merged.addons_cost);
    const taxPct = Number(merged.tax);
    const taxAmount = calcTaxAmount(subtotal, taxPct);
    const total = subtotal + taxAmount;
    const deposit_required = ("labor_cost" in updated || "material_cost" in updated || "addons_cost" in updated || "tax" in updated)
      ? Math.round(total * 0.5 * 100) / 100
      : merged.deposit_required;
    return { ...merged, subtotal, total, deposit_required };
  };

  const updateField = (key: keyof EstimateForm, value: any) => {
    const costFields: (keyof EstimateForm)[] = ["labor_cost", "material_cost", "addons_cost", "tax"];
    if (costFields.includes(key)) {
      setForm(recalculate({ [key]: Number(value) || 0 }));
    } else if (key === "deposit_required") {
      setForm((prev) => ({ ...prev, deposit_required: Number(value) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const taxAmount = calcTaxAmount(form.subtotal, form.tax);
      const payload = {
        order_id: orderId,
        ...form,
        // Store the computed total (subtotal + taxAmount) not subtotal + taxPct
        total: form.subtotal + taxAmount,
        date: form.date || null,
        expiration_date: form.expiration_date || null,
        measurements_sqft: form.measurements_sqft || null,
        status: "active",
      };
      if (estimate) {
        const { error } = await supabase.from("estimates").update(payload).eq("id", estimate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("estimates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate", orderId] });
      toast({ title: estimate ? "Estimate updated" : "Estimate saved" });
      setEditing(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground py-4">Loading...</p>;

  const taxAmount = calcTaxAmount(form.subtotal, form.tax);
  const remainingBalance = Number((form.total - form.deposit_required).toFixed(2));
  const dateDisplay = form.date ? format(new Date(form.date + "T12:00:00"), "MMMM d, yyyy") : "";

  const actionButtons = (
    <>
      {estimate && (
        <Button variant="outline" size="sm" onClick={() => generatePdfDocument({
          title: "Estimate",
          documentNumber: form.estimate_number,
          date: dateDisplay,
          sections: [
            { heading: "Customer Information", rows: [
              { label: "Customer Name", value: form.customer_name },
              { label: "Phone", value: form.phone },
              { label: "Email", value: form.email },
              { label: "Billing Address", value: form.billing_address },
              { label: "Project Address", value: form.project_address },
            ]},
            { heading: "Materials & Scope", rows: [
              { label: "Material", value: form.material },
              { label: "Color", value: form.color },
              { label: "Finish", value: form.finish },
              { label: "Edge Profile", value: form.edge_profile },
              { label: "Measurements (Sq Ft)", value: form.measurements_sqft ? String(form.measurements_sqft) : "" },
              { label: "Scope of Work", value: form.scope_of_work },
            ]},
            { heading: "Pricing", rows: [
              { label: "Labor Cost", value: form.labor_cost },
              { label: "Material Cost", value: form.material_cost },
              { label: "Add-ons", value: form.addons_cost },
              { label: "Subtotal", value: form.subtotal },
              { label: `Tax (${form.tax}%)`, value: taxAmount },
              { label: "Total", value: form.total },
              { label: "Deposit Required (50%)", value: form.deposit_required },
              { label: "Remaining Balance", value: remainingBalance },
            ]},
          ],
          notes: form.notes,
          footer: form.terms_conditions ? `Terms & Conditions\n${form.terms_conditions}` : undefined,
        })}>
          <FileDown className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      )}
      {!editing && estimate && (
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      )}
      {editing && (
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save Estimate"}
        </Button>
      )}
    </>
  );

  return (
    <Card className="mt-4 overflow-hidden">
      <CardContent className="p-6 space-y-6">
        {/* Document Header */}
        <DocumentHeader
          documentTitle="Estimate"
          documentNumber={form.estimate_number}
          date={dateDisplay}
          status={estimate?.status}
          actions={actionButtons}
        />

        {/* Customer & Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {editing ? (
            <>
              <DocumentSection title="Customer Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Customer Name" value={form.customer_name} onChange={(v) => updateField("customer_name", v)} disabled={!editing} />
                  <Field label="Phone" value={form.phone} onChange={(v) => updateField("phone", v)} disabled={!editing} />
                  <Field label="Email" value={form.email} onChange={(v) => updateField("email", v)} disabled={!editing} />
                  <Field label="Date" type="date" value={form.date} onChange={(v) => updateField("date", v)} disabled={!editing} />
                  <Field label="Expiration Date" type="date" value={form.expiration_date} onChange={(v) => updateField("expiration_date", v)} disabled={!editing} />
                </div>
              </DocumentSection>
              <DocumentSection title="Project Details">
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Billing Address" value={form.billing_address} onChange={(v) => updateField("billing_address", v)} disabled={!editing} />
                  <Field label="Project Address" value={form.project_address} onChange={(v) => updateField("project_address", v)} disabled={!editing} />
                </div>
              </DocumentSection>
            </>
          ) : (
            <>
              <InfoBlock title="Bill To" items={[
                { label: "Name", value: form.customer_name },
                { label: "Phone", value: form.phone },
                { label: "Email", value: form.email },
                { label: "Billing Address", value: form.billing_address },
              ]} />
              <InfoBlock title="Project" items={[
                { label: "Project Address", value: form.project_address },
                { label: "Expiration", value: form.expiration_date ? format(new Date(form.expiration_date + "T12:00:00"), "MMMM d, yyyy") : "" },
              ]} />
            </>
          )}
        </div>

        {/* Materials & Scope */}
        <DocumentSection title="Materials & Scope">
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Material" value={form.material} onChange={(v) => updateField("material", v)} disabled={!editing} />
              <Field label="Color" value={form.color} onChange={(v) => updateField("color", v)} disabled={!editing} />
              <Field label="Finish" value={form.finish} onChange={(v) => updateField("finish", v)} disabled={!editing} />
              <Field label="Edge Profile" value={form.edge_profile} onChange={(v) => updateField("edge_profile", v)} disabled={!editing} />
              <Field label="Measurements (Sq Ft)" type="number" value={String(form.measurements_sqft)} onChange={(v) => updateField("measurements_sqft", v)} disabled={!editing} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Finish</TableHead>
                  <TableHead>Edge Profile</TableHead>
                  <TableHead className="text-right">Sq Ft</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{form.material || "—"}</TableCell>
                  <TableCell>{form.color || "—"}</TableCell>
                  <TableCell>{form.finish || "—"}</TableCell>
                  <TableCell>{form.edge_profile || "—"}</TableCell>
                  <TableCell className="text-right">{form.measurements_sqft || "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
          <div className="mt-2">
            <Label className="text-sm">Scope of Work</Label>
            {editing ? (
              <Textarea value={form.scope_of_work} onChange={(e) => updateField("scope_of_work", e.target.value)} disabled={!editing} rows={3} className="mt-1" />
            ) : (
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{form.scope_of_work || "—"}</p>
            )}
          </div>
        </DocumentSection>

        {/* Pricing Table + Summary */}
        <DocumentSection title="Pricing">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Itemized pricing table */}
            <div className="md:col-span-3">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Labor Cost" type="number" value={String(form.labor_cost)} onChange={(v) => updateField("labor_cost", v)} disabled={!editing} />
                  <Field label="Material Cost" type="number" value={String(form.material_cost)} onChange={(v) => updateField("material_cost", v)} disabled={!editing} />
                  <Field label="Add-ons" type="number" value={String(form.addons_cost)} onChange={(v) => updateField("addons_cost", v)} disabled={!editing} />
                  <Field label="Tax (%)" type="number" value={String(form.tax)} onChange={(v) => updateField("tax", v)} disabled={!editing} />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { label: "Labor", value: form.labor_cost },
                      { label: "Material", value: form.material_cost },
                      { label: "Add-ons", value: form.addons_cost },
                    ].filter(r => r.value > 0).map((r) => (
                      <TableRow key={r.label}>
                        <TableCell>{r.label}</TableCell>
                        <TableCell className="text-right">${r.value.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Summary box */}
            <div className="md:col-span-2">
              <SummaryBox rows={[
                { label: "Subtotal", value: `$${form.subtotal.toFixed(2)}` },
                { label: `Tax (${form.tax}%)`, value: `$${taxAmount.toFixed(2)}` },
                { label: "Total", value: `$${form.total.toFixed(2)}`, bold: true },
                { label: "Deposit Required (50%)", value: editing
                  ? ""
                  : `$${form.deposit_required.toFixed(2)}` },
                { label: "Remaining Balance", value: `$${remainingBalance.toFixed(2)}`, accent: true },
              ].filter(r => r.value !== "")} />

              {editing && (
                <div className="mt-3 space-y-2">
                  <Field label="Deposit Required (50%)" type="number" value={String(form.deposit_required)} onChange={(v) => updateField("deposit_required", v)} disabled={!editing} />
                </div>
              )}
            </div>
          </div>
        </DocumentSection>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 gap-4">
          <DocumentSection title="Notes">
            {editing ? (
              <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} disabled={!editing} rows={2} className="mt-1" />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">{form.notes || "—"}</p>
            )}
          </DocumentSection>

          {(editing || form.terms_conditions) && (
            editing ? (
              <DocumentSection title="Terms & Conditions">
                <Textarea value={form.terms_conditions} onChange={(e) => updateField("terms_conditions", e.target.value)} disabled={!editing} rows={3} className="mt-1" />
              </DocumentSection>
            ) : (
              <DisclaimerBlock text={form.terms_conditions} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, disabled, type = "text" }: {
  label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; type?: string;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="mt-1"
      />
    </div>
  );
}
