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

import { Loader2 } from "lucide-react";
import { AUTH_CONFIG } from "@/config/auth";

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

const PAGE_TITLES: Record<string, string> = {
  "/": "TurboPrank — Crée des pranks personnalisés avec l'IA",
  "/login": "Connexion — TurboPrank",
  "/register": "Inscription — TurboPrank",
  "/generate": "Crée ton prank — TurboPrank",
  "/history": "Historique — TurboPrank",
  "/settings": "Paramètres — TurboPrank",
  "/admin": "Admin — TurboPrank",
  "/admin/users": "Utilisateurs — TurboPrank",
  "/admin/templates": "Templates — TurboPrank",
  "/mentions-legales": "Mentions légales — TurboPrank",
  "/cgu": "CGU — TurboPrank",
  "/cgv": "CGV — TurboPrank",
  "/confidentialite": "Politique de confidentialité — TurboPrank",
};

function Router() {
  const { user } = useAuth();
  const [location] = useLocation();

  React.useEffect(() => {
    document.title = PAGE_TITLES[location] || "TurboPrank";
  }, [location]);

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
