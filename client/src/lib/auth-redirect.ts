import { AUTH_CONFIG } from "@/config/auth";

/**
 * Post-OAuth / email-confirm landing URL for Supabase Auth.
 *
 * Always prefers the live browser origin so local (localhost:5000) and
 * production each redirect to themselves. Supabase will IGNORE this and
 * fall back to Dashboard "Site URL" if the URL is not listed under
 * Authentication → URL Configuration → Redirect URLs.
 *
 * Required Redirect URLs (add in Supabase Dashboard):
 *   http://localhost:5000/**
 *   http://127.0.0.1:5000/**
 *   https://www.luxeflexia.com/**
 *   https://luxeflexia.com/**
 *   (remove obsolete https://*.replit.dev/** if present)
 */
export function getAuthRedirectTo(
  path: string = "/app",
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    let origin = window.location.origin;
    // Keep OAuth return + localStorage on the same host as production traffic
    if (origin === "https://luxeflexia.com") {
      origin = "https://www.luxeflexia.com";
    }
    return `${origin}${normalizedPath}`;
  }

  const fromEnv = (
    import.meta.env.VITE_PUBLIC_APP_URL ||
    import.meta.env.VITE_APP_URL ||
    ""
  )
    .toString()
    .trim()
    .replace(/\/$/, "");

  if (fromEnv) {
    return `${fromEnv}${normalizedPath}`;
  }

  return `http://localhost:5000${normalizedPath}`;
}

/** Final in-app destination after /app consumes the OAuth session. */
export function getPostAuthAppPath(): string {
  return AUTH_CONFIG.REDIRECT_PATH;
}
