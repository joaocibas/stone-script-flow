import { useState, useEffect, useMemo } from "react";
import { sendEmail } from "@/lib/send-email";
import { quoteApprovedEmail } from "@/lib/email-templates";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Pencil, FileDown, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { generatePdfDocument } from "@/lib/pdf-generator";
import { DocumentHeader, InfoBlock, DocumentSection, SummaryBox, DisclaimerBlock } from "./DocumentLayout";
import { resolveEdgeProfile } from "./estimateDisplay";
import { computeSelectedServicePricing, getEstimateRemainingBalance, recalculateEstimate as recalculateEstimateTotals, roundMoney } from "./estimateCalculations";
import { useServices } from "@/hooks/useServices";

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
  additional_notes: string;
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

type CustomService = { name: string; price: number };

interface EstimateTabProps {
  orderId: string;
  order: any;
  customer: any;
}

type RateData = {
  laborRatePerSqft: number;
  laborFixed: number;
  addonTotal: number;
  slabUnitPrice: number;
  slabQuantity: number;
};

export function EstimateTab({ orderId, order, customer }: EstimateTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [rateData, setRateData] = useState<RateData | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [serviceIdsInitialized, setServiceIdsInitialized] = useState(false);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomPrice, setNewCustomPrice] = useState("");
  const pricingStateStorageKey = `estimate-pricing:${orderId}`;

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
    additional_notes: "",
    scope_of_work: "",
    measurements_sqft: 0,
    labor_cost: 0,
    material_cost: 0,
    addons_cost: 0,
    subtotal: 0,
    tax: 7,
    total: 0,
    deposit_required: 0,
    notes: "",
    terms_conditions: "",
  });

  const syncDepositToPercentage = (nextForm: EstimateForm) => ({
    ...nextForm,
    deposit_required: roundMoney(nextForm.total * 0.5),
  });

  // ── Single recalculation function ──
  const recalculateEstimate = (
    base: EstimateForm,
    updates: Partial<EstimateForm> = {},
    pricingOverride?: Partial<Pick<EstimateForm, "labor_cost" | "material_cost" | "addons_cost">>,
    customSvcs?: CustomService[],
  ) => recalculateEstimateTotals(base, {
    updates,
    pricingOverride,
    customServices: customSvcs ?? customServices,
  });

  // ── Data queries ──
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

  const { data: payments } = useQuery({
    queryKey: ["payments", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount")
        .eq("order_id", orderId);
      return data || [];
    },
  });

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
    enabled: !!order?.quote_id,
  });

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
    enabled: !!order?.slab_id,
  });

  const { data: allServices } = useServices();

  useEffect(() => {
    if (serviceIdsInitialized) return;
    // Wait until at least one service source is available
    if (allServices === undefined && !slabServiceData) return;

    let hasStoredState = false;
    let persistedServiceIds = new Set<string>();
    let persistedCustomServices: CustomService[] = [];

    try {
      const raw = localStorage.getItem(pricingStateStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        hasStoredState = true;
        persistedServiceIds = new Set(
          Array.isArray(parsed?.selectedServiceIds)
            ? parsed.selectedServiceIds.filter((id: unknown): id is string => typeof id === "string")
            : [],
        );
        persistedCustomServices = Array.isArray(parsed?.customServices)
          ? parsed.customServices
              .filter((item: any) => item && typeof item.name === "string")
              .map((item: any) => ({ name: item.name, price: Number(item.price) || 0 }))
          : [];
      }
    } catch {
      hasStoredState = false;
    }

    const defaultServiceIds = new Set((slabServiceData?.slabServices || []).map((ss: any) => ss.service_id));
    setSelectedServiceIds(hasStoredState ? persistedServiceIds : defaultServiceIds);
    setCustomServices(hasStoredState ? persistedCustomServices : []);
    setServiceIdsInitialized(true);
  }, [allServices, pricingStateStorageKey, serviceIdsInitialized, slabServiceData]);

  useEffect(() => {
    if (!serviceIdsInitialized) return;

    localStorage.setItem(
      pricingStateStorageKey,
      JSON.stringify({
        selectedServiceIds: [...selectedServiceIds],
        customServices,
      }),
    );
  }, [customServices, pricingStateStorageKey, selectedServiceIds, serviceIdsInitialized]);

  // Removed: premature serviceIdsInitialized=true was preventing actual initialization

  const availableServices = useMemo(() => {
    return allServices || slabServiceData?.services || [];
  }, [allServices, slabServiceData]);

  // ── Compute costs from selected services ──
  const computeServiceCosts = (sqftValue: number, serviceIds: Set<string>) => {
    const slab = slabServiceData?.slab;
    const calculated = computeSelectedServicePricing({
      selectedServiceIds: serviceIds,
      services: allServices || slabServiceData?.services || [],
      slabServices: slabServiceData?.slabServices || [],
      sqft: sqftValue || Number(quoteData?.calculated_sqft) || 0,
      numCutouts: Number(quoteData?.num_cutouts) || 0,
      lengthInches: Number(quoteData?.length_inches) || 0,
      widthInches: Number(quoteData?.width_inches) || 0,
      slabUnitPrice: slab?.sales_value != null ? Number(slab.sales_value) : null,
      slabQuantity: Number(quoteData?.slabs_needed) || 1,
    });

    if (!calculated) return null;

    return {
      labor: calculated.labor,
      addon: calculated.addon,
      materialCost: calculated.materialCost ?? null,
      slabMaterial: (slab?.materials as any)?.name || "",
      slabCategory: (slab?.materials as any)?.category || "",
      rates: calculated.rates as RateData,
    };
  };

  // ── Unified recalc from services + custom services ──
  const fullRecalc = ({
    serviceIds,
    customSvcs,
    updates,
  }: {
    serviceIds?: Set<string>;
    customSvcs?: CustomService[];
    updates?: Partial<EstimateForm>;
  } = {}) => {
    const ids = serviceIds ?? selectedServiceIds;
    const svcs = customSvcs ?? customServices;
    setForm((prev) => {
      const merged = { ...prev, ...(updates || {}) };
      const sqft = merged.measurements_sqft || 0;
      const svcCosts = computeServiceCosts(sqft, ids);
      const pricingOverride = svcCosts
        ? {
            labor_cost: svcCosts.labor,
            material_cost: svcCosts.materialCost ?? prev.material_cost,
            addons_cost: svcCosts.addon,
          }
        : ids.size === 0
          ? { labor_cost: 0, material_cost: prev.material_cost, addons_cost: 0 }
          : undefined;
      const result = recalculateEstimate(merged, {}, pricingOverride, svcs);
      return syncDepositToPercentage(result);
    });

    const currentSqft = form.measurements_sqft || (updates?.measurements_sqft) || 0;
    const svcCosts = computeServiceCosts(currentSqft, ids);
    if (svcCosts?.rates) setRateData(svcCosts.rates);
  };

  const toggleService = (serviceId: string) => {
    const next = new Set(selectedServiceIds);
    if (next.has(serviceId)) next.delete(serviceId);
    else next.add(serviceId);
    setSelectedServiceIds(next);
    fullRecalc({ serviceIds: next });
  };

  // ── Custom Services handlers ──
  const addCustomService = () => {
    const name = newCustomName.trim();
    const price = Number(newCustomPrice) || 0;
    if (!name) return;
    setCustomServices((prev) => {
      const updated = [...prev, { name, price }];
      fullRecalc({ customSvcs: updated });
      return updated;
    });
    setNewCustomName("");
    setNewCustomPrice("");
  };

  const removeCustomService = (index: number) => {
    setCustomServices((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      fullRecalc({ customSvcs: updated });
      return updated;
    });
  };

  // ── Hydrate form from saved data ──
  useEffect(() => {
    if (!serviceIdsInitialized) return;
    if (allServices === undefined && !slabServiceData) return;
    if (estimate) {
      const savedSqft = Number(estimate.measurements_sqft) || 0;

      let labor = Number(estimate.labor_cost) || 0;
      let material = Number(estimate.material_cost) || 0;
      let addons = Number(estimate.addons_cost) || 0;
      const svcCosts = computeServiceCosts(savedSqft, selectedServiceIds);
      if (svcCosts) {
        labor = svcCosts.labor;
        material = svcCosts.materialCost ?? material;
        addons = svcCosts.addon;
        if (svcCosts.rates) setRateData(svcCosts.rates);
      }

      const nextForm = syncDepositToPercentage(recalculateEstimate({
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
        edge_profile: resolveEdgeProfile(estimate.edge_profile, quoteData?.edge_profile),
        additional_notes: "",
        scope_of_work: estimate.scope_of_work || "",
        measurements_sqft: savedSqft,
        labor_cost: 0,
        material_cost: 0,
        addons_cost: 0,
        subtotal: 0,
        tax: Number(estimate.tax) || 7,
        total: 0,
        deposit_required: Number(estimate.deposit_required) || 0,
        notes: estimate.notes || "",
        terms_conditions: estimate.terms_conditions || DEFAULT_TERMS,
      }, {}, {
        labor_cost: labor,
        material_cost: material,
        addons_cost: addons,
      }));

      setForm(nextForm);
      setEditing(false);
    } else if (customerEstimate) {
      const ce = customerEstimate;
      const materialObj = quoteData?.materials as any;
      const currentSqft = Number(quoteData?.calculated_sqft) || Number(ce.measurements_sqft) || 0;
      const svcCosts = computeServiceCosts(currentSqft, selectedServiceIds);
      if (svcCosts?.rates) setRateData(svcCosts.rates);

      setForm((prev) => syncDepositToPercentage(recalculateEstimate({
        ...prev,
        estimate_number: `EST-${orderId.slice(0, 6).toUpperCase()}`,
        customer_name: ce.customer_name || customer?.full_name || "",
        phone: ce.phone || customer?.phone || "",
        email: ce.email || customer?.email || "",
        billing_address: ce.billing_address || customer?.address || "",
        project_address: ce.project_address || customer?.address || "",
        material: svcCosts?.slabMaterial || materialObj?.name || ce.material || "",
        color: svcCosts?.slabCategory || materialObj?.category || ce.color || "",
        finish: ce.finish || "",
        edge_profile: resolveEdgeProfile(quoteData?.edge_profile, ce.edge_profile),
        additional_notes: "",
        scope_of_work: ce.scope_of_work || "",
        measurements_sqft: currentSqft,
        labor_cost: svcCosts?.labor ?? (Number(ce.labor_cost) || 0),
        material_cost: svcCosts?.materialCost ?? (Number(ce.material_cost) || 0),
        addons_cost: svcCosts?.addon ?? (Number(ce.addons_cost) || 0),
        subtotal: 0,
        tax: 7,
        total: 0,
        deposit_required: Number(ce.deposit_required) || 0,
        notes: ce.notes || "",
        terms_conditions: ce.terms_conditions || DEFAULT_TERMS,
      })));
      setEditing(true);
    } else {
      const name = customer?.full_name || leadData?.full_name || "";
      const phone = customer?.phone || leadData?.phone || "";
      const email = customer?.email || leadData?.email || "";
      const address = customer?.address || "";
      const materialObj = quoteData?.materials as any;
      const edge_profile = resolveEdgeProfile(quoteData?.edge_profile);
      const measurements_sqft = Number(quoteData?.calculated_sqft) || 0;
      const svcCosts = computeServiceCosts(measurements_sqft, selectedServiceIds);
      if (svcCosts?.rates) setRateData(svcCosts.rates);

      setForm((prev) => syncDepositToPercentage(recalculateEstimate({
        ...prev,
        estimate_number: `EST-${orderId.slice(0, 6).toUpperCase()}`,
        customer_name: name,
        phone,
        email,
        billing_address: address,
        project_address: address,
        material: svcCosts?.slabMaterial || materialObj?.name || "",
        color: svcCosts?.slabCategory || materialObj?.category || "",
        edge_profile,
        additional_notes: "",
        measurements_sqft,
        labor_cost: svcCosts?.labor ?? 0,
        material_cost: svcCosts?.materialCost ?? 0,
        addons_cost: svcCosts?.addon ?? 0,
        subtotal: 0,
        tax: 7,
        total: 0,
        deposit_required: 0,
        terms_conditions: DEFAULT_TERMS,
      })));
      setEditing(true);
    }
  }, [allServices, customer, customerEstimate, estimate, leadData, order, orderId, quoteData, serviceIdsInitialized, slabServiceData]);

  const calcTaxAmount = (subtotal: number, taxPct: number) =>
    roundMoney(subtotal * (taxPct / 100));

  const updateField = (key: keyof EstimateForm, value: any) => {
    const costFields: (keyof EstimateForm)[] = ["labor_cost", "material_cost", "addons_cost", "tax"];
    if (key === "measurements_sqft") {
      const newSqft = Number(value) || 0;
      fullRecalc({ updates: { measurements_sqft: newSqft } });
    } else if (costFields.includes(key)) {
      setForm((prev) => syncDepositToPercentage(recalculateEstimate(prev, { [key]: Number(value) || 0 })));
    } else if (key === "deposit_required") {
      setForm((prev) => ({ ...prev, deposit_required: Number(value) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const computedForm = recalculateEstimate(form);
      const taxAmount = calcTaxAmount(computedForm.subtotal, computedForm.tax);
      const payload = {
        order_id: orderId,
        estimate_number: computedForm.estimate_number,
        date: computedForm.date || null,
        expiration_date: computedForm.expiration_date || null,
        customer_name: computedForm.customer_name,
        phone: computedForm.phone,
        email: computedForm.email,
        billing_address: computedForm.billing_address,
        project_address: computedForm.project_address,
        material: computedForm.material,
        color: computedForm.color,
        finish: computedForm.finish,
        edge_profile: computedForm.edge_profile,
        scope_of_work: computedForm.scope_of_work,
        measurements_sqft: computedForm.measurements_sqft || null,
        labor_cost: computedForm.labor_cost,
        material_cost: computedForm.material_cost,
        addons_cost: computedForm.addons_cost,
        subtotal: computedForm.subtotal,
        tax: computedForm.tax,
        total: computedForm.total,
        deposit_required: computedForm.deposit_required,
        notes: computedForm.notes,
        terms_conditions: computedForm.terms_conditions,
        status: "active",
      };
      const nextOrderTotal = computedForm.total;
      if (estimate) {
        const [{ error }, { error: orderError }] = await Promise.all([
          supabase.from("estimates").update(payload).eq("id", estimate.id),
          supabase.from("orders").update({ total_amount: nextOrderTotal }).eq("id", orderId),
        ]);
        if (error) throw error;
        if (orderError) throw orderError;
      } else {
        const [{ error }, { error: orderError }] = await Promise.all([
          supabase.from("estimates").insert(payload),
          supabase.from("orders").update({ total_amount: nextOrderTotal }).eq("id", orderId),
        ]);
        if (error) throw error;
        if (orderError) throw orderError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: estimate ? "Estimate updated" : "Estimate saved" });
      setEditing(false);

      // Send quote approved email to customer
      if (form.email) {
        try {
          const emailPayload = quoteApprovedEmail({
            customerName: form.customer_name || "Customer",
            material: form.material || "",
            sqft: form.measurements_sqft || 0,
            total: form.total || 0,
            depositRequired: form.deposit_required || 0,
          });
          sendEmail({ ...emailPayload, to: form.email });
        } catch {}
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const svc of availableServices) {
      const cat = svc.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(svc);
    }
    return grouped;
  }, [availableServices]);

  if (isLoading) return <p className="text-muted-foreground py-4">Loading...</p>;

  const taxAmount = calcTaxAmount(form.subtotal, form.tax);
  const totalPaid = (payments || []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const remainingBalance = getEstimateRemainingBalance(form.total, form.deposit_required, totalPaid);
  const dateDisplay = form.date ? format(new Date(form.date + "T12:00:00"), "MMMM d, yyyy") : "";
  const customServicesTotal = customServices.reduce((sum, cs) => sum + (Number(cs.price) || 0), 0);

  const categoryLabels: Record<string, string> = {
    labor: "Labor",
    edge_profile: "Edge Profile",
    cutout: "Cutout",
    fabrication: "Fabrication",
    addon: "Add-on",
  };

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
              { label: "Material Name", value: form.color },
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
              <div>
                <Label className="text-sm">Material Name</Label>
                <Input type="text" value={form.color} onChange={(e) => updateField("color", e.target.value)} disabled={!editing} className="mt-1" />
                {form.material && <p className="text-xs text-muted-foreground mt-1">Category: {form.material}</p>}
              </div>
              <Field label="Finish" value={form.finish} onChange={(v) => updateField("finish", v)} disabled={!editing} />
              <Field label="Edge Profile" value={form.edge_profile} onChange={(v) => updateField("edge_profile", v)} disabled={!editing} />
              <Field label="Measurements (Sq Ft)" type="number" value={String(roundMoney(form.measurements_sqft))} onChange={(v) => updateField("measurements_sqft", v)} disabled={!editing} />
              <div className="sm:col-span-2 md:col-span-3">
                <Label className="text-sm">Additional Notes</Label>
                <Textarea
                  value={form.additional_notes}
                  onChange={(e) => updateField("additional_notes", e.target.value)}
                  disabled={!editing}
                  rows={2}
                  className="mt-1"
                  placeholder="Any additional notes about materials or scope..."
                />
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>Material</TableHead>
                     <TableHead>Material Name</TableHead>
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
                     <TableCell className="text-right">{form.measurements_sqft ? roundMoney(form.measurements_sqft) : "—"}</TableCell>
                   </TableRow>
                </TableBody>
              </Table>
              {form.additional_notes && (
                <div className="mt-2">
                  <Label className="text-sm">Additional Notes</Label>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{form.additional_notes}</p>
                </div>
              )}
            </>
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

        {/* Pricing */}
        <DocumentSection title="Pricing">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Labor Cost" type="number" value={String(form.labor_cost)} onChange={(v) => updateField("labor_cost", v)} disabled={!editing} />
                    <Field label="Material Cost" type="number" value={String(form.material_cost)} onChange={(v) => updateField("material_cost", v)} disabled={!editing} />
                    <Field label="Tax (%)" type="number" value={String(form.tax)} onChange={(v) => updateField("tax", v)} disabled={!editing} />
                  </div>

                  {/* Select Services */}
                  {availableServices.length > 0 && (
                    <div className="border rounded-md p-3 space-y-3">
                      <Label className="text-sm font-semibold">Select Services</Label>
                      <p className="text-xs text-muted-foreground">
                        Toggle services to include in the estimate. Costs are auto-calculated from configured rates.
                      </p>
                      {Object.entries(servicesByCategory).map(([cat, svcs]) => (
                        <div key={cat} className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {categoryLabels[cat] || cat}
                          </p>
                          {svcs.map((svc: any) => (
                            <label key={svc.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                              <Checkbox
                                checked={selectedServiceIds.has(svc.id)}
                                onCheckedChange={() => toggleService(svc.id)}
                              />
                              <span>{svc.name}</span>
                              <span className="text-muted-foreground text-xs ml-auto">
                                ${Number(svc.cost_value).toFixed(2)} / {svc.pricing_unit?.replace(/_/g, " ")}
                              </span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Custom Services */}
                  <div className="border rounded-md p-3 space-y-3">
                    <Label className="text-sm font-semibold">Custom Services</Label>
                    <p className="text-xs text-muted-foreground">
                      Add additional services not in the system. These are added to Add-ons.
                    </p>
                    {customServices.length > 0 && (
                      <div className="space-y-1">
                        {customServices.map((cs, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="flex-1">{cs.name}</span>
                            <span className="text-muted-foreground">${Number(cs.price).toFixed(2)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomService(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <div className="text-xs text-muted-foreground pt-1 border-t">
                          Custom Total: ${customServicesTotal.toFixed(2)}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={newCustomName}
                          onChange={(e) => setNewCustomName(e.target.value)}
                          placeholder="Service name"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">Price ($)</Label>
                        <Input
                          type="number"
                          value={newCustomPrice}
                          onChange={(e) => setNewCustomPrice(e.target.value)}
                          placeholder="0.00"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <Button variant="outline" size="sm" className="h-8" onClick={addCustomService} disabled={!newCustomName.trim()}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </>
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

            {/* Summary */}
            <div className="md:col-span-2">
              <SummaryBox rows={[
                { label: "Subtotal", value: `$${form.subtotal.toFixed(2)}` },
                { label: `Tax (${form.tax}%)`, value: `$${taxAmount.toFixed(2)}` },
                { label: "Total", value: `$${form.total.toFixed(2)}`, bold: true },
                { label: "Deposit Required (50%)", value: editing ? "" : `$${form.deposit_required.toFixed(2)}` },
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
