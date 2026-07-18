import { createClient } from "@supabase/supabase-js";

// Validation strictly on the client-side
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.error(
      "CRITICAL: Supabase environment variables are missing. Please check your .env or Replit Secrets."
    );
  }
}

// Singleton pattern for the Supabase client
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // PKCE returns to redirectTo with ?code=… (must be allowlisted in Supabase)
    flowType: "pkce",
  },
});
