import { useAuth } from "@/hooks/use-auth";
import { BottomDock } from "./BottomDock";
import FloatingHeader from "@/components/layout/FloatingHeader";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { APP_SCROLL_ID } from "@/lib/app-scroll";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();
  const pathname = location.split("?")[0] || location;
  const isWideStudioPage = pathname === "/bibliotheque";

  useEffect(() => {
    document.documentElement.classList.add("luxeflexia-app-shell");
    return () => document.documentElement.classList.remove("luxeflexia-app-shell");
  }, []);

  if (isAuthLoading && !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--lx-surface)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--lx-gold)] border-t-transparent" />
          <p className="font-medium animate-pulse text-[var(--lx-muted)]">
            {t("layout.loadingPlatform")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="luxeflexia-app fixed inset-0 flex w-full flex-col overflow-hidden bg-[var(--lx-surface)] text-[var(--lx-ink)]"
      data-route={pathname === "/create" ? "create" : undefined}
    >
      <FloatingHeader variant="app" />
      <main
        id={APP_SCROLL_ID}
        className="luxeflexia-app-scroll flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-28 pt-[calc(var(--lx-app-header-h)+0.35rem)] md:px-8"
      >
        <div
          className={
            isWideStudioPage
              ? "mx-auto max-w-full md:max-w-6xl"
              : "mx-auto max-w-full md:max-w-[60vw]"
          }
        >
          {children}
        </div>
      </main>
      <BottomDock />
    </div>
  );
}

