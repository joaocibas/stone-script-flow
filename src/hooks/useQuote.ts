import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type UseQuotesOptions = {
  customerId?: string | null;
  includeRelations?: boolean;
  enabled?: boolean;
};

type UseQuoteOptions = {
  id?: string | null;
  includeRelations?: boolean;
  enabled?: boolean;
};

export const quotesQueryKey = (options: UseQuotesOptions = {}) => [
  "quotes",
  options.customerId ?? "all",
  options.includeRelations ? "with-relations" : "base",
];

export const quoteQueryKey = (options: UseQuoteOptions = {}) => [
  "quotes",
  "detail",
  options.id ?? "unknown",
  options.includeRelations ? "with-relations" : "base",
];

export function useQuotes({ customerId, includeRelations = false, enabled = true }: UseQuotesOptions = {}) {
  return useQuery({
    queryKey: quotesQueryKey({ customerId, includeRelations }),
    queryFn: async () => {
      let query = includeRelations
        ? (supabase.from("quotes").select("*, customers(full_name, email, phone, address), materials(name, category)") as any)
        : supabase.from("quotes").select("*");
      query = query.order("created_at", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled,
  });
}

export function useQuote({ id, includeRelations = false, enabled = true }: UseQuoteOptions = {}) {
  return useQuery({
    queryKey: quoteQueryKey({ id, includeRelations }),
    queryFn: async () => {
      const query = includeRelations
        ? (supabase.from("quotes").select("*, materials(name, category)") as any)
        : supabase.from("quotes").select("*");
      const { data, error } = await query.eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: enabled && !!id,
  });
}