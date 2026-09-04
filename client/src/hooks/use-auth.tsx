import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AUTH_CONFIG } from "@/config/auth";
import { DEFAULT_LOCALE, type AppLocale } from "@shared/locales";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  preferred_locale: AppLocale;
  role: "user" | "admin";
  is_subscriber: boolean;
  has_accepted_terms: boolean;
  credits: number;
  generation_count: number;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT_MS = 4000;
const PROFILE_TIMEOUT_MS = 3500;

function fallbackProfile(user: User): Profile {
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: null,
    preferred_locale: DEFAULT_LOCALE,
    role: "user",
    is_subscriber: false,
    has_accepted_terms: false,
    credits: 0,
    generation_count: 0,
    stripe_customer_id: null,
    stripe_subscription_id: null,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    void withTimeout(
      supabase.auth.getSession().then(({ data: { session: s } }) => s),
      SESSION_TIMEOUT_MS,
      null,
    ).then((s) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsLoadingSession(false);

        if (event === "PASSWORD_RECOVERY") {
          sessionStorage.setItem("luxeflexia:password_recovery", "1");
          if (!window.location.pathname.startsWith("/reset-password")) {
            window.location.replace("/reset-password");
            return;
          }
        }

        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem("luxeflexia:password_recovery");
          queryClient.clear();
          window.location.href = AUTH_CONFIG.LOGIN_PATH;
        }

        if (nextSession?.user) {
          void supabase
            .from("profiles")
            .update({ last_active_at: new Date().toISOString() })
            .eq("id", nextSession.user.id)
            .then(({ error }) => {
              if (error) console.error("Error updating last active:", error);
            });
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const { data: profile, isLoading: isLoadingProfile } =
    useQuery<Profile | null>({
      queryKey: ["profile", user?.id],
      queryFn: async () => {
        if (!user) return null;

        const result = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.warn(
                  "Profile not found in database, might be still creating...",
                  error,
                );
                return fallbackProfile(user);
              }
              return data as Profile;
            }),
          PROFILE_TIMEOUT_MS,
          fallbackProfile(user),
        );

        return result;
      },
      enabled: !!user,
      staleTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    });

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  const resolvedProfile = profile ?? (user ? fallbackProfile(user) : null);
  const isAdmin = resolvedProfile?.role === "admin";

  // Session only blocks the shell. Profile has a hard timeout + fallback
  // so reconnect never spins forever waiting on Supabase.
  const value = {
    session,
    user,
    profile: resolvedProfile,
    isLoading: isLoadingSession || (!!user && isLoadingProfile && !profile),
    isAdmin,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
