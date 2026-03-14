import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Loader2, ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SlabServiceAssignments, type SlabServiceAssignment } from "./SlabServiceAssignments";

interface Slab {
  id: string;
  material_id: string;
  length_inches: number;
  width_inches: number;
  thickness: string;
  lot_number: string | null;
  status: "available" | "reserved" | "sold" | "archived";
  notes: string | null;
  image_urls: string[] | null;
  best_option_preset: string | null;
  usable_sqft_override: number | null;
  overage_pct_override: number | null;
  best_option_notes: string | null;
  materials?: { name: string; category: string };
}

interface Material {
  id: string;
  name: string;
  category: string;
}

interface SlabSizePreset {
  key: string;
  label: string;
  max_sqft: number;
}

const STATUSES = ["available", "reserved", "sold", "archived"] as const;
const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  available: "default",
  reserved: "secondary",
  sold: "outline",
  archived: "destructive",
};

type SlabStatus = "available" | "reserved" | "sold" | "archived";

const emptyForm = {
  name: "",
  description: "",
  material_id: "",
  length_inches: 0,
  width_inches: 0,
  thickness: "3cm",
  lot_number: "",
  status: "available" as SlabStatus,
  notes: "",
  purchase_value: 0,
  sales_value: 0,
  best_option_preset: "",
  usable_sqft_override: "",
  overage_pct_override: "",
  best_option_notes: "",
};

