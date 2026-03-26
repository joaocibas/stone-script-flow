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
      const select = includeCustomer ? "*, customers(full_name, email, phone, address)" : "*";
      let query = supabase.from("orders").select(select).order("created_at", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      if (status && status !== "all") query = query.eq("status", status as any);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled,
  });
}

export function useOrder({ id, includeCustomer = false, enabled = true }: UseOrderOptions = {}) {
  return useQuery({
    queryKey: orderQueryKey({ id, includeCustomer }),
    queryFn: async () => {
      const select = includeCustomer ? "*, customers(*)" : "*";
      const { data, error } = await supabase.from("orders").select(select).eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!id,
  });
}