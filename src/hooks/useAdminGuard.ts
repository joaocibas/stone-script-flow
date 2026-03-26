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
    const applySession = async (session: any) => {
      if (!session) {
        setLoading(false);
        navigate("/login", { replace: true });
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
        setLoading(false);
        navigate("/", { replace: true });
        return;
      }

      setRoles(userRoles);
      setIsAdmin(admin);
      setIsSales(sales);
      setIsStaff(true);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return { loading, isAdmin, isSales, isStaff, roles };
}
