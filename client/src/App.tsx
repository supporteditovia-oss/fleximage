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
import Generate from "@/pages/Generate";
import PrankHistory from "@/pages/PrankHistory";
import Settings from "@/pages/Settings";
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

// OAuth callback handler — waits for Supabase to parse the hash fragment
function AuthCallback() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
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

// Protected Route Wrapper
function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();

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

  return (
    <AppLayout>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </AppLayout>
  );
}

const PAGE_TITLE_KEYS: Record<string, string> = {
  "/": "meta:titles.home",
  "/login": "meta:titles.login",
  "/register": "meta:titles.register",
  "/generate": "meta:titles.generate",
  "/history": "meta:titles.history",
  "/settings": "meta:titles.settings",
  "/admin": "meta:titles.admin",
  "/admin/users": "meta:titles.adminUsers",
  "/admin/templates": "meta:titles.adminTemplates",
  "/mentions-legales": "meta:titles.legal",
  "/cgu": "meta:titles.cgu",
  "/cgv": "meta:titles.cgv",
  "/confidentialite": "meta:titles.privacy",
};

import { PostHogProvider, usePostHog } from "posthog-js/react";
import { posthog } from "@/lib/posthog";

function Router() {
  const { user, profile } = useAuth();
  const [location] = useLocation();
  const posthogInstance = usePostHog();
  const { t, i18n } = useTranslation();

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
    document.title = t(PAGE_TITLE_KEYS[location] || "meta:appName");
    if (posthogInstance) {
      posthogInstance.capture("$pageview");
      if (location === AUTH_CONFIG.LANDING_PATH) {
        posthogInstance.capture("landing_page_view");
      }
    }
  }, [location, posthogInstance, t]);

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

      <Route path="/generate">
        <ProtectedRoute component={Generate} />
      </Route>

      <Route path="/debug-generate">
        <ProtectedRoute component={DebugGenerate} />
      </Route>

      <Route path="/history">
        <ProtectedRoute component={PrankHistory} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminPage} />
      </Route>
      <Route path="/admin/templates">
        <ProtectedRoute component={AdminTemplates} />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
}

export default App;
