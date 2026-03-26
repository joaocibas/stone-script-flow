import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type UseSlabsOptions = {
  materialId?: string | null;
  includeMaterials?: boolean;
  statuses?: string[];
  enabled?: boolean;
};

export const slabsQueryKey = (options: UseSlabsOptions = {}) => [
  "slabs",
  options.materialId ?? "all",
  options.includeMaterials ? "with-materials" : "base",
  ...(options.statuses || ["all"]),
];

export function useSlabs({ materialId, includeMaterials = false, statuses, enabled = true }: UseSlabsOptions = {}) {
  return useQuery({
    queryKey: slabsQueryKey({ materialId, includeMaterials, statuses }),
    queryFn: async () => {
      const select = includeMaterials ? "*, materials(name, category)" : "*";
      let query = supabase.from("slabs").select(select).order("created_at", { ascending: false });
      if (materialId) query = query.eq("material_id", materialId);
      if (statuses?.length) query = query.in("status", statuses as any);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
}