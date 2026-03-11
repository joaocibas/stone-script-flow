import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Loader2, ImagePlus, X, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  gallery_image_urls: string[] | null;
  is_active: boolean;
  show_on_home: boolean;
  display_order: number;
}

const CATEGORIES = ["granite", "quartz", "marble", "quartzite", "porcelain", "soapstone", "other"];

const emptyForm = {
  name: "",
  category: "granite",
  description: "",
  image_url: "",
  is_active: true,
  show_on_home: false,
  display_order: 0,
};

export const MaterialsManager = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [mainImageUrl, setMainImageUrl] = useState<string>("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("materials")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) setMaterials(data as unknown as Material[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setMainImageUrl("");
    setGalleryUrls([]);
    setDialogOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({
      name: m.name,
      category: m.category,
      description: m.description ?? "",
      image_url: m.image_url ?? "",
      is_active: m.is_active,
      show_on_home: m.show_on_home,
      display_order: m.display_order,
    });
    setMainImageUrl(m.image_url ?? "");
    setGalleryUrls(m.gallery_image_urls ?? []);
    setDialogOpen(true);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `materials/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("slab-images").upload(path, file);
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    const { data: urlData } = supabase.storage.from("slab-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    const url = await uploadFile(file);
    if (url) setMainImageUrl(url);
    setUploadingMain(false);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }
    setGalleryUrls((prev) => [...prev, ...newUrls]);
    setUploadingGallery(false);
    if (newUrls.length > 0) toast.success(`${newUrls.length} image(s) uploaded`);
  };

  const removeGalleryImage = (idx: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      image_url: mainImageUrl.trim() || null,
      gallery_image_urls: galleryUrls.length > 0 ? galleryUrls : null,
      is_active: form.is_active,
      show_on_home: form.show_on_home,
      display_order: form.display_order,
    };

    if (editing) {
      const { error } = await supabase.from("materials").update(payload as any).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Material updated successfully.");
    } else {
      const { error } = await supabase.from("materials").insert(payload as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Material created successfully.");
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Materials ({materials.length})</CardTitle>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Material
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Home</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Gallery</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{m.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? "default" : "outline"}>
                      {m.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.show_on_home && <Badge variant="secondary">Home</Badge>}
                  </TableCell>
                  <TableCell>{m.display_order}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.gallery_image_urls?.length ?? 0}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {materials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No materials yet. Add your first material to get started.
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
            <DialogTitle>{editing ? "Edit Material" : "New Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bianco Carrara" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={3} />
            </div>

            {/* Main Image */}
            <div className="space-y-2">
              <Label>Main Image</Label>
              {mainImageUrl ? (
                <div className="relative group rounded-md overflow-hidden border border-border aspect-video w-full max-w-[200px]">
                  <img src={mainImageUrl} alt="Main" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setMainImageUrl("")}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors text-sm text-muted-foreground">
                  {uploadingMain ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploadingMain ? "Uploading..." : "Click to upload main image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleMainImageUpload}
                    disabled={uploadingMain}
                  />
                </label>
              )}
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <Label>Gallery Images</Label>
              {galleryUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {galleryUrls.map((url, idx) => (
                    <div key={idx} className="relative group rounded-md overflow-hidden border border-border aspect-square">
                      <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors text-sm text-muted-foreground">
                {uploadingGallery ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {uploadingGallery ? "Uploading..." : "Click to upload gallery images"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleGalleryUpload}
                  disabled={uploadingGallery}
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.show_on_home} onCheckedChange={(v) => setForm({ ...form, show_on_home: v })} />
                <Label>Show on Home</Label>
              </div>
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
