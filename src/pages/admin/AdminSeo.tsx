import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2, ChevronDown, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";

// All SEO keys grouped by section
const SEO_KEYS = {
  global: [
    "seo_default_site_title", "seo_title_tag_format", "seo_default_meta_description",
    "seo_default_og_title", "seo_default_og_description", "seo_default_og_image",
    "seo_canonical_url_base", "seo_show_to_search_engines", "seo_robots_index",
    "seo_robots_follow", "seo_enable_sitemap", "seo_auto_generate_sitemap",
    "seo_auto_generate_robots",
  ],
  local: [
    "seo_primary_city", "seo_secondary_cities", "seo_state_region", "seo_zip_codes_served",
    "seo_service_area_description", "seo_business_category", "seo_business_subcategory",
    "seo_business_hours", "seo_appointment_required", "seo_service_area_business",
    "seo_storefront_address", "seo_google_business_url", "seo_google_maps_url",
    "seo_google_review_url", "seo_yelp_url", "seo_facebook_url",
    "seo_local_title_template", "seo_local_meta_template",
  ],
  schema: [
    "seo_schema_company_name", "seo_schema_legal_name", "seo_schema_website_url",
    "seo_schema_logo", "seo_schema_phone", "seo_schema_email", "seo_schema_address",
    "seo_schema_city", "seo_schema_state", "seo_schema_postal_code", "seo_schema_country",
    "seo_schema_latitude", "seo_schema_longitude", "seo_schema_opening_hours",
    "seo_schema_price_range", "seo_schema_area_served",
    "seo_schema_facebook_url", "seo_schema_instagram_url", "seo_schema_youtube_url",
    "seo_schema_linkedin_url", "seo_schema_google_business_url",
    "seo_schema_faq_items",
  ],
  search_tools: [
    "seo_google_search_console_code", "seo_ga4_id", "seo_gtm_id",
    "seo_bing_verification", "seo_meta_pixel_id",
  ],
  image: [
    "seo_image_default_og", "seo_image_alt_text", "seo_image_title",
    "seo_image_compression", "seo_image_prefer_webp", "seo_gallery_alt_support",
  ],
};

const PAGES = ["home", "about", "services", "materials", "gallery", "contact", "estimate", "appointment"];
const PAGE_FIELDS = [
  "title", "meta_description", "canonical_url", "og_title", "og_description",
  "og_image", "noindex", "focus_keyword", "secondary_keywords", "slug", "h1_override", "schema_type",
];

const TOGGLE_KEYS = new Set([
  "seo_show_to_search_engines", "seo_robots_index", "seo_robots_follow",
  "seo_enable_sitemap", "seo_auto_generate_sitemap", "seo_auto_generate_robots",
  "seo_appointment_required", "seo_service_area_business", "seo_storefront_address",
  "seo_image_compression", "seo_image_prefer_webp", "seo_gallery_alt_support",
]);

const TEXTAREA_KEYS = new Set([
  "seo_default_meta_description", "seo_default_og_description",
  "seo_service_area_description", "seo_business_hours", "seo_schema_opening_hours",
  "seo_schema_area_served", "seo_local_meta_template", "seo_schema_faq_items",
]);