export const SlabsManager = () => {
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Slab | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [sizePresets, setSizePresets] = useState<SlabSizePreset[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<SlabServiceAssignment[]>([]);
  const load = useCallback(async () => {
    const [slabsRes, matsRes, presetsRes] = await Promise.all([
      supabase
        .from("slabs")
        .select("*, materials(name, category)")
        .order("created_at", { ascending: false }),
      supabase.from("materials").select("id, name, category").eq("is_active", true).order("name"),
      supabase.from("business_settings").select("key, value").like("key", "slab_%_max_sqft"),
    ]);
    if (slabsRes.data) setSlabs(slabsRes.data as unknown as Slab[]);
    if (matsRes.data) setMaterials(matsRes.data);

    // Build size presets dynamically from business_settings
    const presets: SlabSizePreset[] = [];
    for (const s of presetsRes.data || []) {
      const match = s.key.match(/^slab_(.+)_max_sqft$/);
      if (match) {
        const label = match[1].replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        presets.push({ key: match[1], label, max_sqft: parseFloat(s.value) || 0 });
      }
    }
    presets.sort((a, b) => a.max_sqft - b.max_sqft);
    presets.push({ key: "custom", label: "Custom", max_sqft: Infinity });
    setSizePresets(presets);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, material_id: materials[0]?.id ?? "" });
    setImageUrls([]);
    setServiceAssignments([]);
    setDialogOpen(true);
  };

  const openEdit = async (s: Slab) => {
    setEditing(s);
    setForm({
      material_id: s.material_id,
      length_inches: s.length_inches,
      width_inches: s.width_inches,
      thickness: s.thickness,
      lot_number: s.lot_number ?? "",
      status: s.status,
      notes: s.notes ?? "",
      purchase_value: (s as any).purchase_value ?? 0,
      sales_value: (s as any).sales_value ?? 0,
      best_option_preset: s.best_option_preset ?? "",
      usable_sqft_override: s.usable_sqft_override != null ? String(s.usable_sqft_override) : "",
      overage_pct_override: s.overage_pct_override != null ? String(s.overage_pct_override) : "",
      best_option_notes: s.best_option_notes ?? "",
    });
    setImageUrls(s.image_urls ?? []);

    // Load existing service assignments
    const { data } = await supabase
      .from("slab_services")
      .select("service_id, override_cost, override_multiplier, is_active")
      .eq("slab_id", s.id);
    setServiceAssignments(
      (data ?? []).map((r: any) => ({
        service_id: r.service_id,
        override_cost: r.override_cost != null ? String(r.override_cost) : "",
        override_multiplier: r.override_multiplier != null ? String(r.override_multiplier) : "",
        is_active: r.is_active,
      }))
    );
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("slab-images").upload(path, file);
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("slab-images").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }
    setImageUrls((prev) => [...prev, ...newUrls]);
    setUploading(false);
    toast.success(`${newUrls.length} image(s) uploaded`);
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!form.material_id) { toast.error("Select a material"); return; }
    if (form.length_inches <= 0 || form.width_inches <= 0) { toast.error("Dimensions required"); return; }

    setSaving(true);
    const payload = {
      material_id: form.material_id,
      length_inches: form.length_inches,
      width_inches: form.width_inches,
      thickness: form.thickness,
      lot_number: form.lot_number.trim() || null,
      status: form.status as "available" | "reserved" | "sold" | "archived",
      notes: form.notes.trim() || null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      purchase_value: form.purchase_value,
      sales_value: form.sales_value,
      best_option_preset: form.best_option_preset || null,
      usable_sqft_override: form.usable_sqft_override ? parseFloat(form.usable_sqft_override) : null,
      overage_pct_override: form.overage_pct_override ? parseFloat(form.overage_pct_override) : null,
      best_option_notes: form.best_option_notes.trim() || null,
    };

    let slabId: string;
    if (editing) {
      const { error } = await supabase.from("slabs").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      slabId = editing.id;
      toast.success("Slab updated");
    } else {
      const { data, error } = await supabase.from("slabs").insert(payload).select("id").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      slabId = data.id;
      toast.success("Slab created");
    }

    // Sync service assignments
    await supabase.from("slab_services").delete().eq("slab_id", slabId);
    const activeAssignments = serviceAssignments.filter((a) => a.is_active);
    if (activeAssignments.length > 0) {
      const rows = activeAssignments.map((a) => ({
        slab_id: slabId,
        service_id: a.service_id,
        override_cost: a.override_cost ? parseFloat(a.override_cost) : null,
        override_multiplier: a.override_multiplier ? parseFloat(a.override_multiplier) : null,
        is_active: true,
      }));
      const { error: svcErr } = await supabase.from("slab_services").insert(rows);
      if (svcErr) { toast.error(`Services: ${svcErr.message}`); }
    }

    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const filteredSlabs = slabs.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (materialFilter !== "all" && s.material_id !== materialFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <CardTitle className="text-lg">Slabs ({filteredSlabs.length})</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Materials</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5 h-8" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Slab
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Thickness</TableHead>
                <TableHead>Lot #</TableHead>
                <TableHead>Purchase</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSlabs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{s.materials?.name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground ml-1.5 capitalize">
                        {s.materials?.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.length_inches}″ × {s.width_inches}″
                    <span className="text-muted-foreground ml-1">
                      ({((s.length_inches * s.width_inches) / 144).toFixed(1)} sqft)
                    </span>
                  </TableCell>
                  <TableCell>{s.thickness}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.lot_number ?? "—"}</TableCell>
                  <TableCell className="text-sm">${(s as any).purchase_value?.toFixed(2) ?? "0.00"}</TableCell>
                  <TableCell className="text-sm">${(s as any).sales_value?.toFixed(2) ?? "0.00"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[s.status]} className="capitalize">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.image_urls?.length ?? 0}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSlabs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {slabs.length === 0
                      ? "No slabs yet. Add your first slab to get started."
                      : "No slabs match the current filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Slab" : "New Slab"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Material</Label>
              <Select value={form.material_id} onValueChange={(v) => setForm({ ...form, material_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Length (in)</Label>
                <Input type="number" value={form.length_inches || ""} onChange={(e) => setForm({ ...form, length_inches: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Width (in)</Label>
                <Input type="number" value={form.width_inches || ""} onChange={(e) => setForm({ ...form, width_inches: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Thickness</Label>
                <Select value={form.thickness} onValueChange={(v) => setForm({ ...form, thickness: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2cm">2cm</SelectItem>
                    <SelectItem value="3cm">3cm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Lot Number</Label>
                <Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Purchase Value ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.purchase_value || ""} onChange={(e) => setForm({ ...form, purchase_value: Number(e.target.value) })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Sales Value ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.sales_value || ""} onChange={(e) => setForm({ ...form, sales_value: Number(e.target.value) })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" rows={2} />
            </div>

            {/* Best Option for This Slab */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h4 className="text-sm font-semibold">Best Option for This Slab</h4>
              <div className="space-y-2">
                <Label>Size Preset</Label>
                <Select value={form.best_option_preset || "__none"} onValueChange={(v) => setForm({ ...form, best_option_preset: v === "__none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Use default logic" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Use default logic</SelectItem>
                    {sizePresets.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}{p.max_sqft !== Infinity ? ` (≤${p.max_sqft} sqft)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Usable Sqft Override</Label>
                  <Input type="number" min="0" step="0.1" value={form.usable_sqft_override} onChange={(e) => setForm({ ...form, usable_sqft_override: e.target.value })} placeholder="Auto from dimensions" />
                </div>
                <div className="space-y-2">
                  <Label>Overage % Override</Label>
                  <Input type="number" min="0" step="1" value={form.overage_pct_override} onChange={(e) => setForm({ ...form, overage_pct_override: e.target.value })} placeholder="Use default" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Best Option Notes</Label>
                <Textarea value={form.best_option_notes} onChange={(e) => setForm({ ...form, best_option_notes: e.target.value })} placeholder="e.g. Defect near corner, use rotated layout" rows={2} />
              </div>
            </div>

            {/* Assigned Services */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h4 className="text-sm font-semibold">Assigned Services for This Slab</h4>
              <p className="text-xs text-muted-foreground">
                Select which services apply. Override cost or quantity multiplier per slab if needed.
              </p>
              <SlabServiceAssignments
                assignments={serviceAssignments}
                onChange={setServiceAssignments}
              />
            </div>

            {/* Photo management */}
            <div className="space-y-2">
              <Label>Photos</Label>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group rounded-md overflow-hidden border border-border aspect-square">
                      <img src={url} alt={`Slab photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors text-sm text-muted-foreground">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Click to upload photos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
