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
import LandingGate from "@/pages/LandingGate";
import AuthPage from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import AdminPage from "@/pages/Admin";
import AdminTemplates from "@/pages/AdminTemplates";
import AdminLogs from "@/pages/AdminLogs";
import AdminStudio from "@/pages/AdminStudio";
import AdminFunnel from "@/pages/AdminFunnel";
import AdminCommandCenter from "@/pages/AdminCommandCenter";
import Generate from "@/pages/Generate";
import Create from "@/pages/Create";
import Modeles from "@/pages/Modeles";
import WelcomeLoader from "@/pages/WelcomeLoader";
import ImagePrete from "@/pages/ImagePrete";
import Historique from "@/pages/Historique";
import Bibliotheque from "@/pages/Bibliotheque";
import Resultat from "@/pages/Resultat";
import Settings from "@/pages/Settings";
import { SnapPixelProvider } from "@/components/analytics/SnapPixelProvider";
import MentionsLegales from "@/pages/MentionsLegales";
import CGU from "@/pages/CGU";
import CGV from "@/pages/CGV";
import Confidentialite from "@/pages/Confidentialite";
import DebugGenerate from "@/pages/DebugGenerate";
import SeoNicheLanding from "@/pages/SeoNicheLanding";
import TousLesGenerateurs from "@/pages/TousLesGenerateurs";
import ZeroCreditsPreview from "@/pages/ZeroCreditsPreview";
import { readStudioMode, type StudioMode } from "@/lib/v2-experience";
import { useV2Access } from "@/hooks/use-v2-access";
import { supabase } from "@/lib/supabase";
import { AuthResolveShell } from "@/components/v2/AuthResolveShell";

import { Loader2 } from "lucide-react";
import { AUTH_CONFIG } from "@/config/auth";
import { useTranslation } from "react-i18next";
import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  resolvePreferredLocale,
  SIGNUP_LOCALE_STORAGE_KEY,
  toUiLocale,
} from "@shared/locales";
import { isIndexableSitePath } from "@shared/site-seo";
import { parseSeoNicheSlugFromPath } from "@shared/seo-niches";
import { setRobotsMeta } from "@/lib/robots-meta";
import { applyLocaleFromSearch, readLocaleFromSearch } from "@/i18n";

// OAuth callback — consumes ?code= (PKCE) or hash tokens, then goes to /welcome
function AuthCallback() {
  const { user, isLoading } = useAuth();
  const [bootstrapping, setBootstrapping] = React.useState(true);
  const localeFromUrl = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("lang");
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const hardStop = window.setTimeout(() => {
      if (!cancelled) setBootstrapping(false);
    }, 5000);

    const run = async () => {
      try {
        const search = new URLSearchParams(window.location.search);
        const code = search.get("code");
        const type =
          search.get("type") ||
          new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
            "type",
          );
        if (type === "recovery") {
          const qs = window.location.search || "";
          const hash = window.location.hash || "";
          window.location.replace(`/reset-password${qs}${hash}`);
          return;
        }
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error && import.meta.env.DEV) {
            console.warn("[auth] exchangeCodeForSession:", error.message);
          }
          const lang = search.get("lang");
          window.history.replaceState(
            {},
            "",
            lang ? `/app?lang=${encodeURIComponent(lang)}` : "/app",
          );
        }
        await supabase.auth.getSession();
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
      window.clearTimeout(hardStop);
    };
  }, []);

  // Ne pas attendre le profil indéfiniment après OAuth.
  if (bootstrapping || (isLoading && !user)) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center"
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const welcomePath = localeFromUrl
    ? `${AUTH_CONFIG.REDIRECT_PATH}?lang=${encodeURIComponent(localeFromUrl)}`
    : AUTH_CONFIG.REDIRECT_PATH;

  return (
    <Redirect to={user ? welcomePath : AUTH_CONFIG.LOGIN_PATH} />
  );
}

function useV2GateWithTimeout(maxMs = 2500) {
  const { v2Enabled, isLoading } = useV2Access();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), maxMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, maxMs]);

  return {
    v2Enabled: timedOut ? false : v2Enabled,
    isLoading: isLoading && !timedOut,
  };
}

function GenerateRoute() {
  const { v2Enabled, isLoading } = useV2GateWithTimeout();
  if (isLoading) return <AuthResolveShell />;
  if (v2Enabled) {
    return <Redirect to="/create" />;
  }
  return <Generate />;
}

