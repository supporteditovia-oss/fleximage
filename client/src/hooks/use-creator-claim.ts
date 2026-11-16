import { useEffect } from "react";
import { authFetch } from "@/lib/api";
import { clearCreatorRef, readCreatorRef } from "@/lib/creator-ref";

/** Dès que l'utilisateur est connecté : rattache son compte au créateur qui l'a invité (une seule fois). */
export function useCreatorClaim(userId: string | null | undefined): void {
  useEffect(() => {
    if (!userId) return;
    const code = readCreatorRef();
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/funnel/creator-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!cancelled && res.ok) clearCreatorRef();
      } catch {
        /* on réessaiera au prochain chargement */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
