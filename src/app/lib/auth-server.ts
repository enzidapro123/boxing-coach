import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type Role = "regular" | "it_admin" | "super_admin";

/** Next 15-friendly server client with a cookie adapter */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  const cookieAdapter = {
    getAll() {
      return typeof cookieStore.getAll === "function" ? cookieStore.getAll() : [];
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      if (typeof cookieStore.set === "function") {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      }
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieAdapter }
  );
}

/** Require active session or redirect to /login */
export async function requireSession() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a specific role (or one of them) or redirect to /unauthorized */
export async function requireRole(allowed: Role[]) {
  const user = await requireSession();
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("users")
    .select("user_role")
    .eq("id", user.id)
    .single();

  if (error || !data?.user_role) redirect("/unauthorized");

  const role = (data.user_role as Role);
  if (!allowed.includes(role)) redirect("/unauthorized");

  return role;
}
