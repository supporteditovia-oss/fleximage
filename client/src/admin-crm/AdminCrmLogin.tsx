import { useState } from "react";
import { useLocation } from "wouter";
import "@/admin-crm/admin-theme.css";

export default function AdminCrmLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/admin/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Erreur de connexion");
      return;
    }

    setLocation("/admin/dashboard");
  }

  return (
    <div className="lux-scope min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[36rem] rounded-full opacity-[0.12] blur-[100px] pointer-events-none"
        style={{ background: "var(--lux-gold)" }}
      />

      <div className="w-full max-w-sm relative">
        <div className="lux-glass rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--lux-gold)] to-[#8a6a35]" />
            <span className="lux-display text-lg">Luxeflexia</span>
          </div>

          <p className="text-sm text-[var(--lux-text-muted)] mb-6">
            Espace privé. Connexion requise.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--lux-text-muted)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-black/30 border border-[var(--lux-glass-border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--lux-gold)] transition-colors duration-200"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--lux-text-muted)] mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-black/30 border border-[var(--lux-glass-border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--lux-gold)] transition-colors duration-200"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--lux-danger)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--lux-gold)] text-[#1a1408] text-sm font-medium py-2.5 hover:brightness-110 transition-[filter] duration-200 disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
