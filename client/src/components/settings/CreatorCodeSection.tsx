import { useState } from "react";
import { authFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearCreatorRef, normalizeCreatorCode } from "@/lib/creator-ref";

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Code enregistré, merci !" },
  already: { ok: true, text: "Tu as déjà un code créateur enregistré." },
  unknown_code: { ok: false, text: "Ce code n'existe pas ou n'est plus actif." },
  invalid: { ok: false, text: "Code invalide (3 à 24 lettres ou chiffres)." },
};

/** « Quelqu'un t'a conseillé LuxeFlexIA ? » — rattache le compte au créateur (même sans lien). */
export function CreatorCodeSection() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    const clean = normalizeCreatorCode(code);
    if (!clean) {
      setMsg(MESSAGES.invalid);
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch("/api/funnel/creator-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: "Impossible d'enregistrer le code pour l'instant." });
      } else {
        setMsg(data.ok ? MESSAGES[data.reason === "already" ? "already" : "ok"] : MESSAGES[data.reason] ?? MESSAGES.invalid);
        if (data.ok) {
          clearCreatorRef();
          setCode("");
        }
      }
    } catch {
      setMsg({ ok: false, text: "Impossible d'enregistrer le code pour l'instant." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground/70 uppercase px-1">Code créateur</h2>
      <div className="space-y-3 rounded-xl border border-[var(--lx-gold)]/35 bg-[var(--lx-surface-2)]/95 p-4 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          Un créateur t'a fait découvrir LuxeFlexIA ? Entre son code pour le remercier.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Ex. KARIM"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={24}
            autoCapitalize="characters"
          />
          <Button onClick={submit} disabled={busy || !code.trim()}>
            Valider
          </Button>
        </div>
        {msg ? (
          <p className={msg.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>{msg.text}</p>
        ) : null}
      </div>
    </section>
  );
}
