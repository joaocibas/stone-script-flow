import { useState, useEffect } from "react";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/PhoneInput";
import { AddressInput, addressToString, parseAddress, type AddressValue, emptyAddress } from "@/components/AddressInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const Book = () => {
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState<Date | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    preferred_time: "",
    notes: "",
  });
  const [bookAddress, setBookAddress] = useState<AddressValue>(emptyAddress);

  // Auth form state
  const [authError, setAuthError] = useState("");
  const [authLoading2, setAuthLoading2] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", name: "" });

  // Load customer profile when logged in
  useEffect(() => {
    if (!user) return;
    supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCustomer(data);
          setForm(prev => ({
            ...prev,
            customer_name: data.full_name || "",
            customer_email: data.email || "",
            customer_phone: data.phone || "",
          }));
          if (data.address) setBookAddress(parseAddress(data.address));
        }
      });
  }, [user]);

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading2(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword(loginForm);
    setAuthLoading2(false);
    if (error) {
      if (error.message?.toLowerCase().includes("email not confirmed")) {
        setAuthError("Please verify your email first. Check your inbox for the verification link.");
      } else {
        setAuthError(error.message);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading2(true);
    setAuthError("");
    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: { full_name: signupForm.name },
      },
    });
    setAuthLoading2(false);
    if (error) {
      setAuthError(error.message);
    }
    // Auto-confirmed — user is logged in, component will re-render showing the booking form
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const fullAddress = addressToString(bookAddress);
    await supabase.from("appointments").insert({
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone || null,
      address: fullAddress,
      zip_code: bookAddress.zip || "00000",
      preferred_date: date ? format(date, "yyyy-MM-dd") : null,
      preferred_time: form.preferred_time || null,
      notes: form.notes || null,
      customer_id: customer?.id || null,
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (authLoading) {
    return (
      <Section>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Section>
    );
  }

  if (submitted) {
    return (
      <Section>
        <div className="max-w-md mx-auto text-center py-12">
          <CheckCircle2 className="h-16 w-16 text-accent mx-auto mb-4" />
          <h2 className="font-display text-2xl font-semibold mb-2">Consultation Requested!</h2>
          <p className="text-muted-foreground">
            We'll confirm your appointment within 1 business day. Check your email for details.
          </p>
        </div>
      </Section>
    );
  }

  // Not logged in — show login/signup first
  if (!user) {
    return (
      <Section>
        <SectionHeader
          title="Book a Free Consultation"
          subtitle="Sign in or create an account to schedule your consultation"
        />
        <Card className="max-w-md mx-auto border-0 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">Sign In to Continue</CardTitle>
            <p className="text-sm text-muted-foreground">Create an account or sign in to book your consultation</p>
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
                    <Label htmlFor="book-login-email">Email</Label>
                    <Input id="book-login-email" type="email" required value={loginForm.email} onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="book-login-password">Password</Label>
                    <Input id="book-login-password" type="password" required value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} />
                  </div>
                  {authError && <p className="text-destructive text-sm">{authError}</p>}
                  <Button type="submit" disabled={authLoading2} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    {authLoading2 ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="book-signup-name">Full Name</Label>
                  <Input id="book-signup-name" required value={signupForm.name} onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="book-signup-email">Email</Label>
                  <Input id="book-signup-email" type="email" required value={signupForm.email} onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="book-signup-password">Password</Label>
                  <Input id="book-signup-password" type="password" required minLength={6} value={signupForm.password} onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))} />
                </div>
                {authError && <p className="text-destructive text-sm">{authError}</p>}
                <Button type="submit" disabled={authLoading2} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {authLoading2 ? "Creating account..." : "Create Account"}
                </Button>
              </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </Section>
    );
  }

  // Logged in — show booking form
  return (
    <Section>
      <SectionHeader
        title="Book a Free Consultation"
        subtitle="Schedule an in-home measurement with our countertop experts"
      />

      <Card className="max-w-2xl mx-auto border-0 shadow-sm">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" required value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="zip">Zip Code *</Label>
                <Input id="zip" required value={form.zip_code} onChange={(e) => update("zip_code", e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input id="address" required value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>

            <div>
              <Label className="mb-2 block">Preferred Date</Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date()}
                className="rounded-md border mx-auto"
              />
            </div>

            <div>
              <Label htmlFor="time">Preferred Time</Label>
              <Input id="time" placeholder="e.g. Morning, 10am-12pm" value={form.preferred_time} onChange={(e) => update("preferred_time", e.target.value)} />
            </div>

            <div>
              <Label htmlFor="notes">Project Notes</Label>
              <Textarea id="notes" placeholder="Tell us about your project..." value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              <CalendarDays className="mr-2 h-4 w-4" />
              {loading ? "Submitting..." : "Request Consultation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Section>
  );
};

export default Book;
