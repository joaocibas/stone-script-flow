import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, Ruler, Layers, Hash } from "lucide-react";

const SlabDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [slab, setSlab] = useState<(Tables<"slabs"> & { materials: { name: string; category: string } | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("slabs")
      .select("*, materials(name, category)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setSlab(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <Section><div className="h-96 bg-muted rounded-lg animate-pulse" /></Section>;
  if (!slab) return <Section><p className="text-center text-muted-foreground">Slab not found.</p></Section>;

  const images = slab.image_urls || [];

  return (
    <Section>
      <Link to="/slabs" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="h-3 w-3" /> Back to Gallery
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image gallery */}
        <div>
          <div className="aspect-square bg-secondary rounded-lg overflow-hidden mb-3">
            {images[selectedImage] ? (
              <img src={images[selectedImage]} alt="Slab" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No photos available</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 transition-colors ${
                    i === selectedImage ? "border-accent" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary">{slab.materials?.category}</Badge>
            <Badge className={slab.status === "available" ? "bg-sage text-white" : "bg-muted text-muted-foreground"}>
              {slab.status}
            </Badge>
          </div>

          <h1 className="font-display text-3xl font-bold mb-2">{slab.materials?.name}</h1>

          <div className="space-y-3 my-6">
            <div className="flex items-center gap-3 text-sm">
              <Ruler className="h-4 w-4 text-accent" />
              <span>{slab.length_inches}" × {slab.width_inches}" ({((slab.length_inches * slab.width_inches) / 144).toFixed(1)} sq ft)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Layers className="h-4 w-4 text-accent" />
              <span>Thickness: {slab.thickness}</span>
            </div>
            {slab.lot_number && (
              <div className="flex items-center gap-3 text-sm">
                <Hash className="h-4 w-4 text-accent" />
                <span>Lot #{slab.lot_number}</span>
              </div>
            )}
          </div>

          {slab.notes && (
            <p className="text-sm text-muted-foreground mb-6">{slab.notes}</p>
          )}

          {/* No pricing exposed — only CTA */}
          <div className="bg-secondary/50 rounded-lg p-5 mb-6">
            <p className="text-sm font-medium mb-1">Estimated Investment Range</p>
            <p className="font-display text-2xl font-semibold text-accent">Request Estimate</p>
            <p className="text-xs text-muted-foreground mt-1">Includes material, fabrication & installation</p>
          </div>

          {slab.status === "available" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 flex-1">
                Reserve This Slab
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/quote">Get Estimate</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

export default SlabDetail;
