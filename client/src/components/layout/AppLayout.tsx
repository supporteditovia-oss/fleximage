import { useAuth } from "@/hooks/use-auth";
import { BottomDock } from "./BottomDock";
import FloatingHeader from "@/components/layout/FloatingHeader";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();
  const isStudioPage = location === "/admin/studio";

  if (isLoading) {
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
    <div className="luxeflexia-app flex min-h-screen w-full flex-col bg-[var(--lx-surface)] text-[var(--lx-ink)]">
      <FloatingHeader variant="app" />
      <main
        className={
          isStudioPage
            ? "flex-1 px-4 md:px-8 pt-4 pb-28"
            : "flex-1 px-4 md:px-8 pt-20 pb-28"
        }
      >
        <div className="mx-auto max-w-full md:max-w-[60vw]">
          {children}
        </div>
      </main>
      <BottomDock />
    </div>
  );
}

