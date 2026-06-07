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
import { useTranslation } from "react-i18next";

export function BottomDock() {
  const [location] = useLocation();
  const pathname = location.split("?")[0] || location;
  const { user, profile, isAdmin, signOut } = useAuth();
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  const adminNavItems = [
    { href: "/admin", label: t("layout.dock.adminOverview"), icon: ShieldCheck },
    { href: "/admin/users", label: t("layout.dock.users"), icon: Users },
    { href: "/admin/templates", label: t("layout.dock.templates"), icon: FileText },
    { href: "/admin/studio", label: "Studio", icon: Clapperboard },
    { href: "/admin/logs", label: t("layout.dock.logs"), icon: ScrollText },
  ];

  useEffect(() => {
    let maxHeight = window.innerHeight;
    let lastY = window.scrollY;
    const thresh = 10;
          
    const handleResizeOrScroll = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      
      const currentY = window.scrollY;
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

    // Listen to resize and scroll on visualViewport (scroll on vv fires when UI expands/collapses usually)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResizeOrScroll);
      window.visualViewport.addEventListener("scroll", handleResizeOrScroll);
      // Run once on mount
      handleResizeOrScroll();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResizeOrScroll);
        window.visualViewport.removeEventListener("scroll", handleResizeOrScroll);
      }
    };
  }, []);

  const isActive = (path: string) => pathname === path;
  const handleCreateClick = () => {
    if (pathname !== "/generate") return;
    window.dispatchEvent(new Event("larpking:create-new-larp"));
  };

  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const dockItemClass = (active: boolean) =>
    cn(
      "group flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 min-w-[56px] md:px-3 md:py-1 md:min-w-[56px] md:gap-0.5 md:text-xs",
      active
        ? "text-primary scale-110"
        : "text-muted-foreground hover:text-foreground hover:scale-105",
    );

  const dockIconClass = (active: boolean) =>
    cn(
      "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 md:w-9 md:h-9",
      active
        ? "bg-primary/10 shadow-sm group-hover:!bg-muted/60"
        : "group-hover:bg-muted/60",
    );

  return (
    <div className={cn(
      "bottom-dock fixed bottom-0 left-0 w-full z-50 flex justify-center px-[5%] md:px-0 pb-[env(safe-area-inset-bottom)] transition-transform duration-300",
      hidden ? "translate-y-full md:translate-y-0" : "translate-y-0"
    )}>
      <nav className="w-full md:max-w-[360px] bg-white/85 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dock-nav border border-border/80">
        <div className="flex items-center justify-evenly px-4 py-2 md:px-3 md:py-2">
          {/* Historique */}
          <Link href="/history" className={dockItemClass(isActive("/history"))}>
            <div className={dockIconClass(isActive("/history"))}>
              <History className="h-6 w-6 md:h-5 md:w-5" />
            </div>
            <span>{t("layout.dock.history")}</span>
          </Link>

          {/* Créer - center */}
          <Link
            href="/generate"
            className={dockItemClass(isActive("/generate"))}
            onClick={handleCreateClick}
          >
            <div className={dockIconClass(isActive("/generate"))}>
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
                <div className="flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg transition-all duration-200 group-hover:bg-muted/60">
                  <Avatar className="h-7 w-7 md:h-6 md:w-6">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
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
              className="p-1.5 rounded-lg min-w-[200px] bg-card/95 backdrop-blur-xl border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
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
    </div>
  );
}
