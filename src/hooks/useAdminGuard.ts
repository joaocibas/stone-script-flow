import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useAdminGuard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSales, setIsSales] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    // Wait for auth context to finish loading
    if (authLoading) return;

    // No user → redirect to login
    if (!user) {
      setRoleLoading(false);
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const fetchRoles = async () => {
      setRoleLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (cancelled) return;

      const userRoles = (data || []).map((r) => r.role);
      const admin = userRoles.includes("admin");
      const sales = userRoles.includes("sales");

      if (!admin && !sales) {
        setRoleLoading(false);
        navigate("/dashboard", { replace: true });
        return;
      }

      setRoles(userRoles);
      setIsAdmin(admin);
      setIsSales(sales);
      setIsStaff(true);
      setRoleLoading(false);
    };

    fetchRoles();

    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  return { loading: authLoading || roleLoading, isAdmin, isSales, isStaff, roles };
}
