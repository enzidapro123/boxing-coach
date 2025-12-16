// app/lib/passwordHistory.ts
import { supabase } from "@/app/lib/supabaseClient";
import bcrypt from "bcryptjs";

/**
 * Log a new password into password_history.
 * We store a bcrypt hash, never the plain password.
 */
export async function logPasswordHistory(
  userId: string,
  plainPassword: string
) {
  try {
    if (!userId || !plainPassword) return;

    // Hash on the client before sending to DB
    const salt = bcrypt.genSaltSync(10);
    const pwHash = bcrypt.hashSync(plainPassword, salt);

    const { error } = await supabase.from("password_history").insert({
      user_id: userId,
      pw_hash: pwHash,
      // created_at will use default now() if you set it in Supabase,
      // otherwise you can send it explicitly:
      // created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("password_history insert error:", error.message);
    }
  } catch (err) {
    console.error("Failed to log password history:", err);
  }
}
