import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useAdminGuard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSales, setIsSales] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const userRoles = (data || []).map((r) => r.role);
      const admin = userRoles.includes("admin");
      const sales = userRoles.includes("sales");

      if (!admin && !sales) {
        navigate("/");
        return;
      }

      setRoles(userRoles);
      setIsAdmin(admin);
      setIsSales(sales);
      setIsStaff(true);
      setLoading(false);
    };
    check();
  }, [navigate]);

  return { loading, isAdmin, isSales, isStaff, roles };
}
