import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Section } from "@/components/shared/Section";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically exchanges the token from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          setStatus("error");
          setErrorMsg(error?.message || "Unable to verify your email. Please try again.");
          return;
        }

        // Check user role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        const userRoles = (roles || []).map((r) => r.role);

        if (userRoles.includes("admin") || userRoles.includes("sales")) {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        setStatus("error");
        setErrorMsg("An unexpected error occurred.");
      }
    };

    handleCallback();
  }, [navigate]);

  if (status === "error") {
    return (
      <Section>
        <div className="max-w-md mx-auto text-center py-12">
          <h2 className="font-display text-2xl font-semibold mb-2 text-destructive">
            Verification Failed
          </h2>
          <p className="text-muted-foreground mb-4">{errorMsg}</p>
          <a href="/login" className="text-accent hover:underline">
            Go to Login
          </a>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Verifying your email...</p>
      </div>
    </Section>
  );
};

export default AuthCallback;
