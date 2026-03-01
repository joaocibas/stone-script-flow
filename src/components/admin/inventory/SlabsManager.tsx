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
  materials?: { name: string; category: string };
}

interface Material {
  id: string;
  name: string;
  category: string;
}

const STATUSES = ["available", "reserved", "sold", "archived"] as const;
const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  available: "default",
  reserved: "secondary",
  sold: "outline",
  archived: "destructive",
};

type SlabStatus = "available" | "reserved" | "sold" | "archived";

const emptyForm: {
  material_id: string;
  length_inches: number;
  width_inches: number;
  thickness: string;
  lot_number: string;
  status: SlabStatus;
  notes: string;
} = {
  material_id: "",
  length_inches: 0,
  width_inches: 0,
  thickness: "3cm",
  lot_number: "",
  status: "available",
  notes: "",
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

  const load = useCallback(async () => {
    const [slabsRes, matsRes] = await Promise.all([
      supabase
        .from("slabs")
        .select("*, materials(name, category)")
        .order("created_at", { ascending: false }),
      supabase.from("materials").select("id, name, category").eq("is_active", true).order("name"),
    ]);
    if (slabsRes.data) setSlabs(slabsRes.data as unknown as Slab[]);
    if (matsRes.data) setMaterials(matsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, material_id: materials[0]?.id ?? "" });
    setImageUrls([]);
    setDialogOpen(true);
  };

  const openEdit = (s: Slab) => {
    setEditing(s);
    setForm({
      material_id: s.material_id,
      length_inches: s.length_inches,
      width_inches: s.width_inches,
      thickness: s.thickness,
      lot_number: s.lot_number ?? "",
      status: s.status,
      notes: s.notes ?? "",
    });
    setImageUrls(s.image_urls ?? []);
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
    };

    if (editing) {
      const { error } = await supabase.from("slabs").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Slab updated");
    } else {
      const { error } = await supabase.from("slabs").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Slab created");
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" rows={2} />
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
