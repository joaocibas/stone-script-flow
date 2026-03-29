import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image, Eye, EyeOff, Share2, Upload, X, GripVertical } from "lucide-react";

const CATEGORIES = ["Kitchen", "Bathroom", "Outdoor Kitchen", "Custom"];
const MATERIALS = ["Quartz", "Marble", "Quartzite", "Granite", "Porcelain"];
const CITIES = ["Sarasota", "Bradenton", "Venice", "Englewood", "Port Charlotte", "Punta Gorda", "Cape Coral", "Fort Myers", "Naples", "Tampa", "North Port", "Osprey", "Nokomis", "Palmetto"];

type Project = {
  id: string;
  title: string;
  category: string;
  material: string;
  color_style: string | null;
  city: string;
  description: string | null;
  status: string;
  social_posted_fb: boolean | null;
  social_posted_ig: boolean | null;
  created_at: string;
  updated_at: string;
};

type ProjectImage = {
  id: string;
  project_id: string;
  image_url: string;
  alt_text: string | null;
  image_title: string | null;
  caption: string | null;
  is_before: boolean | null;
  display_order: number;
};

function generateSeoFields(material: string, category: string, city: string) {
  const m = material.toLowerCase();
  const c = category.toLowerCase().replace(/\s+/g, "-");
  return {
    alt_text: `${material} countertop installation ${city} Florida - Altar Stone`,
    image_title: `${material} ${category} ${city} FL`,
    file_prefix: `altar-stone-${m}-${c}-${city.toLowerCase().replace(/\s+/g, "-")}-fl`,
    caption: `${material} countertop installed in ${city}, Florida by Altar Stone`,
  };
}

