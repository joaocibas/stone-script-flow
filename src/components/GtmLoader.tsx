import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dynamically loads the GTM snippet using the container ID
 * stored in business_settings. Renders nothing visible.
 */
export const GtmLoader = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;

    const load = async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("value")
        .eq("key", "gtm_container_id")
        .single();

      const gtmId = data?.value?.trim();
      if (!gtmId || !gtmId.startsWith("GTM-")) return;

      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        "gtm.start": new Date().getTime(),
        event: "gtm.js",
      });

      // Inject GTM script
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
      document.head.appendChild(script);

      // Inject noscript iframe
      const noscript = document.createElement("noscript");
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
      iframe.height = "0";
      iframe.width = "0";
      iframe.style.display = "none";
      iframe.style.visibility = "hidden";
      noscript.appendChild(iframe);
      document.body.insertBefore(noscript, document.body.firstChild);

      setLoaded(true);
    };

    load();
  }, [loaded]);

  return null;
};
