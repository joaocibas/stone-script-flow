import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type UseOrdersOptions = {
  customerId?: string | null;
  status?: string;
  includeCustomer?: boolean;
  enabled?: boolean;
};

type UseOrderOptions = {
  id?: string | null;
  includeCustomer?: boolean;
  enabled?: boolean;
};

export const ordersQueryKey = (options: UseOrdersOptions = {}) => [
  "orders",
  options.customerId ?? "all",
  options.status ?? "all",
  options.includeCustomer ? "with-customer" : "base",
];

export const orderQueryKey = (options: UseOrderOptions = {}) => [
  "orders",
  "detail",
  options.id ?? "unknown",
  options.includeCustomer ? "with-customer" : "base",
];

export function useOrders({ customerId, status, includeCustomer = false, enabled = true }: UseOrdersOptions = {}) {
  return useQuery({
    queryKey: ordersQueryKey({ customerId, status, includeCustomer }),
    queryFn: async () => {
      let query = includeCustomer
        ? (supabase.from("orders").select("*, customers(full_name, email, phone, address)") as any)
        : supabase.from("orders").select("*");
      query = query.order("created_at", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      if (status && status !== "all") query = query.eq("status", status as any);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled,
  });
}

export function useOrder({ id, includeCustomer = false, enabled = true }: UseOrderOptions = {}) {
  return useQuery({
    queryKey: orderQueryKey({ id, includeCustomer }),
    queryFn: async () => {
      const query = includeCustomer
        ? (supabase.from("orders").select("*, customers(*)") as any)
        : supabase.from("orders").select("*");
      const { data, error } = await query.eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: enabled && !!id,
  });
}