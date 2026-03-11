import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Coins } from "lucide-react";

interface FloatingHeaderProps {
  variant?: "landing" | "app";
}

export default function FloatingHeader({ variant = "landing" }: FloatingHeaderProps) {
  const { user, profile } = useAuth();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logoHref = variant === "app" ? "/generate" : "/";

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`bg-white/80 backdrop-blur-xl border border-border/50 pointer-events-auto flex items-center justify-between rounded-full w-full shadow-xl shadow-black/5 transition-all duration-300 ${
          scrolled ? "md:max-w-[37%] px-4 py-1.5 opacity-90" : "md:max-w-[40%] px-6 py-3"
        }`}
      >
        <div className="flex items-center gap-2">
          <Link
            href={logoHref}
            className="flex items-center gap-2 pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
          >
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
        </div>

        {variant === "app" ? (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span>{profile?.credits ?? 0}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/app">
                <Button size="sm" className="rounded-full px-5 font-semibold border-0 shadow-none active:scale-95 transition-transform">
                  App
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full hidden sm:flex text-muted-foreground hover:text-foreground"
                  >
                    Connexion
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    size="sm"
                    className="rounded-full px-5 font-semibold border-0 shadow-none active:scale-95 transition-transform"
                  >
                    Commencer
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </motion.header>
    </div>
  );
}
