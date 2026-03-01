import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlags {
  online_booking: boolean;
  slab_reservation: boolean;
  instant_quote: boolean;
  customer_portal: boolean;
  ai_insights: boolean;
  cookie_consent: boolean;
  loaded: boolean;
}

const defaults: FeatureFlags = {
  online_booking: true,
  slab_reservation: true,
  instant_quote: true,
  customer_portal: true,
  ai_insights: true,
  cookie_consent: true,
  loaded: false,
};

let cachedFlags: FeatureFlags | null = null;
let fetchPromise: Promise<FeatureFlags> | null = null;

const fetchFlags = async (): Promise<FeatureFlags> => {
  const { data } = await supabase
    .from("business_settings")
    .select("key, value")
    .like("key", "feature_%");

  if (!data) return { ...defaults, loaded: true };

  const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
  return {
    online_booking: map.feature_online_booking !== "false",
    slab_reservation: map.feature_slab_reservation !== "false",
    instant_quote: map.feature_instant_quote !== "false",
    customer_portal: map.feature_customer_portal !== "false",
    ai_insights: map.feature_ai_insights !== "false",
    cookie_consent: map.feature_cookie_consent !== "false",
    loaded: true,
  };
};

export const useFeatureFlags = (): FeatureFlags => {
  const [flags, setFlags] = useState<FeatureFlags>(cachedFlags ?? defaults);

  useEffect(() => {
    if (cachedFlags) {
      setFlags(cachedFlags);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchFlags();
    }

    fetchPromise.then((result) => {
      cachedFlags = result;
      setFlags(result);
    });
  }, []);

  return flags;
};

/** Invalidate cache so next hook mount re-fetches */
export const invalidateFeatureFlags = () => {
  cachedFlags = null;
  fetchPromise = null;
};
