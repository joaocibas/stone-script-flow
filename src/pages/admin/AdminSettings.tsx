import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

const SETTING_GROUPS: Record<string, { label: string; description: string; keys: string[] }> = {
  pricing: {
    label: "Pricing & Calculations",
    description: "Core pricing variables used by the estimator engine",
    keys: ["internal_price_per_sqft", "overage_pct", "tax_rate", "estimated_fabrication_avg", "estimated_addon_avg"],
  },
  buffers: {
    label: "Investment Range Buffers",
    description: "Buffer percentages for the conservative smart range shown to customers",
    keys: ["lower_buffer_pct", "upper_buffer_pct"],
  },
  slabs: {
    label: "Slab Defaults & Thresholds",
    description: "Default dimensions for new slabs and sq ft thresholds for size categories",
    keys: ["default_slab_length_inches", "default_slab_width_inches", "default_slab_thickness", "slab_standard_max_sqft", "slab_jumbo_max_sqft", "slab_super_jumbo_max_sqft"],
  },
  reservations: {
    label: "Reservations",
    description: "Deposit and reservation hold settings",
    keys: ["deposit_amount", "reservation_days"],
  },
  sla: {
    label: "SLA Targets",
    description: "Service level agreement thresholds — breaches trigger admin dashboard alerts only",
    keys: ["sla_max_contact_hours", "sla_max_schedule_hours", "sla_max_final_quote_hours", "min_reschedule_hours"],
  },
  company: {
    label: "Company Information",
    description: "Public company details shown on the storefront — changes update the website automatically",
    keys: ["company_name", "company_email", "company_phone", "company_address", "service_area_description", "licensed_insured_enabled", "licensed_insured_text"],
  },
  email: {
    label: "Email Configuration",
    description: "Sender names and addresses used in outgoing emails",
    keys: ["email_sender_name", "email_support_address", "email_warranty_address", "email_privacy_address"],
  },
  tracking: {
    label: "Tracking & Analytics",
    description: "Pixel and tag manager IDs — configured inside GTM for client-side, or via server-side forwarding",
    keys: ["gtm_container_id", "ga4_measurement_id", "meta_pixel_id", "server_side_tracking_enabled"],
  },
  features: {
    label: "Feature Toggles",
    description: "Enable or disable major platform features without code changes",
    keys: ["feature_online_booking", "feature_slab_reservation", "feature_instant_quote", "feature_customer_portal", "feature_ai_insights", "feature_cookie_consent", "feature_ai_lead_analysis"],
  },
  ai_controls: {
    label: "AI Analysis Controls",
    description: "Configure automated AI analysis behavior for leads and appointments",
    keys: ["ai_auto_analyze_leads", "ai_auto_analyze_appointments"],
  },
};

const TOGGLE_KEYS = new Set([
  "server_side_tracking_enabled",
  "feature_online_booking",
  "feature_slab_reservation",
  "feature_instant_quote",
  "feature_customer_portal",
  "feature_ai_insights",
  "feature_cookie_consent",
  "licensed_insured_enabled",
  "feature_ai_lead_analysis",
  "ai_auto_analyze_leads",
  "ai_auto_analyze_appointments",
]);

const AdminSettings = () => {
  const { refresh: globalRefresh } = useBusinessSettings();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .order("key");
      if (error) {
        toast.error("Failed to load settings");
        return;
      }
      setSettings(data ?? []);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const getValue = (key: string) => {
    if (key in editedValues) return editedValues[key];
    const s = settings.find((s) => s.key === key);
    return s?.value ?? "";
  };

  const getDescription = (key: string) => {
    return settings.find((s) => s.key === key)?.description ?? "";
  };

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  const handleSave = async () => {
    setSaving(true);
    const updates = Object.entries(editedValues);
    let errorCount = 0;

    for (const [key, value] of updates) {
      const { error } = await supabase
        .from("business_settings")
        .update({ value })
        .eq("key", key);
      if (error) errorCount++;
    }

    setSaving(false);

    if (errorCount > 0) {
      toast.error(`Failed to save ${errorCount} setting(s)`);
    } else {
      toast.success(`Saved ${updates.length} setting(s) — storefront updated automatically`);
      // Refresh settings from DB
      const { data } = await supabase.from("business_settings").select("*").order("key");
      if (data) setSettings(data);
      setEditedValues({});
      // Refresh global provider so storefront picks up changes immediately
      globalRefresh();
    }
  };

  const formatLabel = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace("Internal ", "🔒 Internal ").replace("Pct", "%").replace("Sqft", "Sq Ft");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Business Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All values are used by the estimator engine and business logic. Changes take effect immediately.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save {Object.keys(editedValues).length} Change{Object.keys(editedValues).length > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(SETTING_GROUPS).map(([groupKey, group]) => (
          <Card key={groupKey}>
            <CardHeader>
              <CardTitle className="text-lg">{group.label}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.keys.map((key, i) => (
                <div key={key}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2 items-start">
                    <div>
                      <Label htmlFor={key} className="text-sm font-medium">
                        {formatLabel(key)}
                      </Label>
                      {getDescription(key) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{getDescription(key)}</p>
                      )}
                    </div>
                    {TOGGLE_KEYS.has(key) ? (
                      <Switch
                        checked={getValue(key) === "true"}
                        onCheckedChange={(checked) => handleChange(key, checked ? "true" : "false")}
                        className="ml-auto"
                      />
                    ) : (
                      <Input
                        id={key}
                        value={getValue(key)}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className={key in editedValues ? "border-accent ring-1 ring-accent/30" : ""}
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Ungrouped settings */}
        {(() => {
          const groupedKeys = Object.values(SETTING_GROUPS).flatMap((g) => g.keys);
          const ungrouped = settings.filter((s) => !groupedKeys.includes(s.key));
          if (ungrouped.length === 0) return null;
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Other Settings</CardTitle>
                <CardDescription>Additional configuration values</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ungrouped.map((s, i) => (
                  <div key={s.key}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2 items-start">
                      <div>
                        <Label htmlFor={s.key} className="text-sm font-medium">
                          {formatLabel(s.key)}
                        </Label>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                        )}
                      </div>
                      <Input
                        id={s.key}
                        value={getValue(s.key)}
                        onChange={(e) => handleChange(s.key, e.target.value)}
                        className={s.key in editedValues ? "border-accent ring-1 ring-accent/30" : ""}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </div>
  );
};

export default AdminSettings;
