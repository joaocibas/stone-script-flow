import { useState, useEffect } from "react";
import { sendEmail } from "@/lib/send-email";
import { welcomeEmail } from "@/lib/email-templates";
import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", name: "" });

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (authLoading || !user) return;
    setRedirecting(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const roles = (data || []).map((r) => r.role);
      if (roles.includes("admin") || roles.includes("sales")) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword(loginForm);
    if (authError) {
      setLoading(false);
      // Handle unverified email
      if (authError.message?.toLowerCase().includes("email not confirmed")) {
        setError("Please verify your email first. Check your inbox for the verification link.");
        return;
      }
      setError(authError.message);
      return;
    }
    // Check role to redirect appropriately
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);
    setLoading(false);
    const userRoles = (roles || []).map((r) => r.role);
    if (userRoles.includes("admin") || userRoles.includes("sales")) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error: signupError } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: { full_name: signupForm.name },
      },
    });
    setLoading(false);
    if (signupError) {
      setError(signupError.message);
    } else if (data.user) {
      // Auto-confirmed — user is already logged in, redirect will happen via useEffect
    }
  };

  if (authLoading || redirecting) {
    return (
      <Section>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <Card className="max-w-md mx-auto border-0 shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Client Portal</CardTitle>
          <p className="text-sm text-muted-foreground">Access your quotes, reservations, and orders</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" required value={loginForm.email} onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" required value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input id="signup-name" required value={signupForm.name} onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" required value={signupForm.email} onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={signupForm.password} onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))} />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Section>
  );
};

export default Login;
