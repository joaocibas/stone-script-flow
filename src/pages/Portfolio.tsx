import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

const FILTER_CATEGORIES = ["All", "Kitchen", "Bathroom", "Outdoor Kitchen", "Custom"];
const FILTER_MATERIALS = ["All", "Quartz", "Marble", "Quartzite", "Granite", "Porcelain"];

type Project = {
  id: string;
  title: string;
  category: string;
  material: string;
  color_style: string | null;
  city: string;
  description: string | null;
  schema_data: any;
};

type ProjectImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  caption: string | null;
  is_before: boolean | null;
  display_order: number;
};

export default function Portfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [images, setImages] = useState<Record<string, ProjectImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("All");
  const [filterMat, setFilterMat] = useState("All");
  const [lightbox, setLightbox] = useState<{ projectId: string; index: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: pData } = await supabase.from("projects").select("*").eq("status", "published").order("created_at", { ascending: false });
      const ps = (pData as any[]) || [];
      setProjects(ps);

      if (ps.length > 0) {
        const { data: iData } = await supabase.from("project_images").select("*").in("project_id", ps.map((p) => p.id)).order("display_order");
        const grouped: Record<string, ProjectImage[]> = {};
        (iData as any[] || []).forEach((img) => {
          if (!grouped[img.project_id]) grouped[img.project_id] = [];
          grouped[img.project_id].push(img);
        });
        setImages(grouped);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = projects.filter((p) => {
    if (filterCat !== "All" && p.category !== filterCat) return false;
    if (filterMat !== "All" && p.material !== filterMat) return false;
    return true;
  });

  const lbImages = lightbox ? images[lightbox.projectId] || [] : [];
  const lbProject = lightbox ? projects.find((p) => p.id === lightbox.projectId) : null;

  return (
    <>
      {/* Schema JSON-LD */}
      {projects.map((p) => p.schema_data && (
        <script key={p.id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(p.schema_data) }} />
      ))}

      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container">
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">Our Portfolio</h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl">
            Browse our completed countertop installations across Southwest Florida. From Tampa to Fort Myers.
          </p>
        </div>
      </section>

      <Section>
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <div className="flex flex-wrap gap-1">
            {FILTER_CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={filterCat === c ? "default" : "outline"} onClick={() => setFilterCat(c)}>{c}</Button>
            ))}
          </div>
          <div className="w-px bg-border mx-2 hidden sm:block" />
          <div className="flex flex-wrap gap-1">
            {FILTER_MATERIALS.map((m) => (
              <Button key={m} size="sm" variant={filterMat === m ? "default" : "outline"} onClick={() => setFilterMat(m)}>{m}</Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No projects found for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project, i) => {
              const pImages = images[project.id] || [];
              const thumb = pImages[0];
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="group cursor-pointer"
                  onClick={() => pImages.length > 0 && setLightbox({ projectId: project.id, index: 0 })}
                >
                  <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb.image_url}
                          alt={thumb.alt_text || project.title}
                          title={thumb.caption || undefined}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                      )}
                      {pImages.length > 1 && (
                        <Badge className="absolute top-2 right-2 bg-background/80 text-foreground">{pImages.length} photos</Badge>
                      )}
                    </div>
                    <div className="p-4 bg-card">
                      <h3 className="font-display font-semibold text-lg">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{project.material}</span>
                        <span>·</span>
                        <span>{project.category}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{project.city}</span>
                      </div>
                      {project.color_style && <p className="text-xs text-accent mt-1">{project.color_style}</p>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {lightbox && lbImages.length > 0 && (
            <div className="relative">
              <img
                src={lbImages[lightbox.index].image_url}
                alt={lbImages[lightbox.index].alt_text || ""}
                className="w-full max-h-[80vh] object-contain"
              />
              {lbImages[lightbox.index].is_before && (
                <Badge className="absolute top-4 left-4" variant="secondary">Before</Badge>
              )}
              {lbImages.length > 1 && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: (lightbox.index - 1 + lbImages.length) % lbImages.length }); }}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                    onClick={(e) => { e.stopPropagation(); setLightbox({ ...lightbox, index: (lightbox.index + 1) % lbImages.length }); }}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-semibold">{lbProject?.title}</p>
                <p className="text-white/70 text-sm">{lbImages[lightbox.index].caption}</p>
                <p className="text-white/50 text-xs mt-1">{lightbox.index + 1} / {lbImages.length}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
