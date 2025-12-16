"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Branding = {
  primary_color: string;
  secondary_color: string;
  theme_mode: "light" | "dark";
};

const BrandingContext = createContext<Branding | null>(null);

// Optional hook if later you want to use the colors for buttons, etc.
export const useBranding = () => useContext(BrandingContext);

export default function BrandingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [branding, setBranding] = useState<Branding>({
    primary_color: "#111827", // default primary
    secondary_color: "#f97316", // default secondary
    theme_mode: "light",
  });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("branding_settings")
        .select("primary_color, secondary_color, theme_mode")
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setBranding({
          primary_color: data.primary_color || "#111827",
          secondary_color: data.secondary_color || "#f97316",
          theme_mode: (data.theme_mode as "light" | "dark") || "light",
        });
      } else {
        console.warn("Branding load error:", error);
      }
    };

    load();
  }, []);

  const bgColor = branding.theme_mode === "dark" ? "#020617" : "#f9fafb"; // dark / light background
  const textColor = branding.theme_mode === "dark" ? "#e5e7eb" : "#020617"; // light / dark text

  return (
    <BrandingContext.Provider value={branding}>
      <div
        style={
          {
            backgroundColor: bgColor,
            color: textColor,
            minHeight: "100vh",
            // expose colors as CSS vars for buttons, etc.
            // you can use these later in CSS or inline styles
            "--primary-color": branding.primary_color,
            "--secondary-color": branding.secondary_color,
          } as React.CSSProperties
        }
        className="transition-colors"
      >
        {children}
      </div>
    </BrandingContext.Provider>
  );
}
