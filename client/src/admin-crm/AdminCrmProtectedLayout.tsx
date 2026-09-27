import { useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";
import Sidebar from "@/admin-crm/components/Sidebar";
import "@/admin-crm/admin-theme.css";

export function AdminCrmProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/admin/api/session", {
          credentials: "include",
        });
        if (cancelled) return;
        setStatus(res.ok ? "ok" : "denied");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location]);

  if (status === "loading") {
    return (
      <div className="lux-scope min-h-screen flex items-center justify-center text-[var(--lux-text-muted)] text-sm">
        Vérification de la session…
      </div>
    );
  }

  if (status === "denied") {
    return <Redirect to="/admin" />;
  }

  return (
    <div className="lux-scope min-h-screen flex">
      <Sidebar />
      <main className="flex-1 px-10 py-8 lux-scrollbar overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}
