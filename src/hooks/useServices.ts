import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const servicesQueryKey = ["services", "active"] as const;

export function useServices(enabled = true) {
  return useQuery({
    queryKey: servicesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_items")
        .select("id, category, pricing_unit, cost_value, name")
        .eq("is_active", true)
        .order("category")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
}