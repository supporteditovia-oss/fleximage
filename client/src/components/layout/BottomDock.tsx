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

const adminNavItems = [
  { href: "/admin", label: "Aperçu Admin", icon: ShieldCheck },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/templates", label: "Templates", icon: FileText },
];

export function BottomDock() {
  const [location] = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let lastY = 0;
    const thresh = 10;
    let ticking = false;

    // Detect actual scroll direction via touch/wheel delta to avoid rubber-banding issues
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (currentY <= 0) {
            setHidden(false); // top of page
          } else if (currentY > lastY + thresh) {
            setHidden(true); // scrolling down
          } else if (currentY < lastY - thresh) {
            setHidden(false); // scrolling up
          }
          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // If viewport shrinks by more than 20% (keyboard), hide dock
      if (vv.height < window.innerHeight * 0.8) {
        setHidden(true);
      } else if (window.scrollY <= lastY + thresh) {
        // If viewport is full size again, show dock (unless we were already actively scrolling down)
        setHidden(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  const isActive = (path: string) => location === path;

  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const dockItemClass = (active: boolean) =>
    cn(
      "group flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl text-[11px] font-medium transition-all duration-200 min-w-[56px] md:px-3 md:py-1 md:min-w-[56px] md:gap-0.5 md:text-xs",
      active
        ? "text-primary scale-110"
        : "text-muted-foreground hover:text-foreground hover:scale-105",
    );

  const dockIconClass = (active: boolean) =>
    cn(
      "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 md:w-9 md:h-9",
      active ? "bg-primary/10 shadow-sm" : "group-hover:bg-muted/60",
    );

  return (
    <div className={cn(
      "bottom-dock fixed bottom-0 left-0 w-full z-50 flex justify-center px-[5%] md:px-0 pb-[env(safe-area-inset-bottom)] transition-transform duration-300",
      hidden ? "translate-y-full md:translate-y-0" : "translate-y-0"
    )}>
      <nav className="w-full md:max-w-[360px] bg-card/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] dock-nav border border-border/50">
        <div className="flex items-center justify-evenly px-4 py-2 md:px-3 md:py-2">
          {/* Historique */}
          <Link href="/history" className={dockItemClass(isActive("/history"))}>
            <div className={dockIconClass(isActive("/history"))}>
              <History className="h-6 w-6 md:h-5 md:w-5" />
            </div>
            <span>Historique</span>
          </Link>

          {/* Créer - center */}
          <Link
            href="/generate"
            className={dockItemClass(isActive("/generate"))}
          >
            <div className={dockIconClass(isActive("/generate"))}>
              <Plus className="h-6 w-6 md:h-5 md:w-5" />
            </div>
            <span>Créer</span>
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
                <div className="flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-2xl transition-all duration-200 group-hover:bg-muted/60">
                  <Avatar className="h-7 w-7 md:h-6 md:w-6">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {profile?.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span>Compte</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={12}
              className="p-1.5 rounded-2xl min-w-[200px] bg-card/95 backdrop-blur-xl border border-border/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            >
              <DropdownMenuItem
                asChild
                className="group/item rounded-xl px-3 py-2.5 cursor-pointer text-muted-foreground hover:text-foreground focus:text-foreground bg-transparent hover:bg-transparent focus:bg-transparent transition-all duration-200"
              >
                <Link
                  href="/settings"
                  className="flex w-full items-center gap-3"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-transparent transition-all duration-200 group-hover/item:bg-muted/60">
                    <SettingsIcon className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Paramètres</span>
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
                          "group/item rounded-xl px-3 py-2.5 cursor-pointer bg-transparent hover:bg-transparent focus:bg-transparent transition-all duration-200",
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
                              "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200",
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
                className="group/item rounded-xl px-3 py-2.5 cursor-pointer text-destructive/70 hover:text-destructive focus:text-destructive bg-transparent hover:bg-transparent focus:bg-transparent transition-all duration-200"
                onClick={() => signOut()}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-transparent transition-all duration-200 group-hover/item:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Déconnexion</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}
