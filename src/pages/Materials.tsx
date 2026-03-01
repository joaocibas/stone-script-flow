import { useEffect, useState } from "react";
import { Section, SectionHeader } from "@/components/shared/Section";
import { MaterialCard } from "@/components/shared/MaterialCard";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const Materials = () => {
  const [materials, setMaterials] = useState<Tables<"materials">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("materials")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        setMaterials(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <Section>
      <SectionHeader
        title="Our Materials"
        subtitle="Browse our curated selection of premium countertop materials"
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <p className="text-center text-muted-foreground">No materials available yet. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((mat) => (
            <MaterialCard
              key={mat.id}
              id={mat.id}
              name={mat.name}
              category={mat.category}
              description={mat.description}
              imageUrl={mat.image_url}
            />
          ))}
        </div>
      )}
    </Section>
  );
};

export default Materials;
