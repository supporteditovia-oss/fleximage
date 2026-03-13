import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingHeaderProps {
  variant?: "landing" | "app";
}

export default function FloatingHeader({ variant = "landing" }: FloatingHeaderProps) {
  const { user, profile, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [hidden, setHidden] = React.useState(false);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setHidden(true);
      } else if (currentY < lastScrollY.current) {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  // Hide header when virtual keyboard opens on mobile
  React.useEffect(() => {
    if (!isMobile || !window.visualViewport) return;

    const vv = window.visualViewport;
    const onResize = () => {
      const keyboardOpen = vv.height < window.innerHeight * 0.75;
      setHidden(keyboardOpen);
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [isMobile]);

  const logoHref = variant === "app" ? "/generate" : "/";

  return (
    <div className={`floating-header fixed top-6 left-0 right-0 z-50 px-5 md:px-8 pointer-events-none transition-all duration-300 ${
      hidden ? "-translate-y-24 opacity-0" : "translate-y-0 opacity-100"
    }`}>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative flex items-center justify-center w-full"
      >
        {/* Logo — centered */}
        <Link
          href={logoHref}
          className="pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src="/assets/turboprank.png" alt="TurboPrank" className="h-10 md:h-16 object-contain" />
        </Link>

        {/* Right side */}
        {variant === "app" ? (
          <div className="absolute right-0 flex items-center gap-1.5 text-sm font-semibold text-foreground pointer-events-auto rounded-full border border-border/40 bg-card/80 backdrop-blur-xl px-3 py-1.5 shadow-lg shadow-black/10">
            <img src="/assets/jeton.png" alt="Credits" className="w-5 h-5" />
            <span>{profile?.credits ?? 0}</span>
          </div>
        ) : !isLoading && (
          <div className="absolute right-0 flex items-center gap-3 pointer-events-auto">
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
                    className="rounded-full px-3 md:px-5 text-xs md:text-sm font-semibold border-0 shadow-none active:scale-95 transition-transform bg-gradient-to-r from-primary to-secondary hover:opacity-90"
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
