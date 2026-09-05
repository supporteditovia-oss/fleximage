import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  ShieldCheck,
  Users,
  LogOut,
  Settings as SettingsIcon,
  Plus,
  History,
  FileText,
  ScrollText,
  Clapperboard,
  GitBranch,
  Gauge,
  Library,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useV2Access } from "@/hooks/use-v2-access";
import { getAppScrollEl, getAppScrollTop } from "@/lib/app-scroll";
import { readStudioMode, type StudioMode } from "@/lib/v2-experience";

export function BottomDock() {
  const [location] = useLocation();
  const pathname = location.split("?")[0] || location;
  const { user, profile, isAdmin, isLoading, signOut } = useAuth();
  const { v2Enabled } = useV2Access();
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const [studioMode, setStudioMode] = useState<StudioMode>(() =>
    readStudioMode(),
  );
  const lastScrollY = useRef(0);

  const adminNavItems = [
    { href: "/admin", label: t("layout.dock.adminOverview"), icon: ShieldCheck },
    { href: "/admin/hq", label: "HQ", icon: Gauge },
    { href: "/admin/funnel", label: "Funnel", icon: GitBranch },
    { href: "/admin/users", label: t("layout.dock.users"), icon: Users },
    { href: "/admin/templates", label: t("layout.dock.templates"), icon: FileText },
    { href: "/admin/studio", label: "Studio", icon: Clapperboard },
    { href: "/admin/logs", label: t("layout.dock.logs"), icon: ScrollText },
  ];

  useEffect(() => {
    const syncMode = () => setStudioMode(readStudioMode());
    syncMode();
    window.addEventListener("storage", syncMode);
    window.addEventListener("focus", syncMode);
    window.addEventListener("luxeflexia:studio-mode", syncMode);
    return () => {
      window.removeEventListener("storage", syncMode);
      window.removeEventListener("focus", syncMode);
      window.removeEventListener("luxeflexia:studio-mode", syncMode);
    };
  }, [pathname]);

  useEffect(() => {
    let maxHeight = window.innerHeight;
    let lastY = getAppScrollTop();
    const thresh = 10;

    const handleResizeOrScroll = () => {
      // Result screen: dock must stay visible (nav is the escape hatch).
      if (document.body.hasAttribute("data-larp-result-mode")) {
        setHidden(false);
        return;
      }

      const vv = window.visualViewport;
      if (!vv) return;

      const currentY = getAppScrollTop();
      const currentH = vv.height;
      if (currentH > maxHeight) maxHeight = currentH;

      // 1. Keyboard open: height drops significantly (e.g. < 80% of max seen height)
      if (currentH < maxHeight * 0.8) {
        setHidden(true);
        lastY = currentY;
        return;
      }

      // 2. Top of page: always show dock
      if (currentY <= 50) {
        setHidden(false);
        lastY = currentY;
        return;
      }

      // 3. Browser UI expanded (URL bar visible): height is significantly less than max
      // This is a very strong signal on mobile that the user scrolled up or tapped the top
      if (currentH < maxHeight - 15) {
        setHidden(false);
        lastY = currentY;
        return;
      }

      // 4. Fallback to scroll delta for desktop or when URL bar is fully collapsed
      if (currentY > lastY + thresh) {
        setHidden(true); // scrolling down
        lastY = currentY;
      } else if (currentY < lastY - thresh) {
        setHidden(false); // scrolling up
        lastY = currentY;
      }
    };

    const syncResultMode = () => {
      if (document.body.hasAttribute("data-larp-result-mode")) {
        setHidden(false);
      }
    };

    // Listen to resize and scroll on visualViewport (scroll on vv fires when UI expands/collapses usually)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResizeOrScroll);
      window.visualViewport.addEventListener("scroll", handleResizeOrScroll);
      handleResizeOrScroll();
    }

    const scrollEl = getAppScrollEl();
    scrollEl?.addEventListener("scroll", handleResizeOrScroll, { passive: true });

    const observer = new MutationObserver(syncResultMode);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-larp-result-mode"],
    });
    syncResultMode();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResizeOrScroll);
        window.visualViewport.removeEventListener("scroll", handleResizeOrScroll);
      }
      scrollEl?.removeEventListener("scroll", handleResizeOrScroll);
      observer.disconnect();
    };
  }, []);

  const isActive = (path: string) => pathname === path;
  const v2Ready = !isLoading && v2Enabled;
  const createPath = v2Ready ? "/create" : "/generate";
  const libraryPath =
    v2Ready && studioMode === "voice" ? "/bibliotheque" : "/historique";
  const libraryLabel = !v2Ready
    ? t("layout.dock.history")
    : studioMode === "voice"
      ? "Catalogue"
      : t("layout.dock.history");
  const LibraryIcon = v2Ready && studioMode === "voice" ? Library : History;

  const handleCreateClick = () => {
    if (pathname !== createPath) return;
    window.dispatchEvent(new Event("larpking:create-new-larp"));
  };

  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const dockItemClass = (active: boolean) =>
    cn(
      "group flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 min-w-[56px] md:px-3 md:py-1 md:min-w-[56px] md:gap-0.5 md:text-xs",
      active
        ? "text-[var(--lx-bronze)] scale-110"
        : "text-[var(--lx-muted)] hover:text-[var(--lx-ink)] hover:scale-105",
    );

  const dockIconClass = (active: boolean) =>
    cn(
      "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 md:w-9 md:h-9",
      active
        ? "bg-[var(--lx-gold)]/15 shadow-sm group-hover:!bg-[var(--lx-gold)]/20"
        : "group-hover:bg-[var(--lx-ink)]/5",
    );

  return createPortal(
    <div
      className={cn(
      "bottom-dock fixed bottom-0 left-0 w-full z-50 flex justify-center px-[5%] md:px-0 pb-[env(safe-area-inset-bottom)] transition-transform duration-300",
      hidden ? "translate-y-full md:translate-y-0" : "translate-y-0"
    )}
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50 }}
    >
      <nav className="w-full md:max-w-[360px] border border-[var(--lx-gold)]/30 bg-[var(--lx-surface-2)]/92 backdrop-blur-xl shadow-[0_8px_32px_rgba(18,16,14,0.12)] dock-nav">
        <div className="flex items-center justify-evenly px-4 py-2 md:px-3 md:py-2">
          {/* Historique */}
          <Link href={libraryPath} className={dockItemClass(isActive(libraryPath) || isActive("/historique") || isActive("/history"))}>
            <div className={dockIconClass(isActive(libraryPath) || isActive("/historique") || isActive("/history"))}>
              <LibraryIcon className="h-6 w-6 md:h-5 md:w-5" />
            </div>
            <span>{libraryLabel}</span>
          </Link>

          {/* Créer - center */}
          <Link
            href={createPath}
            className={dockItemClass(isActive(createPath) || isActive("/generate"))}
            onClick={handleCreateClick}
          >
            <div className={dockIconClass(isActive(createPath) || isActive("/generate"))}>
              <Plus className="h-6 w-6 md:h-5 md:w-5" />
            </div>
            <span>{t("layout.dock.create")}</span>
          </Link>

          {/* Compte */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  dockItemClass(false),
                  "text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg transition-all duration-200 group-hover:bg-[var(--lx-ink)]/5">
                  <Avatar className="h-7 w-7 md:h-6 md:w-6">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                    <AvatarFallback className="text-[10px] bg-[var(--lx-gold)]/15 text-[var(--lx-bronze)]">
                      {profile?.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span>{t("layout.dock.account")}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={12}
              className="p-1.5 rounded-lg min-w-[200px] bg-[var(--lx-surface-2)]/95 backdrop-blur-xl border border-[var(--lx-gold)]/30 shadow-[0_8px_32px_rgba(18,16,14,0.12)]"
            >
              <DropdownMenuItem
                asChild
                className="group/item rounded-lg px-3 py-2.5 cursor-pointer text-muted-foreground hover:text-foreground focus:text-foreground bg-transparent hover:bg-transparent focus:bg-transparent transition-all duration-200"
              >
                <Link
                  href="/settings"
                  className="flex w-full items-center gap-3"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent transition-all duration-200 group-hover/item:bg-muted/60">
                    <SettingsIcon className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{t("layout.dock.settings")}</span>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <div className="my-1 h-px bg-border/40 mx-2" />
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.href}
                        asChild
                        className={cn(
                          "group/item rounded-lg px-3 py-2.5 cursor-pointer bg-transparent hover:bg-transparent focus:bg-transparent transition-all duration-200",
                          isActive(item.href)
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground focus:text-foreground",
                        )}
                      >
                        <Link
                          href={item.href}
                          className="flex w-full items-center gap-3"
                        >
                          <div
                            className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                              isActive(item.href)
                                ? "bg-primary/10 shadow-sm"
                                : "bg-transparent group-hover/item:bg-muted/60",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
              <div className="my-1 h-px bg-border/40 mx-2" />
              <DropdownMenuItem
                className="group/item rounded-lg px-3 py-2.5 cursor-pointer text-destructive/70 hover:text-destructive focus:text-destructive bg-transparent hover:bg-transparent focus:bg-transparent transition-all duration-200"
                onClick={() => signOut()}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent transition-all duration-200 group-hover/item:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{t("layout.dock.signOut")}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>,
    document.body,
  );
}
