import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Wrench, DollarSign } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "labor", label: "Labor" },
  { value: "edge_profile", label: "Edge Profile" },
  { value: "cutout", label: "Cutout" },
  { value: "fabrication", label: "Fabrication" },
  { value: "addon", label: "Add-on / Extra" },
] as const;

const PRICING_UNITS = [
  { value: "fixed", label: "Fixed Amount" },
  { value: "per_sqft", label: "Per Square Foot" },
  { value: "per_linear_ft", label: "Per Linear Foot" },
  { value: "per_cutout", label: "Per Cutout" },
  { value: "per_project", label: "Per Project" },
] as const;

type ServiceCategory = "labor" | "edge_profile" | "cutout" | "fabrication" | "addon";
type PricingUnit = "fixed" | "per_sqft" | "per_linear_ft" | "per_cutout" | "per_project";

interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  pricing_unit: PricingUnit;
  cost_value: number;
  min_value: number | null;
  max_value: number | null;
  is_active: boolean;
  notes: string | null;
}

interface ServiceForm {
  name: string;
  category: ServiceCategory;
  pricing_unit: PricingUnit;
  cost_value: string;
  min_value: string;
  max_value: string;
  is_active: boolean;
  notes: string;
}

const emptyForm: ServiceForm = {
  name: "",
  category: "labor",
  pricing_unit: "fixed",
  cost_value: "",
  min_value: "",
  max_value: "",
  is_active: true,
  notes: "",
};

const DEFAULTS_KEYS = [
  { key: "estimated_fabrication_avg", label: "Default Fabrication Average Cost", description: "Average fabrication cost used in estimates when no specific service items apply" },
  { key: "estimated_addon_avg", label: "Default Add-on Average Cost", description: "Average add-on cost used in estimates" },
  { key: "default_edge_profile", label: "Default Edge Profile Assumption", description: "Edge profile assumed if customer doesn't specify (optional)" },
  { key: "default_cutouts", label: "Default Cutouts Assumption", description: "Number of cutouts assumed if not specified (optional)" },
];

export function ServicesManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch service items
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["service-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_items")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data as ServiceItem[];
    },
  });

  // Fetch defaults from business_settings
  const { data: defaults = [] } = useQuery({
    queryKey: ["service-defaults"],
    queryFn: async () => {
      const keys = DEFAULTS_KEYS.map((d) => d.key);
      const { data, error } = await supabase
        .from("business_settings")
        .select("key, value")
        .in("key", keys);
      if (error) throw error;
      return data as { key: string; value: string }[];
    },
  });

  // Upsert service item
  const saveMutation = useMutation({
    mutationFn: async (item: ServiceForm & { id?: string }) => {
      const payload = {
        name: item.name,
        category: item.category,
        pricing_unit: item.pricing_unit,
        cost_value: parseFloat(item.cost_value) || 0,
        min_value: item.min_value ? parseFloat(item.min_value) : null,
        max_value: item.max_value ? parseFloat(item.max_value) : null,
        is_active: item.is_active,
        notes: item.notes || null,
      };
      if (item.id) {
        const { error } = await supabase.from("service_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-items"] });
      toast.success(editingId ? "Service updated" : "Service created");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update defaults
  const defaultsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: existing } = await supabase
        .from("business_settings")
        .select("id")
        .eq("key", key)
        .single();
      if (existing) {
        const { error } = await supabase.from("business_settings").update({ value }).eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_settings").insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-defaults"] });
      toast.success("Default updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (item: ServiceItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      pricing_unit: item.pricing_unit,
      cost_value: String(item.cost_value),
      min_value: item.min_value != null ? String(item.min_value) : "",
      max_value: item.max_value != null ? String(item.max_value) : "",
      is_active: item.is_active,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.cost_value) return toast.error("Cost value is required");
    saveMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  const filtered = filterCategory === "all" ? services : services.filter((s) => s.category === filterCategory);

  const getDefaultValue = (key: string) => defaults.find((d) => d.key === key)?.value ?? "";

  const categoryLabel = (cat: ServiceCategory) => CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  const unitLabel = (unit: PricingUnit) => PRICING_UNITS.find((u) => u.value === unit)?.label ?? unit;

  return (
    <div className="space-y-6">
      {/* Service Items Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filtered.length} items</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Add"} Service Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label>Service Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard Labor" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ServiceCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Pricing Unit</Label>
                  <Select value={form.pricing_unit} onValueChange={(v) => setForm({ ...form, pricing_unit: v as PricingUnit })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICING_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label>Cost Value ($)</Label>
                  <Input type="number" value={form.cost_value} onChange={(e) => setForm({ ...form, cost_value: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Min (optional)</Label>
                  <Input type="number" value={form.min_value} onChange={(e) => setForm({ ...form, min_value: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Max (optional)</Label>
                  <Input type="number" value={form.max_value} onChange={(e) => setForm({ ...form, max_value: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="grid gap-1.5">
                <Label>Internal Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save Service"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading services…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Pricing Unit</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No service items found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabel(item.category)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{unitLabel(item.pricing_unit)}</TableCell>
                  <TableCell className="text-right font-mono">${Number(item.cost_value).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {item.min_value != null || item.max_value != null
                      ? `${item.min_value ?? "—"} – ${item.max_value ?? "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Defaults & Assumptions */}
      <Separator />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Defaults & Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {DEFAULTS_KEYS.map((def) => (
              <div key={def.key} className="grid gap-1.5">
                <Label className="text-sm">{def.label}</Label>
                <p className="text-xs text-muted-foreground">{def.description}</p>
                <Input
                  type={def.key.includes("default_edge") || def.key.includes("default_cutouts") ? "text" : "number"}
                  defaultValue={getDefaultValue(def.key)}
                  onBlur={(e) => {
                    const newVal = e.target.value.trim();
                    if (newVal !== getDefaultValue(def.key)) {
                      defaultsMutation.mutate({ key: def.key, value: newVal });
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