function generateSchema(project: Project, images: ProjectImage[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: project.title,
    description: project.description || `${project.material} ${project.category} countertop installation in ${project.city}, Florida`,
    contentUrl: images[0]?.image_url || "",
    author: { "@type": "Organization", name: "Altar Stone Countertops" },
    locationCreated: { "@type": "Place", name: `${project.city}, Florida` },
    material: project.material,
  };
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project> | null>(null);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [socialFb, setSocialFb] = useState(true);
  const [socialIg, setSocialIg] = useState(true);
  const [socialText, setSocialText] = useState("");
  const [publishingProject, setPublishingProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects((data as any[]) || []);
    setLoading(false);
  };

  const fetchImages = async (projectId: string) => {
    const { data } = await supabase.from("project_images").select("*").eq("project_id", projectId).order("display_order");
    setImages((data as any[]) || []);
  };

  useEffect(() => { fetchProjects(); }, []);

  const openNew = () => {
    setCurrentProject({ title: "", category: "Kitchen", material: "Quartz", city: "Sarasota", status: "draft", description: "" });
    setImages([]);
    setEditOpen(true);
  };

  const openEdit = async (p: Project) => {
    setCurrentProject(p);
    await fetchImages(p.id);
    setEditOpen(true);
  };

  const saveProject = async () => {
    if (!currentProject?.title) { toast.error("Title is required"); return; }
    const payload = {
      title: currentProject.title,
      category: currentProject.category || "Kitchen",
      material: currentProject.material || "Quartz",
      color_style: currentProject.color_style || null,
      city: currentProject.city || "Sarasota",
      description: currentProject.description || null,
      status: currentProject.status || "draft",
      schema_data: generateSchema(currentProject as Project, images),
    };

    if (currentProject.id) {
      await supabase.from("projects").update(payload).eq("id", currentProject.id);
      toast.success("Project updated");
    } else {
      const { data } = await supabase.from("projects").insert(payload).select().single();
      if (data) setCurrentProject(data as any);
      toast.success("Project created");
    }
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project and all its images?")) return;
    await supabase.from("project_images").delete().eq("project_id", id);
    await supabase.from("projects").delete().eq("id", id);
    toast.success("Project deleted");
    fetchProjects();
  };

  const handleUpload = async (files: FileList) => {
    if (!currentProject?.id) { toast.error("Save the project first"); return; }
    setUploading(true);
    const seo = generateSeoFields(currentProject.material || "Quartz", currentProject.category || "Kitchen", currentProject.city || "Sarasota");

    for (let i = 0; i < Math.min(files.length, 10 - images.length); i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${seo.file_prefix}-${Date.now()}-${i}.${ext}`;
      const path = `${currentProject.id}/${fileName}`;

      const { error } = await supabase.storage.from("portfolio-images").upload(path, file);
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }

      const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(path);

      await supabase.from("project_images").insert({
        project_id: currentProject.id,
        image_url: urlData.publicUrl,
        alt_text: seo.alt_text,
        image_title: seo.image_title,
        caption: seo.caption,
        display_order: images.length + i,
      });
    }
    await fetchImages(currentProject.id);
    // Update schema
    const { data: updatedImages } = await supabase.from("project_images").select("*").eq("project_id", currentProject.id).order("display_order");
    await supabase.from("projects").update({ schema_data: generateSchema(currentProject as Project, (updatedImages as any[]) || []) }).eq("id", currentProject.id);
    setUploading(false);
    toast.success("Photos uploaded");
  };

  const deleteImage = async (img: ProjectImage) => {
    const urlParts = img.image_url.split("/portfolio-images/");
    if (urlParts[1]) {
      await supabase.storage.from("portfolio-images").remove([decodeURIComponent(urlParts[1])]);
    }
    await supabase.from("project_images").delete().eq("id", img.id);
    setImages(images.filter((i) => i.id !== img.id));
    toast.success("Image deleted");
  };

  const toggleBefore = async (img: ProjectImage) => {
    const newVal = !img.is_before;
    await supabase.from("project_images").update({ is_before: newVal }).eq("id", img.id);
    setImages(images.map((i) => (i.id === img.id ? { ...i, is_before: newVal } : i)));
  };

  const openSocialPublish = (project: Project) => {
    setPublishingProject(project);
    setSocialFb(true);
    setSocialIg(true);
    setSocialText(
      `✨ New Project Completed! ✨\n\n${project.material} ${project.category.toLowerCase()} countertop installation in ${project.city}, Florida.\n\n${project.description || "Premium countertop fabrication and installation by Altar Stone."}\n\n📍 ${project.city}, FL\n🔗 countertopsaltarstone.com\n\n#AltarStone #Countertops #${project.material} #${project.city.replace(/\s/g, "")} #SouthwestFlorida #KitchenDesign #HomeRemodel #FloridaHomes`
    );
    setSocialOpen(true);
  };

  const publishToSocial = async () => {
    if (!publishingProject) return;
    const projectImages = await supabase.from("project_images").select("image_url").eq("project_id", publishingProject.id).order("display_order").limit(4);
    const imageUrls = (projectImages.data as any[])?.map((i) => i.image_url) || [];

    try {
      const { data, error } = await supabase.functions.invoke("social-publish", {
        body: {
          project_id: publishingProject.id,
          text: socialText,
          image_urls: imageUrls,
          post_to_fb: socialFb,
          post_to_ig: socialIg,
        },
      });
      if (error) throw error;

      const updates: any = {};
      if (socialFb) updates.social_posted_fb = true;
      if (socialIg) updates.social_posted_ig = true;
      if (publishingProject.status === "draft") updates.status = "published";
      await supabase.from("projects").update(updates).eq("id", publishingProject.id);

      toast.success("Published to social media!");
      setSocialOpen(false);
      fetchProjects();
    } catch (err: any) {
      toast.error(`Social publish failed: ${err.message}`);
    }
  };

  const toggleStatus = async (project: Project) => {
    const newStatus = project.status === "published" ? "draft" : "published";
    if (newStatus === "published") {
      openSocialPublish(project);
      return;
    }
    await supabase.from("projects").update({ status: newStatus }).eq("id", project.id);
    toast.success(`Project ${newStatus}`);
    fetchProjects();
  };

  if (loading) return <div className="p-6"><p className="text-muted-foreground">Loading projects...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Projects / Portfolio</h1>
          <p className="text-sm text-muted-foreground">Manage completed project photos for your portfolio</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Project</Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first completed project</p>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Project</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="aspect-video bg-secondary relative">
                <ProjectThumbnail projectId={p.id} />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
                {(p.social_posted_fb || p.social_posted_ig) && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    {p.social_posted_fb && <Badge variant="outline" className="bg-background/80 text-xs">FB</Badge>}
                    {p.social_posted_ig && <Badge variant="outline" className="bg-background/80 text-xs">IG</Badge>}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.material} · {p.category} · {p.city}</p>
                {p.color_style && <p className="text-xs text-muted-foreground mt-1">{p.color_style}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>
                    {p.status === "published" ? <><EyeOff className="h-3 w-3 mr-1" /> Unpublish</> : <><Eye className="h-3 w-3 mr-1" /> Publish</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openSocialPublish(p)}><Share2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteProject(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentProject?.id ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={currentProject?.title || ""} onChange={(e) => setCurrentProject({ ...currentProject, title: e.target.value })} placeholder="e.g. Modern Kitchen Remodel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={currentProject?.category || "Kitchen"} onValueChange={(v) => setCurrentProject({ ...currentProject, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Material</Label>
                <Select value={currentProject?.material || "Quartz"} onValueChange={(v) => setCurrentProject({ ...currentProject, material: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Select value={currentProject?.city || "Sarasota"} onValueChange={(v) => setCurrentProject({ ...currentProject, city: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color / Style</Label>
                <Input value={currentProject?.color_style || ""} onChange={(e) => setCurrentProject({ ...currentProject, color_style: e.target.value })} placeholder="e.g. Calacatta Gold" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={currentProject?.description || ""} onChange={(e) => setCurrentProject({ ...currentProject, description: e.target.value })} placeholder="Describe the project..." rows={3} />
            </div>

            {/* SEO Preview */}
            {currentProject?.material && (
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Auto-Generated SEO</p>
                  <p className="text-xs"><strong>Alt:</strong> {generateSeoFields(currentProject.material, currentProject.category || "Kitchen", currentProject.city || "Sarasota").alt_text}</p>
                  <p className="text-xs"><strong>Title:</strong> {generateSeoFields(currentProject.material, currentProject.category || "Kitchen", currentProject.city || "Sarasota").image_title}</p>
                  <p className="text-xs"><strong>File:</strong> {generateSeoFields(currentProject.material, currentProject.category || "Kitchen", currentProject.city || "Sarasota").file_prefix}.jpg</p>
                </CardContent>
              </Card>
            )}

            {/* Photos */}
            {currentProject?.id && (
              <div>
                <Label>Photos ({images.length}/10)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border">
                      <img src={img.image_url} alt={img.alt_text || ""} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => toggleBefore(img)}>
                          {img.is_before ? "Before" : "After"}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7" onClick={() => deleteImage(img)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {img.is_before && (
                        <Badge className="absolute bottom-1 left-1 text-[10px]" variant="secondary">Before</Badge>
                      )}
                    </div>
                  ))}
                  {images.length < 10 && (
                    <label className="border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Add Photos"}</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} disabled={uploading} />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveProject}>{currentProject?.id ? "Save Changes" : "Create Project"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social Publish Dialog */}
      <Dialog open={socialOpen} onOpenChange={setSocialOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publish to Social Media</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><span className="text-blue-600 font-semibold">f</span> Post to Facebook</Label>
              <Switch checked={socialFb} onCheckedChange={setSocialFb} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><span className="font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">IG</span> Post to Instagram</Label>
              <Switch checked={socialIg} onCheckedChange={setSocialIg} />
            </div>
            <div>
              <Label>Post Text</Label>
              <Textarea value={socialText} onChange={(e) => setSocialText(e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSocialOpen(false)}>Cancel</Button>
            <Button onClick={publishToSocial} disabled={!socialFb && !socialIg}>
              <Share2 className="mr-2 h-4 w-4" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectThumbnail({ projectId }: { projectId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("project_images").select("image_url").eq("project_id", projectId).order("display_order").limit(1)
      .then(({ data }) => { if (data && data.length > 0) setUrl((data[0] as any).image_url); });
  }, [projectId]);
  if (!url) return <div className="w-full h-full flex items-center justify-center"><Image className="h-8 w-8 text-muted-foreground/30" /></div>;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}
