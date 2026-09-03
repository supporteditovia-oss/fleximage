import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").toString().trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "")
  .toString()
  .trim();

const looksLikePlaceholder =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes("your-project-ref") ||
  supabaseAnonKey.includes("your_supabase");

if (looksLikePlaceholder) {
  console.error(
    "CRITICAL: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing or still placeholders. Google OAuth will fail.",
  );
}

export const isSupabaseConfigured = !looksLikePlaceholder;

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
