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
import { trackEvent } from "@/lib/tracking";
import { ArrowRight, ArrowLeft, CheckCircle2, Upload, Ruler, Layers, Scissors, DollarSign } from "lucide-react";

const steps = [
  { label: "Upload Layout", icon: Upload },
  { label: "Material", icon: Layers },
  { label: "Dimensions", icon: Ruler },
  { label: "Options", icon: Scissors },
  { label: "Your Estimate", icon: DollarSign },
];

const edgeProfiles = ["Standard Eased", "Beveled", "Bullnose", "Ogee", "Waterfall"];

interface QuoteResult {
  quote_id: string;
  calculated_sqft: string;
  slabs_needed: number;
  slab_category: string;
  range_min: number;
  range_max: number;
}

const Quote = () => {
  const [step, setStep] = useState(0);
  const [materials, setMaterials] = useState<Tables<"materials">[]>([]);
  const [form, setForm] = useState({
    material_id: "",
    length_inches: "",
    width_inches: "",
    edge_profile: "",
    num_cutouts: "0",
    reference_measurement_inches: "",
  });
  const [layoutFile, setLayoutFile] = useState<File | null>(null);
  const [layoutPreview, setLayoutPreview] = useState<string | null>(null);
  const [layoutUrl, setLayoutUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("materials")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setMaterials(data || []));
  }, []);

  const selectedMaterial = materials.find((m) => m.id === form.material_id);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF, JPG, or PNG file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }

    setLayoutFile(file);
    setError("");

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setLayoutPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLayoutPreview(null);
    }
  };

  const uploadLayout = async () => {
    if (!layoutFile) return null;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Use user id folder if logged in, else a temp folder
    const folder = user?.id || "anonymous";
    const fileName = `${folder}/${Date.now()}-${layoutFile.name}`;

    const { data, error: uploadErr } = await supabase.storage
      .from("layout-uploads")
      .upload(fileName, layoutFile);

    setUploading(false);

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      // Continue without layout - it's optional
      return null;
    }

    const url = data?.path || null;
    setLayoutUrl(url);
    return url;
  };

  const canNext = () => {
    if (step === 0) return true; // Layout is optional
    if (step === 1) return !!form.material_id;
    if (step === 2) return Number(form.length_inches) > 0 && Number(form.width_inches) > 0;
    if (step === 3) return true;
    return false;
  };

  // Track estimator_start when user first interacts
  const [estimatorStarted, setEstimatorStarted] = useState(false);
  const handleEstimatorStart = () => {
    if (!estimatorStarted) {
      trackEvent("estimator_start", { material_id: form.material_id || undefined });
      setEstimatorStarted(true);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    try {
      // Upload layout if present
      let uploadedUrl = layoutUrl;
      if (layoutFile && !layoutUrl) {
        uploadedUrl = await uploadLayout();
      }

      const lengthIn = Number(form.length_inches);
      const widthIn = Number(form.width_inches);
      const calculatedSqft = (lengthIn * widthIn) / 144;

      const { data, error: fnError } = await supabase.functions.invoke("calculate-quote", {
        body: {
          material_id: form.material_id,
          length_inches: lengthIn,
          width_inches: widthIn,
          edge_profile: form.edge_profile || undefined,
          num_cutouts: Number(form.num_cutouts),
          layout_url: uploadedUrl,
          reference_measurement_inches: Number(form.reference_measurement_inches) || undefined,
          calculated_sqft: calculatedSqft > 0 ? calculatedSqft : undefined,
        },
      });

      if (fnError) throw fnError;
      const quoteResult = data as QuoteResult;
      setResult(quoteResult);
      trackEvent("sqft_calculated", {
        sqft: quoteResult.calculated_sqft,
        material: selectedMaterial?.name,
        range_min: quoteResult.range_min,
        range_max: quoteResult.range_max,
      });
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to calculate estimate. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  return (
    <Section>
      <SectionHeader
        title="Get Your Estimated Investment"
        subtitle="Upload your layout and dimensions — we'll provide a transparent investment range"
      />

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                i <= step ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <s.icon className="h-4 w-4" />
            </div>
            <span className={cn("text-xs sm:text-sm hidden md:block", i <= step ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-4 sm:w-8 h-px bg-border mx-0.5" />}
          </div>
        ))}
      </div>

      <Card className="max-w-xl mx-auto border-0 shadow-sm">
        <CardContent className="p-6 md:p-8">
          {/* Step 0: Upload Layout */}
          {step === 0 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Upload Your Layout (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Upload a photo or PDF of your countertop layout. This helps us provide a more accurate estimate.
              </p>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {layoutPreview ? (
                  <div className="space-y-3">
                    <img src={layoutPreview} alt="Layout preview" className="max-h-48 mx-auto rounded" />
                    <p className="text-sm text-muted-foreground">{layoutFile?.name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setLayoutFile(null); setLayoutPreview(null); setLayoutUrl(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : layoutFile ? (
                  <div className="space-y-3">
                    <Upload className="h-10 w-10 text-accent mx-auto" />
                    <p className="text-sm font-medium">{layoutFile.name}</p>
                    <p className="text-xs text-muted-foreground">PDF uploaded</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setLayoutFile(null); setLayoutUrl(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, or PNG (max 10MB)</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                )}
              </div>

              {layoutFile && (
                <div>
                  <Label htmlFor="ref" className="text-sm">Reference Measurement (inches)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter one known measurement from your layout to help us calibrate dimensions.
                  </p>
                  <Input
                    id="ref"
                    type="number"
                    placeholder="e.g. 96"
                    value={form.reference_measurement_inches}
                    onChange={(e) => setForm({ ...form, reference_measurement_inches: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 1: Material */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Select Your Material</Label>
              <div className="grid grid-cols-1 gap-2">
                {materials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => {
                      setForm({ ...form, material_id: mat.id });
                      handleEstimatorStart();
                    }}
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

          {/* Step 2: Dimensions */}
          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-base font-display">Enter Your Countertop Dimensions</Label>
              <p className="text-sm text-muted-foreground">
                Approximate measurements are fine — we'll confirm during your consultation.
              </p>
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

          {/* Step 3: Options */}
          {step === 3 && (
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

          {/* Step 4: Result */}
          {step === 4 && result && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="font-display text-2xl font-semibold mb-2">Your Estimated Investment Range</h3>

              <div className="bg-accent/5 rounded-lg p-6 my-6">
                <p className="text-sm text-muted-foreground mb-1">
                  {selectedMaterial?.name} · {result.calculated_sqft} sq ft
                </p>
                <p className="font-display text-3xl font-bold text-accent">
                  {formatCurrency(result.range_min)} — {formatCurrency(result.range_max)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes material, fabrication & installation
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left bg-secondary/50 rounded-lg p-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Slab Category</p>
                  <p className="text-sm font-medium">{result.slab_category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Slabs Needed</p>
                  <p className="text-sm font-medium">{result.slabs_needed}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                This is a conservative range. Final pricing is confirmed after an in-home measurement.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <a href="/book">Book Free Consultation <ArrowRight className="ml-1 h-4 w-4" /></a>
                </Button>
                <Button variant="outline" onClick={() => { setStep(0); setResult(null); setLayoutFile(null); setLayoutPreview(null); setLayoutUrl(null); }}>
                  Start New Estimate
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-destructive text-sm mt-3">{error}</p>}

          {/* Navigation */}
          {step < 4 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < 3 ? (
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
                  disabled={submitting}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {submitting ? "Calculating..." : "Get Estimate"} <ArrowRight className="ml-1 h-4 w-4" />
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
