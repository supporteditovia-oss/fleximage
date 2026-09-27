export const AUTH_CONFIG = {
  REDIRECT_PATH: "/welcome",
  LOGIN_PATH: "/login",
  REGISTER_PATH: "/register",
  LANDING_PATH: "/",
  /** Console produit (Supabase admin) — le CRM marketing est sur /admin */
  ADMIN_PATH: "/platform-admin",
  COOKIE_OPTIONS: {
    path: "/",
    sameSite: "Lax",
    secure: true,
  }
};
