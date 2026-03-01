import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const STORAGE_KEY = "altar-cookie-consent";

export type CookiePreferences = {
  necessary: boolean; // always true
  analytics: boolean;
  marketing: boolean;
};

const defaults: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const getCookiePreferences = (): CookiePreferences | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const CookieConsent = () => {
  const flags = useFeatureFlags();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(defaults);

  useEffect(() => {
    if (!flags.loaded || !flags.cookie_consent) return;
    const saved = getCookiePreferences();
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [flags.loaded, flags.cookie_consent]);

  const save = useCallback((preferences: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setVisible(false);
  }, []);

  const acceptAll = () => save({ necessary: true, analytics: true, marketing: true });
  const rejectNonEssential = () => save({ necessary: true, analytics: false, marketing: false });
  const savePreferences = () => save(prefs);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6"
      >
        <div className="max-w-2xl mx-auto rounded-lg border border-border bg-card shadow-xl">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-md bg-accent/10 text-accent shrink-0 mt-0.5">
                <Cookie className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-base">We value your privacy</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  We use cookies to improve your experience and analyze site traffic.{" "}
                  <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>

            {/* Expandable preferences */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 py-3 border-t border-border mt-3">
                    <PreferenceRow
                      label="Necessary"
                      description="Required for the site to function. Cannot be disabled."
                      checked={true}
                      disabled
                    />
                    <PreferenceRow
                      label="Analytics"
                      description="Help us understand how visitors interact with our website."
                      checked={prefs.analytics}
                      onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                    />
                    <PreferenceRow
                      label="Marketing"
                      description="Used to deliver relevant ads and track campaign performance."
                      checked={prefs.marketing}
                      onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs gap-1"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                {expanded ? "Hide preferences" : "Manage preferences"}
              </Button>

              <div className="flex items-center gap-2 sm:ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={rejectNonEssential}
                >
                  Reject non-essential
                </Button>
                {expanded ? (
                  <Button
                    size="sm"
                    className="text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={savePreferences}
                  >
                    Save preferences
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={acceptAll}
                  >
                    Accept all
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const PreferenceRow = ({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
  </div>
);
