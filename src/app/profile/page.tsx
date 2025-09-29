"use client";

import { useEffect, useRef, useState } from "react";
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
    if (error) {
      setErr(error.message);
    } else {
      setMsg("Profile updated!");
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setErr(null);
    setMsg("Uploading avatar…");

    const fileExt = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setMsg(null);
      setErr(uploadErr.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setMsg("Avatar uploaded. Don’t forget to Save.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Nav */}
      <header className="fixed top-0 w-full bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">🥊</div>
            <span className="text-xl font-bold">BlazePose Coach</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/training" className="text-gray-300 hover:text-white">Training</a>
            <a href="/history" className="text-gray-300 hover:text-white">History</a>
            <a href="/profile" className="text-white font-semibold">Profile</a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

            <form onSubmit={onSave} className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-2xl font-bold">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{username?.[0]?.toUpperCase() ?? "U"}</span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={onPickFile}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg transition"
                  >
                    Upload Avatar
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUpload}
                  />
                </div>
              </div>

              {/* Email (read only) */}
              <div>
                <label className="block text-sm mb-1 text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-gray-300"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm mb-1 text-gray-300">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-600"
                  minLength={3}
                  required
                />
              </div>

              {/* Save + Security */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>

                <a
                  href="/forgot-password"
                  className="text-sm text-gray-300 hover:text-white underline"
                >
                  Reset password
                </a>

                <button
                  type="button"
                  onClick={signOut}
                  className="ml-auto bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg transition"
                >
                  Sign out
                </button>
              </div>

              {msg && <p className="text-sm text-emerald-300">{msg}</p>}
              {err && <p className="text-sm text-red-300">{err}</p>}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