const formatLabel = (key: string) =>
  key
    .replace(/^seo_(schema_|page_\w+_|image_|local_)?/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Og ", "OG ")
    .replace("Url", "URL")
    .replace("Ga4", "GA4")
    .replace("Gtm", "GTM")
    .replace("Id", "ID")
    .replace("Seo", "SEO");

const AdminSeo = () => {
  const { refresh: globalRefresh } = useBusinessSettings();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPage, setSelectedPage] = useState("home");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ global: true });

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("business_settings")
      .select("key, value")
      .like("key", "seo_%");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const getValue = (key: string) => editedValues[key] ?? settings[key] ?? "";
  const handleChange = (key: string, value: string) => setEditedValues((p) => ({ ...p, [key]: value }));

  const hasChanges = Object.keys(editedValues).length > 0;

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(editedValues);
    let errorCount = 0;

    for (const [key, value] of updates) {
      // Upsert: try update first, insert if not exists
      const { data: existing } = await supabase.from("business_settings").select("id").eq("key", key).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("business_settings").update({ value }).eq("key", key);
        if (error) errorCount++;
      } else {
        const { error } = await supabase.from("business_settings").insert({ key, value });
        if (error) errorCount++;
      }
    }

    setSaving(false);
    if (errorCount > 0) {
      toast.error(`Failed to save ${errorCount} setting(s)`);
    } else {
      toast.success(`SEO settings updated successfully.`);
      await fetchSettings();
      setEditedValues({});
      globalRefresh();
    }
  };

  const toggleSection = (s: string) => setOpenSections((p) => ({ ...p, [s]: !p[s] }));

  const renderField = (key: string) => {
    const isEdited = key in editedValues;
    if (TOGGLE_KEYS.has(key)) {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <Label className="text-sm font-medium">{formatLabel(key)}</Label>
          <Switch
            checked={getValue(key) === "true"}
            onCheckedChange={(c) => handleChange(key, c ? "true" : "false")}
          />
        </div>
      );
    }
    if (TEXTAREA_KEYS.has(key)) {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{formatLabel(key)}</Label>
          <Textarea
            value={getValue(key)}
            onChange={(e) => handleChange(key, e.target.value)}
            className={isEdited ? "border-accent ring-1 ring-accent/30" : ""}
            rows={3}
            placeholder={`Enter ${formatLabel(key).toLowerCase()}...`}
          />
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1.5">
        <Label className="text-sm font-medium">{formatLabel(key)}</Label>
        <Input
          value={getValue(key)}
          onChange={(e) => handleChange(key, e.target.value)}
          className={isEdited ? "border-accent ring-1 ring-accent/30" : ""}
          placeholder={`Enter ${formatLabel(key).toLowerCase()}...`}
        />
      </div>
    );
  };

  // Page SEO keys
  const pageKey = (field: string) => `seo_page_${selectedPage}_${field}`;
  const pageToggleFields = new Set(["noindex"]);
  const pageTextareaFields = new Set(["meta_description", "og_description", "secondary_keywords"]);

  const renderPageField = (field: string) => {
    const key = pageKey(field);
    const isEdited = key in editedValues;
    const label = formatLabel(field);

    if (pageToggleFields.has(field)) {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <Label className="text-sm font-medium">{label}</Label>
          <Switch
            checked={getValue(key) === "true"}
            onCheckedChange={(c) => handleChange(key, c ? "true" : "false")}
          />
        </div>
      );
    }
    if (field === "schema_type") {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Select value={getValue(key) || "WebPage"} onValueChange={(v) => handleChange(key, v)}>
            <SelectTrigger className={isEdited ? "border-accent ring-1 ring-accent/30" : ""}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["WebPage", "AboutPage", "ContactPage", "FAQPage", "CollectionPage", "ItemPage", "ServicePage"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (pageTextareaFields.has(field)) {
      return (
        <div key={key} className="space-y-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          <Textarea
            value={getValue(key)}
            onChange={(e) => handleChange(key, e.target.value)}
            className={isEdited ? "border-accent ring-1 ring-accent/30" : ""}
            rows={3}
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        <Input
          value={getValue(key)}
          onChange={(e) => handleChange(key, e.target.value)}
          className={isEdited ? "border-accent ring-1 ring-accent/30" : ""}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>
    );
  };

  // SEO Health checks
  const healthChecks = PAGES.map((page) => {
    const title = getValue(`seo_page_${page}_title`);
    const meta = getValue(`seo_page_${page}_meta_description`);
    const h1 = getValue(`seo_page_${page}_h1_override`);
    const canonical = getValue(`seo_page_${page}_canonical_url`);
    const noindex = getValue(`seo_page_${page}_noindex`) === "true";
    return { page, title, meta, h1, canonical, noindex };
  });

  // Duplicate detection
  const allTitles = healthChecks.map((h) => h.title).filter(Boolean);
  const allMetas = healthChecks.map((h) => h.meta).filter(Boolean);
  const dupTitles = allTitles.filter((t, i) => allTitles.indexOf(t) !== i);
  const dupMetas = allMetas.filter((m, i) => allMetas.indexOf(m) !== i);

  // FAQ items from JSON
  const faqRaw = getValue("seo_schema_faq_items");
  let faqItems: { question: string; answer: string }[] = [];
  try { faqItems = faqRaw ? JSON.parse(faqRaw) : []; } catch { faqItems = []; }

  const addFaqItem = () => {
    const updated = [...faqItems, { question: "", answer: "" }];
    handleChange("seo_schema_faq_items", JSON.stringify(updated));
  };
  const updateFaqItem = (idx: number, field: "question" | "answer", value: string) => {
    const updated = [...faqItems];
    updated[idx] = { ...updated[idx], [field]: value };
    handleChange("seo_schema_faq_items", JSON.stringify(updated));
  };
  const removeFaqItem = (idx: number) => {
    const updated = faqItems.filter((_, i) => i !== idx);
    handleChange("seo_schema_faq_items", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SectionWrapper = ({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) => (
    <Collapsible open={openSections[id] ?? false} onOpenChange={() => toggleSection(id)}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSections[id] ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">SEO & Local SEO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all SEO settings. Changes update the front-end dynamically.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save {Object.keys(editedValues).length} Change{Object.keys(editedValues).length > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* 1. Global SEO */}
        <SectionWrapper id="global" title="1. Global SEO" description="Default site-wide SEO settings, robots, and sitemap controls">
          {SEO_KEYS.global.map(renderField)}
        </SectionWrapper>

        {/* 2. Page SEO */}
        <SectionWrapper id="page" title="2. Page SEO" description="Per-page SEO titles, descriptions, OG tags, keywords, and schema types">
          <div className="mb-4">
            <Label className="text-sm font-medium mb-1.5 block">Select Page</Label>
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGES.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-4 pt-2">
            {PAGE_FIELDS.map(renderPageField)}
          </div>
        </SectionWrapper>

        {/* 3. Local SEO */}
        <SectionWrapper id="local" title="3. Local SEO" description="Service areas, business profiles, local SEO templates">
          {SEO_KEYS.local.map(renderField)}
        </SectionWrapper>

        {/* 4. Schema Markup */}
        <SectionWrapper id="schema" title="4. Schema Markup" description="Structured data for Google rich results — company, social, FAQ">
          {SEO_KEYS.schema.filter((k) => k !== "seo_schema_faq_items").map(renderField)}
          <Separator className="my-4" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">FAQ Schema Items</Label>
              <Button size="sm" variant="outline" onClick={addFaqItem}>
                <Plus className="h-3 w-3 mr-1" /> Add FAQ
              </Button>
            </div>
            {faqItems.length === 0 && (
              <p className="text-sm text-muted-foreground">No FAQ items yet. Click "Add FAQ" to add one.</p>
            )}
            {faqItems.map((item, idx) => (
              <div key={idx} className="border rounded-md p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">FAQ #{idx + 1}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFaqItem(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  placeholder="Question"
                  value={item.question}
                  onChange={(e) => updateFaqItem(idx, "question", e.target.value)}
                />
                <Textarea
                  placeholder="Answer"
                  value={item.answer}
                  onChange={(e) => updateFaqItem(idx, "answer", e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </SectionWrapper>

        {/* 5. Search Tools */}
        <SectionWrapper id="tools" title="5. Search Tools" description="Verification codes and tracking IDs for search engines and analytics">
          {SEO_KEYS.search_tools.map(renderField)}
        </SectionWrapper>

        {/* 6. SEO Health */}
        <SectionWrapper id="health" title="6. SEO Health" description="Quick audit of per-page SEO completeness">
          <div className="space-y-3">
            {healthChecks.map((h) => {
              const issues: string[] = [];
              if (!h.title) issues.push("Missing title");
              if (!h.meta) issues.push("Missing meta description");
              if (!h.h1) issues.push("Missing H1");
              if (!h.canonical) issues.push("Missing canonical");
              if (h.noindex) issues.push("Marked noindex");
              if (dupTitles.includes(h.title) && h.title) issues.push("Duplicate title");
              if (dupMetas.includes(h.meta) && h.meta) issues.push("Duplicate meta description");

              const status = issues.length === 0 ? "good" : issues.length <= 2 ? "attention" : "missing";

              return (
                <div key={h.page} className="flex items-start justify-between border rounded-md p-3">
                  <div>
                    <span className="text-sm font-medium capitalize">{h.page}</span>
                    {issues.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {issues.map((i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {i}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Badge variant={status === "good" ? "default" : status === "attention" ? "secondary" : "destructive"} className="shrink-0 ml-2">
                    {status === "good" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {status === "attention" && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {status === "missing" && <XCircle className="h-3 w-3 mr-1" />}
                    {status === "good" ? "Good" : status === "attention" ? "Needs Attention" : "Missing"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </SectionWrapper>

        {/* 7. Image SEO */}
        <SectionWrapper id="image" title="7. Image SEO" description="Default OG images, alt text, compression, and format preferences">
          {SEO_KEYS.image.map(renderField)}
        </SectionWrapper>
      </div>
    </div>
  );
};

export default AdminSeo;
