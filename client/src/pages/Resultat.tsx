import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Download, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { currentPlanQueryKey } from "@/hooks/use-billing";
import {
  clearPaywalledResult,
  getPaywalledResult,
} from "@/lib/paywalled-result";
import {
  inferDownloadExtension,
  randomLarpDownloadName,
  triggerBlobDownload,
} from "@/lib/download-media";
import { useToast } from "@/hooks/use-toast";
import { VideoResultPlayer } from "@/components/larp/VideoResultPlayer";
import "./postpay-pages.css";

interface ResultPayload {
  larpId: string;
  resultUrls: string[];
  resultType: "image" | "video";
  createdAt: string;
  taskId: string | null;
}

async function verifyCheckoutSession(sessionId: string): Promise<boolean> {
  const res = await authFetch("/api/stripe/verify-session", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
  const data = (await res.json()) as { active?: boolean };
  return Boolean(data.active);
}

export default function Resultat() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);

  const redirectToPaywall = useCallback(() => {
    setLocation("/generate");
  }, [setLocation]);

  const fetchResult = useCallback(
    async (larpId?: string | null) => {
      const tryFetch = async (id?: string | null) => {
        const qs = id ? `?larpId=${encodeURIComponent(id)}` : "";
        const res = await authFetch(`/api/larps/result${qs}`);
        return (await res.json()) as ResultPayload;
      };

      try {
        let data: ResultPayload;
        try {
          data = await tryFetch(larpId);
        } catch (err) {
          const status = (err as { status?: number } | null)?.status;
          if (status === 404 && larpId) {
            data = await tryFetch(null);
          } else {
            throw err;
          }
        }
        setResult(data);
        clearPaywalledResult();
        return true;
      } catch (err) {
        const status = (err as { status?: number } | null)?.status;
        const code = (err as { code?: string } | null)?.code;
        if (status === 403 || code === "PAYMENT_REQUIRED") {
          redirectToPaywall();
          return false;
        }
        if (status === 404) {
          setResult(null);
          return true;
        }
        throw err;
      }
    },
    [redirectToPaywall],
  );

  useEffect(() => {
    document.documentElement.classList.add("luxeflexia-postpay");
    return () => {
      document.documentElement.classList.remove("luxeflexia-postpay");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const params = new URLSearchParams(location.split("?")[1] || "");
      const checkout = params.get("checkout");
      const sessionId = params.get("session_id");
      const larpIdFromQuery = params.get("larpId");
      const stashed = getPaywalledResult();
      const preferredLarpId = larpIdFromQuery || stashed?.larpId || null;

      try {
        if (checkout === "success" && sessionId) {
          let active = false;
          for (let i = 0; i < 10; i++) {
            active = await verifyCheckoutSession(sessionId);
            if (active) break;
            await new Promise((r) => setTimeout(r, 1000));
          }
          await queryClient.invalidateQueries({ queryKey: ["profile"] });
          await queryClient.invalidateQueries({ queryKey: currentPlanQueryKey });
          window.history.replaceState({}, "", "/resultat");
          if (!active) {
            // Payment succeeded on Stripe — don't bounce back to the paywall.
            toast({
              title: "Paiement reçu",
              description:
                "Ton abonnement s'active. Ouvre Paramètres ou rafraîchis la page dans quelques secondes.",
            });
            setLocation("/settings");
            return;
          }
        }

        if (cancelled) return;
        await fetchResult(preferredLarpId);
      } catch {
        if (!cancelled) {
          toast({
            title: "Impossible de charger ton résultat",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [fetchResult, location, redirectToPaywall, toast]);

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await authFetch(
        `/api/larps/${encodeURIComponent(result.larpId)}/download/0`,
      );
      const blob = await res.blob();
      const ext = inferDownloadExtension(blob, {
        resultType: result.resultType,
        url: result.resultUrls[0],
      });
      triggerBlobDownload(blob, randomLarpDownloadName(ext));
    } catch {
      toast({
        title: "Téléchargement impossible",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="lx-postpay flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a227]" />
        <p
          className="text-sm text-[var(--lx-muted)]"
          style={{ fontFamily: "var(--lx-display)" }}
        >
          Préparation de ton image…
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="lx-postpay mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
        <Sparkles className="h-10 w-10 text-[#c9a227]" strokeWidth={1.5} />
        <h1
          className="text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl"
          style={{ fontFamily: "var(--lx-display)" }}
        >
          Aucun résultat disponible
        </h1>
        <p className="text-sm text-[var(--lx-muted)]">
          Crée une image pour la retrouver ici après paiement.
        </p>
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="lx-postpay__btn-gold inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm"
        >
          Créer une image
        </button>
      </div>
    );
  }

  const mediaUrl = result.resultUrls[0];

  return (
    <div className="lx-postpay mx-auto flex w-full max-w-xl flex-col items-center gap-6 py-4 md:py-8">
      <h1
        className="text-center text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl"
        style={{ fontFamily: "var(--lx-display)" }}
      >
        Ton image est prête
      </h1>

      <div className="lx-postpay__frame relative w-full max-w-[min(92vw,420px)] overflow-hidden rounded-lg">
        <div className="relative aspect-[9/16] w-full">
          {result.resultType === "video" ? (
            <VideoResultPlayer src={mediaUrl} />
          ) : (
            <img
              src={mediaUrl}
              alt="Image générée"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>
      </div>

      <div className="flex w-full max-w-[min(92vw,420px)] flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={downloading}
          className="lx-postpay__btn-gold inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm disabled:opacity-70"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Télécharger l&apos;image
        </button>
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="lx-postpay__btn-outline inline-flex h-12 flex-1 items-center justify-center rounded-lg px-4 text-sm"
        >
          Créer une autre image
        </button>
      </div>
    </div>
  );
}
