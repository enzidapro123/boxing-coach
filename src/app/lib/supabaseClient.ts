import {
  createClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

export const SUPABASE_STORAGE_KEY = "bp_auth";
export const REMEMBER_KEY = "rememberMe";

/**
 * Custom storage adapter that dynamically chooses between
 * sessionStorage and localStorage depending on "remember me".
 */
const smartStorage: Storage = {
  get length() {
    const store = pickStore();
    return store?.length ?? 0;
  },
  clear() {
    const store = pickStore();
    store?.clear();
  },
  getItem(key: string): string | null {
    const store = pickStore();
    return store ? store.getItem(key) : null;
  },
  key(index: number): string | null {
    const store = pickStore();
    return store ? store.key(index) : null;
  },
  removeItem(key: string): void {
    const store = pickStore();
    store?.removeItem(key);
  },
  setItem(key: string, value: string): void {
    const store = pickStore();
    store?.setItem(key, value);
  },
};

function pickStore(): Storage | null {
  if (typeof window === "undefined") return null;
  const remember = localStorage.getItem(REMEMBER_KEY) === "true";
  return remember ? window.localStorage : window.sessionStorage;
}

// Define options type for clarity
const options: SupabaseClientOptions<"public"> = {
  auth: {
    storage: smartStorage,
    storageKey: SUPABASE_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  options
);
