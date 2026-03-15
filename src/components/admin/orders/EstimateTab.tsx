import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Pencil, FileDown } from "lucide-react";
import { format } from "date-fns";
import { generatePdfDocument } from "@/lib/pdf-generator";

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

export function EstimateTab({ orderId, order, customer }: EstimateTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
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

  useEffect(() => {
    if (estimate) {
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
        labor_cost: Number(estimate.labor_cost) || 0,
        material_cost: Number(estimate.material_cost) || 0,
        addons_cost: Number(estimate.addons_cost) || 0,
        subtotal: Number(estimate.subtotal) || 0,
        tax: Number(estimate.tax) || 0,
        total: Number(estimate.total) || 0,
        deposit_required: Number(estimate.deposit_required) || 0,
        notes: estimate.notes || "",
        terms_conditions: estimate.terms_conditions || "",
      });
      setEditing(false);
    } else {
      // Pre-fill from customer/order data
      const total = Number(order?.total_amount) || 0;
      setForm((prev) => ({
        ...prev,
        estimate_number: `EST-${orderId.slice(0, 6).toUpperCase()}`,
        customer_name: customer?.full_name || "",
        phone: customer?.phone || "",
        email: customer?.email || "",
        billing_address: customer?.address || "",
        project_address: customer?.address || "",
        total,
        deposit_required: Math.round(total * 0.5 * 100) / 100,
      }));
      setEditing(true);
    }
  }, [estimate, customer, order, orderId]);

  const recalculate = (updated: Partial<EstimateForm>) => {
    const merged = { ...form, ...updated };
    const subtotal = Number(merged.labor_cost) + Number(merged.material_cost) + Number(merged.addons_cost);
    const tax = Number(merged.tax);
    const total = subtotal + tax;
    const deposit_required = Math.round(total * 0.5 * 100) / 100;
    return { ...merged, subtotal, total, deposit_required };
  };

  const updateField = (key: keyof EstimateForm, value: any) => {
    const costFields: (keyof EstimateForm)[] = ["labor_cost", "material_cost", "addons_cost", "tax"];
    if (costFields.includes(key)) {
      setForm(recalculate({ [key]: Number(value) || 0 }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        order_id: orderId,
        ...form,
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

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Estimate {estimate && <Badge variant="secondary" className="ml-2">{estimate.status}</Badge>}
        </CardTitle>
        <div className="flex gap-2">
          {estimate && (
            <Button variant="outline" size="sm" onClick={() => generatePdfDocument({
              title: "Estimate",
              documentNumber: form.estimate_number,
              date: form.date ? format(new Date(form.date + "T12:00:00"), "MMMM d, yyyy") : "",
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
                  { label: "Tax", value: form.tax },
                  { label: "Total", value: form.total },
                  { label: "Deposit Required (50%)", value: form.deposit_required },
                  { label: "Remaining Balance", value: Number((form.total - form.deposit_required).toFixed(2)) },
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Estimate Number" value={form.estimate_number} onChange={(v) => updateField("estimate_number", v)} disabled={!editing} />
          <Field label="Date" type="date" value={form.date} onChange={(v) => updateField("date", v)} disabled={!editing} />
          <Field label="Expiration Date" type="date" value={form.expiration_date} onChange={(v) => updateField("expiration_date", v)} disabled={!editing} />
          <Field label="Customer Name" value={form.customer_name} onChange={(v) => updateField("customer_name", v)} disabled={!editing} />
          <Field label="Phone" value={form.phone} onChange={(v) => updateField("phone", v)} disabled={!editing} />
          <Field label="Email" value={form.email} onChange={(v) => updateField("email", v)} disabled={!editing} />
          <Field label="Billing Address" value={form.billing_address} onChange={(v) => updateField("billing_address", v)} disabled={!editing} />
          <Field label="Project Address" value={form.project_address} onChange={(v) => updateField("project_address", v)} disabled={!editing} />
        </div>

        <h3 className="text-sm font-semibold mt-6 mb-3 text-muted-foreground uppercase tracking-wide">Materials & Scope</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Material" value={form.material} onChange={(v) => updateField("material", v)} disabled={!editing} />
          <Field label="Color" value={form.color} onChange={(v) => updateField("color", v)} disabled={!editing} />
          <Field label="Finish" value={form.finish} onChange={(v) => updateField("finish", v)} disabled={!editing} />
          <Field label="Edge Profile" value={form.edge_profile} onChange={(v) => updateField("edge_profile", v)} disabled={!editing} />
          <Field label="Measurements (Sq Ft)" type="number" value={String(form.measurements_sqft)} onChange={(v) => updateField("measurements_sqft", v)} disabled={!editing} />
        </div>

        <div className="mt-4">
          <Label className="text-sm">Scope of Work</Label>
          <Textarea value={form.scope_of_work} onChange={(e) => updateField("scope_of_work", e.target.value)} disabled={!editing} rows={3} className="mt-1" />
        </div>

        <h3 className="text-sm font-semibold mt-6 mb-3 text-muted-foreground uppercase tracking-wide">Pricing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Labor Cost" type="number" value={String(form.labor_cost)} onChange={(v) => updateField("labor_cost", v)} disabled={!editing} />
          <Field label="Material Cost" type="number" value={String(form.material_cost)} onChange={(v) => updateField("material_cost", v)} disabled={!editing} />
          <Field label="Add-ons" type="number" value={String(form.addons_cost)} onChange={(v) => updateField("addons_cost", v)} disabled={!editing} />
          <Field label="Subtotal" type="number" value={String(form.subtotal)} disabled />
          <Field label="Tax" type="number" value={String(form.tax)} onChange={(v) => updateField("tax", v)} disabled={!editing} />
          <Field label="Total" type="number" value={String(form.total)} disabled />
          <Field label="Deposit Required (50%)" type="number" value={String(form.deposit_required)} disabled />
          <Field label="Remaining Balance" type="number" value={String((form.total - form.deposit_required).toFixed(2))} disabled />
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <Label className="text-sm">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} disabled={!editing} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Terms & Conditions</Label>
            <Textarea value={form.terms_conditions} onChange={(e) => updateField("terms_conditions", e.target.value)} disabled={!editing} rows={3} className="mt-1" />
          </div>
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
