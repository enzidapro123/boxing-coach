import { createClient } from "@supabase/supabase-js";

export const SUPABASE_STORAGE_KEY = "bp_auth";
export const REMEMBER_KEY = "rememberMe";

/**
 * Chooses sessionStorage if rememberMe is false,
 * or localStorage if rememberMe is true.
 */
const smartStorage = {
  pick() {
    if (typeof window === "undefined") return null;
    const remember = localStorage.getItem(REMEMBER_KEY) === "true";
    return remember ? window.localStorage : window.sessionStorage;
  },
  getItem(key: string) {
    const store = this.pick();
    return store ? store.getItem(key) : null;
  },
  setItem(key: string, value: string) {
    const store = this.pick();
    if (store) store.setItem(key, value);
  },
  removeItem(key: string) {
    const store = this.pick();
    if (store) store.removeItem(key);
  },
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: smartStorage as any,
      storageKey: SUPABASE_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
