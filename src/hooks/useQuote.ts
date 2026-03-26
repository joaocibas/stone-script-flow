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
      const select = includeRelations
        ? "*, customers(full_name, email, phone, address), materials(name, category)"
        : "*";
      let query = supabase.from("quotes").select(select).order("created_at", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
}

export function useQuote({ id, includeRelations = false, enabled = true }: UseQuoteOptions = {}) {
  return useQuery({
    queryKey: quoteQueryKey({ id, includeRelations }),
    queryFn: async () => {
      const select = includeRelations ? "*, materials(name, category)" : "*";
      const { data, error } = await supabase.from("quotes").select(select).eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!id,
  });
}