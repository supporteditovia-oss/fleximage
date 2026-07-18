import * as React from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import AdminPage from "@/pages/Admin";
import AdminTemplates from "@/pages/AdminTemplates";
import AdminLogs from "@/pages/AdminLogs";
import AdminStudio from "@/pages/AdminStudio";
import Generate from "@/pages/Generate";
import WelcomeLoader from "@/pages/WelcomeLoader";
import ImagePrete from "@/pages/ImagePrete";
import FaceCapture from "@/pages/FaceCapture";
import Historique from "@/pages/Historique";
import Resultat from "@/pages/Resultat";
import Settings from "@/pages/Settings";
import { SnapPixelProvider } from "@/components/analytics/SnapPixelProvider";
import MentionsLegales from "@/pages/MentionsLegales";
import CGU from "@/pages/CGU";
import CGV from "@/pages/CGV";
import Confidentialite from "@/pages/Confidentialite";
import DebugGenerate from "@/pages/DebugGenerate";
import { supabase } from "@/lib/supabase";

import { Loader2 } from "lucide-react";
import { AUTH_CONFIG } from "@/config/auth";
import { useTranslation } from "react-i18next";
import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  resolvePreferredLocale,
  SIGNUP_LOCALE_STORAGE_KEY,
} from "@shared/locales";
import { isIndexableSitePath } from "@shared/site-seo";
import { setRobotsMeta } from "@/lib/robots-meta";

// OAuth callback — consumes ?code= (PKCE) or hash tokens, then goes to /generate
function AuthCallback() {
  const { user, isLoading } = useAuth();
  const [bootstrapping, setBootstrapping] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const search = new URLSearchParams(window.location.search);
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && import.meta.env.DEV) {
          console.warn("[auth] exchangeCodeForSession:", error.message);
        }
        window.history.replaceState({}, "", "/app");
      }
      // Ensure session state is refreshed after OAuth return
      await supabase.auth.getSession();
      if (!cancelled) setBootstrapping(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || bootstrapping) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Redirect to={user ? AUTH_CONFIG.REDIRECT_PATH : AUTH_CONFIG.LOGIN_PATH} />
  );
}

function ProtectedAppRoutes() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const pathname = location.split("?")[0] || location;

  React.useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = AUTH_CONFIG.LOGIN_PATH;
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (pathname === "/welcome") {
    return <WelcomeLoader />;
  }

  return (
    <AppLayout>
      <ErrorBoundary>
        <Switch>
          <Route path="/generate" component={Generate} />
          <Route path="/image-prete" component={ImagePrete} />
          <Route path="/face-capture" component={FaceCapture} />
          <Route path="/debug-generate" component={DebugGenerate} />
          <Route path="/resultat" component={Resultat} />
          <Route path="/mon-resultat">
            <Redirect to="/resultat" />
          </Route>
          <Route path="/historique" component={Historique} />
          <Route path="/history">
            <Redirect to="/historique" />
          </Route>
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/users" component={AdminPage} />
          <Route path="/admin/templates" component={AdminTemplates} />
          <Route path="/admin/logs" component={AdminLogs} />
          <Route path="/admin/studio" component={AdminStudio} />
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </AppLayout>
  );
}

const PAGE_TITLE_KEYS: Record<string, string> = {
  "/": "meta:titles.home",
  "/login": "meta:titles.login",
  "/register": "meta:titles.register",
  "/welcome": "Bienvenue — LuxeFlexIA",
  "/generate": "meta:titles.generate",
  "/image-prete": "Ton image est prête — LuxeFlexIA",
  "/resultat": "Ton résultat — LuxeFlexIA",
  "/historique": "Historique — LuxeFlexIA",
  "/history": "meta:titles.history",
  "/settings": "meta:titles.settings",
  "/admin": "meta:titles.admin",
  "/admin/users": "meta:titles.adminUsers",
  "/admin/templates": "meta:titles.adminTemplates",
  "/admin/logs": "meta:titles.adminLogs",
  "/admin/studio": "Studio",
  "/mentions-legales": "meta:titles.legal",
  "/cgu": "meta:titles.cgu",
  "/cgv": "meta:titles.cgv",
  "/confidentialite": "meta:titles.privacy",
};

const PROTECTED_PATHS = new Set([
  "/welcome",
  "/generate",
  "/image-prete",
  "/face-capture",
  "/debug-generate",
  "/resultat",
  "/mon-resultat",
  "/historique",
  "/history",
  "/settings",
  "/admin",
  "/admin/users",
  "/admin/templates",
  "/admin/logs",
  "/admin/studio",
]);

function Router() {
  const { user, profile } = useAuth();
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  const pathname = location.split("?")[0] || location;

  React.useEffect(() => {
    if (!user || !profile) {
      return;
    }

    const pendingSignupLocale = window.localStorage.getItem(
      SIGNUP_LOCALE_STORAGE_KEY,
    );

    if (!pendingSignupLocale) {
      return;
    }

    const signupLocale = resolvePreferredLocale(
      pendingSignupLocale,
      DEFAULT_LOCALE,
    );
    const currentProfileLocale = resolvePreferredLocale(
      profile.preferred_locale,
      DEFAULT_LOCALE,
    );

    if (signupLocale === currentProfileLocale) {
      window.localStorage.removeItem(SIGNUP_LOCALE_STORAGE_KEY);
      return;
    }

    let isActive = true;

    const syncSignupLocaleToProfile = async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          preferred_locale: signupLocale,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error || !isActive) {
        return;
      }

      window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, signupLocale);
      window.localStorage.removeItem(SIGNUP_LOCALE_STORAGE_KEY);

      if (signupLocale !== i18n.resolvedLanguage) {
        void i18n.changeLanguage(signupLocale);
      }

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    };

    void syncSignupLocaleToProfile();

    return () => {
      isActive = false;
    };
  }, [i18n, profile?.preferred_locale, user?.id]);

  React.useEffect(() => {
    if (!user || !profile?.preferred_locale) {
      return;
    }

    const preferredLocale = resolvePreferredLocale(
      profile.preferred_locale,
      DEFAULT_LOCALE,
    );

    if (preferredLocale !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(preferredLocale);
    }

    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, preferredLocale);
  }, [i18n, profile?.preferred_locale, user]);

  React.useEffect(() => {
    document.title = t(PAGE_TITLE_KEYS[pathname] || "meta:appName");
    setRobotsMeta(
      isIndexableSitePath(pathname)
        ? "index, follow, max-image-preview:large"
        : "noindex, nofollow",
    );
  }, [pathname, t]);

  if (PROTECTED_PATHS.has(pathname)) {
    return <ProtectedAppRoutes />;
  }

  return (
    <Switch>
      {/* Public Routes */}
      <Route path={AUTH_CONFIG.LANDING_PATH} component={Landing} />
      <Route path="/mentions-legales" component={MentionsLegales} />
      <Route path="/cgu" component={CGU} />
      <Route path="/cgv" component={CGV} />
      <Route path="/confidentialite" component={Confidentialite} />

      <Route path={AUTH_CONFIG.LOGIN_PATH}>
        {user ? <Redirect to={AUTH_CONFIG.REDIRECT_PATH} /> : <AuthPage />}
      </Route>
      <Route path={AUTH_CONFIG.REGISTER_PATH}>
        {user ? <Redirect to={AUTH_CONFIG.REDIRECT_PATH} /> : <AuthPage />}
      </Route>

      {/* OAuth callback + redirect */}
      <Route path="/app">
        <AuthCallback />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SnapPixelProvider />
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
