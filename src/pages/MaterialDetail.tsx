import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

const MaterialDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [material, setMaterial] = useState<Tables<"materials"> | null>(null);
  const [slabs, setSlabs] = useState<Tables<"slabs">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("materials").select("*").eq("id", id).single(),
      supabase.from("slabs").select("*").eq("material_id", id).eq("status", "available").limit(6),
    ]).then(([matRes, slabRes]) => {
      setMaterial(matRes.data);
      setSlabs(slabRes.data || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <Section>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </Section>
    );
  }

  if (!material) {
    return (
      <Section>
        <p className="text-center text-muted-foreground">Material not found.</p>
      </Section>
    );
  }

  return (
    <Section>
      <Link to="/materials" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
        <ArrowLeft className="h-3 w-3" /> Back to Materials
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
          {material.image_url ? (
            <img src={material.image_url} alt={material.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground font-display text-3xl">{material.name}</span>
            </div>
          )}
        </div>

        <div>
          <Badge variant="secondary" className="mb-3">{material.category}</Badge>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">{material.name}</h1>
          {material.description && (
            <p className="text-muted-foreground mb-6">{material.description}</p>
          )}

          <div className="bg-secondary/50 rounded-lg p-5 mb-6">
            <p className="text-sm font-medium mb-1">Estimated Investment Range</p>
            <p className="font-display text-2xl font-semibold text-accent">Contact for Estimate</p>
            <p className="text-xs text-muted-foreground mt-1">Final pricing confirmed after in-home measurement</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/quote">Get Estimate <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/book">Schedule Consultation</Link>
            </Button>
          </div>
        </div>
      </div>

      {slabs.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-2xl font-semibold mb-6">Available Slabs</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {slabs.map((slab) => (
              <Link key={slab.id} to={`/slabs/${slab.id}`} className="aspect-square bg-secondary rounded-lg overflow-hidden group">
                {slab.image_urls?.[0] ? (
                  <img src={slab.image_urls[0]} alt="Slab" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    {slab.length_inches}" × {slab.width_inches}"
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
};

export default MaterialDetail;
