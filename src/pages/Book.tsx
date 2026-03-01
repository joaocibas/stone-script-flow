import { useState } from "react";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, CalendarDays } from "lucide-react";
import { format } from "date-fns";

const Book = () => {
  const [date, setDate] = useState<Date | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address: "",
    zip_code: "",
    preferred_time: "",
    notes: "",
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from("appointments").insert({
      ...form,
      preferred_date: date ? format(date, "yyyy-MM-dd") : null,
    });
    setLoading(false);
    setSubmitted(true);
  };

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
