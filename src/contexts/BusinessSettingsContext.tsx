import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanySettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  serviceAreaDescription: string;
  licensedInsuredEnabled: boolean;
  licensedInsuredText: string;
}

interface BusinessSettingsContextType {
  settings: Record<string, string>;
  company: CompanySettings;
  get: (key: string, fallback?: string) => string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULTS: Record<string, string> = {
  company_name: "Altar Stones",
  company_email: "info@altarstones.com",
  company_phone: "(941) 555-0123",
  company_address: "Sarasota, FL",
  service_area_description: "Sarasota, Bradenton, Venice, and surrounding communities",
  licensed_insured_enabled: "true",
  licensed_insured_text: "Licensed & Insured",
};

const BusinessSettingsContext = createContext<BusinessSettingsContextType | null>(null);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("business_settings")
      .select("key, value")
      .order("key");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s) => { map[s.key] = s.value; });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const get = useCallback(
    (key: string, fallback = "") => settings[key] ?? DEFAULTS[key] ?? fallback,
    [settings]
  );

  const company: CompanySettings = {
    companyName: get("company_name"),
    companyEmail: get("company_email"),
    companyPhone: get("company_phone"),
    companyAddress: get("company_address"),
    serviceAreaDescription: get("service_area_description"),
    licensedInsuredEnabled: get("licensed_insured_enabled") === "true",
    licensedInsuredText: get("licensed_insured_text"),
  };

  return (
    <BusinessSettingsContext.Provider value={{ settings, company, get, loading, refresh: fetchSettings }}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const ctx = useContext(BusinessSettingsContext);
  if (!ctx) throw new Error("useBusinessSettings must be used within BusinessSettingsProvider");
  return ctx;
}

export function useCompany() {
  return useBusinessSettings().company;
}
