import { useEffect, useState } from "react";
import { MaterialCard } from "@/components/shared/MaterialCard";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";

const Materials = () => {
  const [materials, setMaterials] = useState<Tables<"materials">[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

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

  const categories = ["all", ...Array.from(new Set(materials.map((m) => m.category)))];
  const filtered = activeCategory === "all" ? materials : materials.filter((m) => m.category === activeCategory);

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container relative py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <p className="text-accent font-medium tracking-widest uppercase text-sm mb-4">Premium Selection</p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Our Materials
            </h1>
            <p className="text-background/70 mt-4 text-lg max-w-lg">
              Explore our curated collection of the finest natural and engineered stone for your countertop project.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filter + Grid */}
      <section className="container py-12 md:py-20">
        {/* Category Filter */}
        {categories.length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent"
                }`}
              >
                {cat === "all" ? "All Materials" : cat}
              </button>
            ))}
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[4/3] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No materials available in this category.</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filtered.map((mat, i) => (
              <motion.div
                key={mat.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <MaterialCard
                  id={mat.id}
                  name={mat.name}
                  category={mat.category}
                  description={mat.description}
                  imageUrl={mat.image_url}
                  className="h-full"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default Materials;
