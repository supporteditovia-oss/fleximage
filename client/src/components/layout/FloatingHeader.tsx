import * as React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Coins } from "lucide-react";

interface FloatingHeaderProps {
  variant?: "landing" | "app";
}

export default function FloatingHeader({ variant = "landing" }: FloatingHeaderProps) {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 30);

      if (isMobile) {
        if (currentY > lastScrollY.current && currentY > 60) {
          setHidden(true);
        } else if (currentY < lastScrollY.current) {
          setHidden(false);
        }
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
    <div className={`fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none transition-all duration-300 ${
      hidden ? "-translate-y-24 opacity-0" : "translate-y-0 opacity-100"
    }`}>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`bg-white/80 backdrop-blur-xl border border-border/50 pointer-events-auto flex items-center justify-between rounded-full w-full shadow-xl shadow-black/5 transition-all duration-300 ${
          scrolled ? "max-w-[92%] md:max-w-[37%] px-4 py-1.5 opacity-90" : "max-w-[92%] md:max-w-[40%] px-5 py-2.5 md:px-6 md:py-3"
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
                    className="rounded-full px-5 font-semibold border-0 shadow-none active:scale-95 transition-transform bg-gradient-to-r from-primary to-secondary hover:opacity-90"
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
