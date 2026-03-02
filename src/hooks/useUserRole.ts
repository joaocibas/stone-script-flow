import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      setRoles((data || []).map((r) => r.role));
      setLoading(false);
    };
    fetch();
  }, []);

  const isAdmin = roles.includes("admin");
  const isSales = roles.includes("sales");
  const isClient = roles.includes("customer");
  const isStaff = isAdmin || isSales;

  return { roles, loading, userId, isAdmin, isSales, isClient, isStaff };
}
