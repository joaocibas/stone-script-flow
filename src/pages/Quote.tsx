import { useEffect, useState } from "react";
import { Section, SectionHeader } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, CheckCircle2, Ruler, Layers, Scissors } from "lucide-react";

const steps = [
  { label: "Material", icon: Layers },
  { label: "Dimensions", icon: Ruler },
  { label: "Options", icon: Scissors },
  { label: "Your Estimate", icon: CheckCircle2 },
];

const edgeProfiles = ["Standard Eased", "Beveled", "Bullnose", "Ogee", "Waterfall"];

const Quote = () => {
  const [step, setStep] = useState(0);
  const [materials, setMaterials] = useState<Tables<"materials">[]>([]);
  const [form, setForm] = useState({
    material_id: "",
    length_inches: "",
    width_inches: "",
    edge_profile: "",
    num_cutouts: "0",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.from("materials").select("*").eq("is_active", true).order("name").then(({ data }) => {
      setMaterials(data || []);
    });
  }, []);

  const selectedMaterial = materials.find((m) => m.id === form.material_id);

  const canNext = () => {
    if (step === 0) return !!form.material_id;
    if (step === 1) return Number(form.length_inches) > 0 && Number(form.width_inches) > 0;
    if (step === 2) return true;
    return false;
  };

  const handleSubmit = () => {
    // In production this calls the calculate-quote edge function
    // and returns only the estimated range — no pricing logic here
    setSubmitted(true);
    setStep(3);
  };

  return (
    <Section>
      <SectionHeader
        title="Get Your Estimated Investment"
        subtitle="Tell us about your project and we'll provide an investment range"
      />

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              i <= step ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
            )}>
              <s.icon className="h-4 w-4" />
            </div>
            <span className={cn("text-sm hidden sm:block", i <= step ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <Card className="max-w-xl mx-auto border-0 shadow-sm">
        <CardContent className="p-6 md:p-8">
          {/* Step 0: Material */}
          {step === 0 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Select Your Material</Label>
              <div className="grid grid-cols-1 gap-2">
                {materials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => setForm({ ...form, material_id: mat.id })}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      form.material_id === mat.id
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <p className="font-medium">{mat.name}</p>
                    <p className="text-sm text-muted-foreground">{mat.category}</p>
                  </button>
                ))}
                {materials.length === 0 && (
                  <p className="text-muted-foreground text-sm">Loading materials...</p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Dimensions */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Enter Your Countertop Dimensions</Label>
              <p className="text-sm text-muted-foreground">Approximate measurements are fine — we'll confirm during your consultation.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="length" className="text-sm">Length (inches)</Label>
                  <Input
                    id="length"
                    type="number"
                    placeholder="e.g. 96"
                    value={form.length_inches}
                    onChange={(e) => setForm({ ...form, length_inches: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="width" className="text-sm">Width (inches)</Label>
                  <Input
                    id="width"
                    type="number"
                    placeholder="e.g. 26"
                    value={form.width_inches}
                    onChange={(e) => setForm({ ...form, width_inches: e.target.value })}
                  />
                </div>
              </div>
              {Number(form.length_inches) > 0 && Number(form.width_inches) > 0 && (
                <p className="text-sm text-muted-foreground">
                  ≈ {((Number(form.length_inches) * Number(form.width_inches)) / 144).toFixed(1)} sq ft
                </p>
              )}
            </div>
          )}

          {/* Step 2: Options */}
          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Customize Your Project</Label>
              <div>
                <Label htmlFor="edge" className="text-sm">Edge Profile</Label>
                <Select value={form.edge_profile} onValueChange={(v) => setForm({ ...form, edge_profile: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select edge profile (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {edgeProfiles.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cutouts" className="text-sm">Number of Cutouts (sink, cooktop, etc.)</Label>
                <Input
                  id="cutouts"
                  type="number"
                  min="0"
                  value={form.num_cutouts}
                  onChange={(e) => setForm({ ...form, num_cutouts: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && submitted && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-display text-2xl font-semibold mb-2">Your Estimated Investment Range</h3>
              <div className="bg-accent/5 rounded-lg p-6 my-6">
                <p className="text-sm text-muted-foreground mb-1">For {selectedMaterial?.name} · {((Number(form.length_inches) * Number(form.width_inches)) / 144).toFixed(1)} sq ft</p>
                <p className="font-display text-3xl font-bold text-accent">$X,XXX — $X,XXX</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes material, fabrication, and installation. 
                  Final pricing confirmed after in-home measurement.
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule a free consultation to get your exact quote and see slabs in person.
              </p>
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <a href="/book">Book Free Consultation <ArrowRight className="ml-1 h-4 w-4" /></a>
              </Button>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < 2 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext()}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Get Estimate <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
};

export default Quote;
