// app/profile/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      await ensureProfileRow();

      const { data: profile, error } = await supabase
        .from("users")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      if (!error && profile) {
        setUsername(profile.username ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
      }
    })();
  }, [router]);

  async function ensureProfileRow() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    await supabase
      .from("users")
      .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMsg(null);
    setErr(null);

    const { error } = await supabase
      .from("users")
      .update({ username, avatar_url: avatarUrl })
      .eq("id", userId);

    setSaving(false);
    if (error) setErr(error.message);
    else setMsg("Profile updated!");
  };

  const onPickFile = () => fileRef.current?.click();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      setErr("Please upload an image file (PNG/JPG).");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("File too large (max 5MB).");
      e.target.value = "";
      return;
    }

    setErr(null);
    setMsg("Uploading avatar…");

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });

    if (uploadErr) {
      setMsg(null);
      setErr(uploadErr.message);
      e.target.value = "";
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    const { error: updErr } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updErr) {
      setMsg(null);
      setErr(updErr.message);
    } else {
      setAvatarUrl(publicUrl);
      setMsg("Avatar uploaded. Don’t forget to Save.");
    }

    e.target.value = "";
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* Floating soft orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Left section: icon + back button */}
          <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center hover:opacity-80 transition">
            <img src="/logo.png" alt="Logo" className="h-11 w-auto" />
          </Link>

            <Link
              href="/dashboard" 
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-red-500/30 hover:scale-[1.03] transition"
              prefetch
            >
              Back to Dashboard
            </Link>
          </div>

          <h1 className="text-xl font-bold text-neutral-900">Profile</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="px-6 pt-10 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 text-xs font-semibold text-red-700">
              Account
            </div>
            <h1 className="mt-3 text-4xl font-bold">Your profile</h1>
            <p className="mt-2 text-neutral-600">
              Manage your avatar, username, and security.
            </p>
          </div>

          {/* Card */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-300/30 to-orange-300/30 blur-3xl" />
            <div className="relative rounded-3xl border border-red-100/80 bg-white/85 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-red-500/10">
              <form onSubmit={onSave} className="space-y-8">
                {/* Avatar upload */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-orange-500 grid place-items-center text-2xl font-bold text-white shadow-lg shadow-red-500/30">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{username?.[0]?.toUpperCase() ?? "U"}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onPickFile}
                      className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 font-semibold hover:bg-neutral-50 transition"
                    >
                      Upload avatar
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={onUpload}
                    />
                    <span className="text-xs text-neutral-500">
                      PNG/JPG up to 5MB
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-700"
                  />
                </div>

                {/* Username */}
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    minLength={3}
                    required
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Your display name"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/30 hover:scale-[1.02] transition disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>

                  <a
                    href="/forgot-password"
                    className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-4"
                  >
                    Reset password
                  </a>

                  <button
                    type="button"
                    onClick={signOut}
                    className="ml-auto rounded-full border border-neutral-200 bg-white px-5 py-2.5 font-semibold hover:bg-neutral-50 transition"
                  >
                    Sign out
                  </button>
                </div>

                {/* Alerts */}
                {msg && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {msg}
                  </div>
                )}
                {err && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {err}
                  </div>
                )}
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-neutral-500 mt-10">
            © 2025 BlazePose Coach. Train smarter.
          </p>
        </div>
      </main>
    </div>
  );
}
