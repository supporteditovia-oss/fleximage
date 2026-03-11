import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { TermsGuard } from "./TermsGuard";
import { BottomDock } from "./BottomDock";
import { Coins } from "lucide-react";

function SubscriptionGuard() {
  const { profile, isLoading, signOut } = useAuth();

  if (isLoading) return null;
  if (!profile) return null;
  if (profile.role === "admin") return null;
  if (profile.is_subscriber) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 text-foreground">
      <div className="bg-card border shadow-lg max-w-lg w-full p-6 rounded-lg space-y-4">
        <h2 className="text-xl font-bold">Abonnement requis</h2>
        <p className="text-muted-foreground text-sm">
          Un abonnement actif est nécessaire pour accéder à l'application.
          Veuillez souscrire à un abonnement pour continuer.
        </p>
        <div className="flex justify-end pt-2">
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

function StickyHeader() {
  const { profile } = useAuth();

  return (
    <div className="sticky top-0 z-40 flex justify-center px-4 pt-4 pb-2 bg-[#F4F4F4]">
      <header className="bg-background/80 backdrop-blur-xl border border-border/50 flex items-center justify-between px-6 py-3 rounded-full w-full md:max-w-[60%] shadow-xl shadow-black/5">
        <Link href="/generate" className="hover:scale-105 transition-transform">
          <span
            className="inline-block text-xl font-extrabold tracking-tight select-none"
            style={{
              WebkitTextStroke: "1.5px black",
              paintOrder: "stroke fill",
            }}
          >
            <span className="text-secondary">Turbo</span>
            <span className="text-primary">Prank</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span>{profile?.credits ?? 0}</span>
        </div>
      </header>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F4F4F4]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Chargement de la plateforme...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F4F4F4]">
      <TermsGuard />
      <StickyHeader />
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-28">
        <div className="mx-auto max-w-full md:max-w-[60vw] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
      <BottomDock />
    </div>
  );
}
