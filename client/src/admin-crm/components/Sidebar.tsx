import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  FolderOpen,
  Wand2,
  Music2,
  CalendarDays,
  LineChart,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/library", label: "Bibliothèque", icon: FolderOpen },
  { href: "/admin/pov", label: "POV Engine", icon: Wand2 },
  { href: "/admin/music", label: "Musiques", icon: Music2 },
  { href: "/admin/publish", label: "Publish", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/settings", label: "Réglages", icon: Settings },
];

export default function Sidebar() {
  const [pathname] = useLocation();

  async function handleLogout() {
    await fetch("/admin/api/logout", { method: "POST", credentials: "include" });
    window.location.href = "/admin";
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-[var(--lux-border)] px-3 py-5">
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--lux-gold)] to-[#8a6a35]" />
        <span className="lux-display text-[15px] tracking-tight">Luxeflexia</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative block">
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-[var(--lux-glass)] border border-[var(--lux-glass-border)]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-200 ${
                  isActive
                    ? "text-[var(--lux-text)]"
                    : "text-[var(--lux-text-muted)] hover:text-[var(--lux-text)]"
                }`}
              >
                <Icon size={17} strokeWidth={1.75} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--lux-text-faint)] hover:text-[var(--lux-text)] hover:bg-[var(--lux-glass)] transition-colors duration-200"
      >
        <LogOut size={17} strokeWidth={1.75} />
        Déconnexion
      </button>
    </aside>
  );
}
