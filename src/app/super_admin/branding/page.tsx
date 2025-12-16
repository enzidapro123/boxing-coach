// app/super_admin/branding/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

type ThemeMode = "light" | "dark";

type BrandingRow = {
  id: number;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  theme_mode: ThemeMode | null;
};

export default function BrandingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // form state
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [primaryColor, setPrimaryColor] = useState("#ef4444");
  const [secondaryColor, setSecondaryColor] = useState("#f97316");
  const [backgroundColor, setBackgroundColor] = useState("#fffdf3");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  // preview state (just to show logo img)
  const [previewLogo, setPreviewLogo] = useState("/logo.png");

  // ------------------ load current settings from DB ------------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // super_admin auth guard (simple)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: roleRow, error: roleErr } = await supabase
          .from("users")
          .select("user_role")
          .eq("id", user.id)
          .maybeSingle();

        if (roleErr || !roleRow || roleRow.user_role !== "super_admin") {
          router.replace("/");
          return;
        }

        // 🔹 Get the *latest* branding row (history-aware)
        const { data, error } = await supabase
          .from("branding_settings")
          .select("*")
          .order("updated_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        const row = data as BrandingRow | null;

        if (row) {
          const logo = row.logo_url || "/logo.png";
          const primary = row.primary_color || "#ef4444";
          const secondary = row.secondary_color || "#f97316";
          const bg = row.background_color || "#fffdf3";
          const mode: ThemeMode = (row.theme_mode as ThemeMode) || "light";

          setLogoUrl(logo);
          setPreviewLogo(logo);
          setPrimaryColor(primary);
          setSecondaryColor(secondary);
          setBackgroundColor(bg);
          setThemeMode(mode);

          // also push to CSS vars on initial load
          applyCssVars({
            logoUrl: logo,
            primary,
            secondary,
            background: bg,
            mode,
          });
        } else {
          // no row yet -> insert default in DB (first history entry)
          const defaultLogo = "/logo.png";
          const defaultPrimary = "#ef4444";
          const defaultSecondary = "#f97316";
          const defaultBg = "#fffdf3";
          const defaultMode: ThemeMode = "light";

          await supabase.from("branding_settings").insert({
            logo_url: defaultLogo,
            primary_color: defaultPrimary,
            secondary_color: defaultSecondary,
            background_color: defaultBg,
            theme_mode: defaultMode,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          });

          setLogoUrl(defaultLogo);
          setPreviewLogo(defaultLogo);
          setPrimaryColor(defaultPrimary);
          setSecondaryColor(defaultSecondary);
          setBackgroundColor(defaultBg);
          setThemeMode(defaultMode);

          applyCssVars({
            logoUrl: defaultLogo,
            primary: defaultPrimary,
            secondary: defaultSecondary,
            background: defaultBg,
            mode: defaultMode,
          });
        }
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Failed to load branding settings.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // --------------- helper to push values into CSS variables ---------------
  function applyCssVars(opts: {
    logoUrl: string;
    primary: string;
    secondary: string;
    background: string;
    mode: ThemeMode;
  }) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.style.setProperty("--primary-color", opts.primary);
    root.style.setProperty("--secondary-color", opts.secondary);
    root.style.setProperty("--background-color", opts.background);

    root.setAttribute("data-theme", opts.mode === "dark" ? "dark" : "light");
  }

  // --------------------------- handle save ---------------------------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You are not signed in.");
        setSaving(false);
        return;
      }

      // simple sanitise / fallback
      const logo = logoUrl.trim() || "/logo.png";
      const primary = primaryColor.trim() || "#ef4444";
      const secondary = secondaryColor.trim() || "#f97316";
      const bg = backgroundColor.trim() || "#fffdf3";
      const mode: ThemeMode = themeMode || "light";

      // 🔹 INSERT a new row (history log). No `id` and no upsert.
      const { error } = await supabase.from("branding_settings").insert({
        logo_url: logo,
        primary_color: primary,
        secondary_color: secondary,
        background_color: bg,
        theme_mode: mode,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // update CSS for current session without reload
      applyCssVars({
        logoUrl: logo,
        primary,
        secondary,
        background: bg,
        mode,
      });
      setPreviewLogo(logo);
      setSuccess("Branding settings saved.");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Failed to save branding settings.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        Loading branding settings…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex justify-center items-start py-10"
      style={{ background: "var(--background-color, #fffdf3)" }}
    >
      <div className="w-full max-w-5xl rounded-3xl bg-white/90 backdrop-blur-xl border border-neutral-200 shadow-xl p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/super_admin"
              className="text-sm text-neutral-500 hover:text-neutral-800"
            >
              ← Back to Super Admin
            </Link>
            <h1 className="text-2xl font-bold">
              Branding &amp; Theme Settings
            </h1>
          </div>
          <Image
            src={previewLogo || "/logo.png"}
            alt="Logo preview"
            width={40}
            height={40}
            className="h-10 w-auto rounded-md border border-neutral-200 bg-white object-contain"
          />
        </header>

        <p className="text-sm text-neutral-600 mb-6">
          Only Super Admin accounts can modify the global logo, colors and theme
          of the Web-Based Boxing Coach.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1">
              Logo URL
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="/logo.png or https://…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Public path or URL to the logo image (PNG / JPG / SVG).
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-neutral-500">Preview:</span>
              <div className="h-10 w-10 rounded-md border border-neutral-200 bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewLogo || logoUrl || "/logo.png"}
                  alt="Logo preview"
                  className="max-h-8 max-w-8 object-contain"
                  onError={() => setPreviewLogo("/logo.png")}
                />
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-full rounded-md border border-neutral-300 p-1"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Used for main buttons and highlights.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-800 mb-1">
                Secondary Color
              </label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-full rounded-md border border-neutral-300 p-1"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Used for accent elements (tags, charts, etc.).
              </p>
            </div>
          </div>

          {/* Background */}
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1">
              Background Color
            </label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 p-1"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Global app background. This will be mapped to{" "}
              <code className="bg-neutral-100 px-1 rounded">
                --background-color
              </code>{" "}
              in CSS.
            </p>
          </div>

          {/* Theme mode */}
          <div>
            <label className="block text-sm font-medium text-neutral-800 mb-1">
              Theme Mode
            </label>
            <select
              value={themeMode}
              onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Controls whether the app uses light or dark foreground text. The{" "}
              <code className="bg-neutral-100 px-1 rounded">data-theme</code>{" "}
              attribute is updated automatically.
            </p>
          </div>

          {/* Save */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
