import { useEffect, useState } from "react";
import { Section, SectionHeader } from "@/components/shared/Section";
import { SlabCard } from "@/components/shared/SlabCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Search } from "lucide-react";

const Slabs = () => {
  const [slabs, setSlabs] = useState<(Tables<"slabs"> & { materials: { name: string } | null })[]>([]);
  const [materials, setMaterials] = useState<Tables<"materials">[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialFilter, setMaterialFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("available");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("materials").select("*").eq("is_active", true).order("name").then(({ data }) => {
      setMaterials(data || []);
    });
  }, []);

  useEffect(() => {
    let query = supabase.from("slabs").select("*, materials(name)") as any;
    if (materialFilter !== "all") query = query.eq("material_id", materialFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);

    query.order("created_at", { ascending: false }).then(({ data }) => {
      setSlabs(data || []);
      setLoading(false);
    });
  }, [materialFilter, statusFilter]);

  const filtered = slabs.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.materials?.name?.toLowerCase().includes(term) ||
      s.lot_number?.toLowerCase().includes(term)
    );
  });

  return (
    <Section>
      <SectionHeader title="Slab Gallery" subtitle="Browse our current inventory of premium stone slabs" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by material or lot number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {materials.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No slabs match your criteria.</p>
      ) : (
        <div className="w-full overflow-x-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((slab) => (
          <SlabCard
              key={slab.id}
              id={slab.id}
              name={slab.name || slab.lot_number || "Unnamed Slab"}
              materialName={slab.materials?.name || "Unknown"}
              description={slab.description}
              lengthInches={slab.length_inches}
              widthInches={slab.width_inches}
              thickness={slab.thickness}
              status={slab.status}
              lotNumber={slab.lot_number}
              imageUrl={slab.image_urls?.[0]}
            />
          ))}
        </div>
      )}
    </Section>
  );
};

export default Slabs;
