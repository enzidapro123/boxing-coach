// app/BrandingProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

type ThemeMode = "light" | "dark";

export type BrandingState = {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  themeMode: ThemeMode;
  loading: boolean;
};

// Context value exposes BOTH a nested `branding` object AND
// the individual properties for backwards compatibility.
type BrandingContextValue = BrandingState & {
  branding: BrandingState;
  setBranding: (b: BrandingState) => void;
};

const BrandingContext = createContext<BrandingContextValue | undefined>(
  undefined
);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [brandingState, setBrandingState] = useState<BrandingState>({
    logoUrl: "/logo.png",
    primaryColor: "#ef4444",
    secondaryColor: "#f97316",
    backgroundColor: "#fdfcf6",
    themeMode: "light",
    loading: true,
  });

  // Load the latest branding row (history-aware)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("branding_settings")
        .select(
          "logo_url, primary_color, secondary_color, background_color, theme_mode"
        )
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (!error && data && data.length > 0) {
        const row = data[0] as {
          logo_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          background_color: string | null;
          theme_mode: ThemeMode | null;
        };

        setBrandingState({
          logoUrl: row.logo_url || "/logo.png",
          primaryColor: row.primary_color || "#ef4444",
          secondaryColor: row.secondary_color || "#f97316",
          backgroundColor: row.background_color || "#fdfcf6",
          themeMode: (row.theme_mode as ThemeMode) || "light",
          loading: false,
        });
      } else {
        // fallback to defaults but mark as loaded
        setBrandingState((prev) => ({ ...prev, loading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync to CSS variables + data-theme
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-color", brandingState.primaryColor);
    root.style.setProperty("--secondary-color", brandingState.secondaryColor);
    root.style.setProperty("--background-color", brandingState.backgroundColor);
    root.dataset.theme = brandingState.themeMode;
  }, [
    brandingState.primaryColor,
    brandingState.secondaryColor,
    brandingState.backgroundColor,
    brandingState.themeMode,
  ]);

  const setBranding = (b: BrandingState) => setBrandingState(b);

  const value: BrandingContextValue = {
    branding: brandingState,
    setBranding,
    // spread the individual fields so existing code using
    // const { logoUrl } = useBranding() still works
    ...brandingState,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding must be used inside <BrandingProvider>");
  }
  return ctx;
}