function HistoriqueRoute() {
  const { v2Enabled, isLoading } = useV2GateWithTimeout();
  const [studioMode, setStudioMode] = React.useState<StudioMode>(() =>
    readStudioMode(),
  );

  React.useEffect(() => {
    const sync = () => setStudioMode(readStudioMode());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("luxeflexia:studio-mode", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("luxeflexia:studio-mode", sync);
    };
  }, []);

  if (isLoading) return <AuthResolveShell />;
  // Voix IA : l'onglet mène au catalogue des voix, pas à l'historique images.
  if (v2Enabled && studioMode === "voice") {
    return <Redirect to="/bibliotheque" />;
  }
  return <Historique />;
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

  // Filet de sécurité : si le profil traîne, on laisse quand même passer.
  const [shellTimedOut, setShellTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (!isLoading) {
      setShellTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setShellTimedOut(true), 4000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && !shellTimedOut) {
    return (
      <div
        className="flex h-screen w-full items-center justify-center"
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
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
          <Route path="/create" component={Create} />
          <Route path="/modeles" component={Modeles} />
          <Route path="/bibliotheque" component={Bibliotheque} />
          <Route path="/generate" component={GenerateRoute} />
          <Route path="/image-prete" component={ImagePrete} />
          <Route path="/debug-generate" component={DebugGenerate} />
          <Route path="/resultat" component={Resultat} />
          <Route path="/mon-resultat">
            <Redirect to="/resultat" />
          </Route>
          <Route path="/historique" component={HistoriqueRoute} />
          <Route path="/history">
            <Redirect to="/historique" />
          </Route>
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/users" component={AdminPage} />
          <Route path="/admin/funnel" component={AdminFunnel} />
          <Route path="/admin/hq" component={AdminCommandCenter} />
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
  "/welcome": "meta:titles.welcome",
  "/generate": "meta:titles.generate",
  "/create": "Studio — LuxeFlexIA",
  "/modeles": "Modèles — LuxeFlexIA",
  "/image-prete": "meta:titles.imageReady",
  "/resultat": "meta:titles.result",
  "/historique": "meta:titles.history",
  "/bibliotheque": "Bibliothèque — LuxeFlexIA",
  "/history": "meta:titles.history",
  "/settings": "meta:titles.settings",
  "/admin": "meta:titles.admin",
  "/admin/users": "meta:titles.adminUsers",
  "/admin/funnel": "Funnel — LuxeFlexIA",
  "/admin/hq": "HQ — LuxeFlexIA",
  "/admin/templates": "meta:titles.adminTemplates",
  "/admin/logs": "meta:titles.adminLogs",
  "/admin/studio": "Studio",
  "/mentions-legales": "meta:titles.legal",
  "/cgu": "meta:titles.cgu",
  "/cgv": "meta:titles.cgv",
  "/confidentialite": "meta:titles.privacy",
  "/pricing": "meta:titles.pricing",
};

const PROTECTED_PATHS = new Set([
  "/welcome",
  "/generate",
  "/create",
  "/modeles",
  "/image-prete",
  "/debug-generate",
  "/resultat",
  "/mon-resultat",
  "/historique",
  "/bibliotheque",
  "/history",
  "/settings",
  "/admin",
  "/admin/users",
  "/admin/funnel",
  "/admin/hq",
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
    applyLocaleFromSearch(window.location.search);
  }, [pathname]);

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

    const signupLocale = toUiLocale(
      resolvePreferredLocale(pendingSignupLocale, DEFAULT_LOCALE),
    );
    const currentProfileLocale = toUiLocale(
      resolvePreferredLocale(profile.preferred_locale, DEFAULT_LOCALE),
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

    const preferredLocale = toUiLocale(
      resolvePreferredLocale(profile.preferred_locale, DEFAULT_LOCALE),
    );

    if (typeof window !== "undefined" && readLocaleFromSearch()) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIGNUP_LOCALE_STORAGE_KEY)
    ) {
      return;
    }

    const localeChosen =
      typeof window !== "undefined" &&
      window.localStorage.getItem("luxeflexia:locale_chosen");

    // Flag / first-visit detection must not be overwritten by a default FR profile.
    if (localeChosen) {
      return;
    }

    if (preferredLocale !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(preferredLocale);
    }

    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, preferredLocale);
  }, [i18n, profile?.preferred_locale, user]);

  React.useEffect(() => {
    // Niche / directory pages manage their own document title + description.
    if (
      pathname === "/tous-les-generateurs" ||
      parseSeoNicheSlugFromPath(pathname)
    ) {
      setRobotsMeta("index, follow, max-image-preview:large");
      return;
    }

    document.title = t(PAGE_TITLE_KEYS[pathname] || "meta:appName");
    if (pathname === "/") {
      const description = t("meta:descriptions.home");
      const desc = document.querySelector('meta[name="description"]');
      if (desc instanceof HTMLMetaElement) desc.content = description;
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc instanceof HTMLMetaElement) ogDesc.content = description;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle instanceof HTMLMetaElement) ogTitle.content = document.title;
    }
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
      <Route path={AUTH_CONFIG.LANDING_PATH} component={LandingGate} />
      <Route path="/pricing" component={LandingGate} />
      <Route path="/tous-les-generateurs" component={TousLesGenerateurs} />
      <Route path="/generateur/:slug" component={SeoNicheLanding} />
      <Route path="/mentions-legales" component={MentionsLegales} />
      <Route path="/cgu" component={CGU} />
      <Route path="/cgv" component={CGV} />
      <Route path="/confidentialite" component={Confidentialite} />
      <Route path="/preview/zero-credits" component={ZeroCreditsPreview} />

      <Route path="/reset-password" component={ResetPassword} />

      <Route path={AUTH_CONFIG.LOGIN_PATH}>
        {typeof window !== "undefined" &&
        sessionStorage.getItem("luxeflexia:password_recovery") === "1" ? (
          <Redirect to="/reset-password" />
        ) : user ? (
          <Redirect to={AUTH_CONFIG.REDIRECT_PATH} />
        ) : (
          <AuthPage />
        )}
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
