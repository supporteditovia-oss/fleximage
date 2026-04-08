import { useAuth } from "@/hooks/use-auth";
import { BottomDock } from "./BottomDock";
import FloatingHeader from "@/components/layout/FloatingHeader";
import { useTranslation } from "react-i18next";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground font-medium animate-pulse">
            {t("layout.loadingPlatform")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <FloatingHeader variant="app" />
      <main className="flex-1 px-4 md:px-8 pt-20 pb-28">
        <div className="mx-auto max-w-full md:max-w-[60vw] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
      <BottomDock />
    </div>
  );
}

