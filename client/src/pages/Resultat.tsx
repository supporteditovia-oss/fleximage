import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { currentPlanQueryKey } from "@/hooks/use-billing";
import { useAuth } from "@/hooks/use-auth";
import {
  clearPaywalledResult,
  getPaywalledResult,
} from "@/lib/paywalled-result";
import {
  assertMediaBlob,
  inferDownloadExtension,
  randomLarpDownloadName,
  saveMediaBlob,
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

function firstNameFromProfile(profile: {
  full_name: string | null;
  email: string | null;
} | null): string {
  const full = profile?.full_name?.trim();
  if (full) return full.split(/\s+/)[0]!;
  const email = profile?.email?.trim();
  if (email) {
    const local = email.split("@")[0] || "";
    const cleaned = local.replace(/[._-]+/g, " ").trim();
    if (cleaned) {
      const part = cleaned.split(/\s+/)[0]!;
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
  }
  return "";
}

const CHECKOUT_WELCOME_KEY = "luxeflexia:checkout-welcome";

function readCheckoutParams(locationPath: string): {
  checkout: string | null;
  sessionId: string | null;
  larpId: string | null;
} {
  // wouter's location often omits the query string — always prefer window.location.search.
  const fromWindow =
    typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
  const fromLocation = locationPath.includes("?")
    ? locationPath.split("?")[1] || ""
    : "";
  const params = new URLSearchParams(fromWindow || fromLocation);
  return {
    checkout: params.get("checkout"),
    sessionId: params.get("session_id"),
    larpId: params.get("larpId"),
  };
}

function markCheckoutWelcome(): void {
  try {
    sessionStorage.setItem(CHECKOUT_WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}

function consumeCheckoutWelcomeFlag(): boolean {
  try {
    if (sessionStorage.getItem(CHECKOUT_WELCOME_KEY) === "1") {
      sessionStorage.removeItem(CHECKOUT_WELCOME_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function peekCheckoutWelcomeFlag(): boolean {
  try {
    return sessionStorage.getItem(CHECKOUT_WELCOME_KEY) === "1";
  } catch {
    return false;
  }
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
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [checkoutWelcome, setCheckoutWelcome] = useState(
    () => peekCheckoutWelcomeFlag(),
  );
  const [activating, setActivating] = useState(false);

  const firstName = useMemo(() => firstNameFromProfile(profile), [profile]);

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
      const { checkout, sessionId, larpId: larpIdFromQuery } = readCheckoutParams(
        location,
      );
      const stashed = getPaywalledResult();
      const preferredLarpId = larpIdFromQuery || stashed?.larpId || null;
      const fromCheckout = checkout === "success" && Boolean(sessionId);

      try {
        if (fromCheckout && sessionId) {
          markCheckoutWelcome();
          setCheckoutWelcome(true);
          setActivating(true);
          let active = false;
          let verifyAuthFailed = false;
          for (let i = 0; i < 10; i++) {
            try {
              active = await verifyCheckoutSession(sessionId);
              if (active) break;
            } catch (err) {
              const status = (err as { status?: number } | null)?.status;
              if (status === 401 || status === 403) {
                verifyAuthFailed = true;
                break;
              }
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
          if (active) {
            void import("@/lib/funnel-tracker").then(({ trackFunnelStep }) => {
              trackFunnelStep("subscribed", { source: "resultat_checkout" });
            });
          }
          await queryClient.invalidateQueries({ queryKey: ["profile"] });
          await queryClient.invalidateQueries({ queryKey: currentPlanQueryKey });
          window.history.replaceState({}, "", "/resultat");
          if (!cancelled) setActivating(false);
          if (verifyAuthFailed) {
            toast({
              title: "Paiement reçu",
              description:
                "Reconnecte-toi pour activer ton abonnement sur cet appareil (surtout après TikTok → Safari).",
            });
          } else if (!active) {
            toast({
              title: "Paiement reçu",
              description:
                "Ton abonnement s'active. Tu peux déjà créer une image — rafraîchis si les crédits mettent une seconde à apparaître.",
            });
          }
        } else if (peekCheckoutWelcomeFlag()) {
          setCheckoutWelcome(true);
        }

        if (cancelled) return;
        await fetchResult(preferredLarpId);
      } catch (err) {
        if (!cancelled) {
          const status = (err as { status?: number } | null)?.status;
          toast({
            title:
              status === 401 || status === 403
                ? "Reconnecte-toi pour voir ton résultat"
                : "Impossible de charger ton résultat",
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
  }, [fetchResult, location, queryClient, toast]);

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await authFetch(
        `/api/larps/${encodeURIComponent(result.larpId)}/download/0`,
      );
      const blob = await res.blob();
      assertMediaBlob(blob);
      const ext = inferDownloadExtension(blob, {
        resultType: result.resultType,
        url: result.resultUrls[0],
      });
      const outcome = await saveMediaBlob(blob, randomLarpDownloadName(ext), {
        resultType: result.resultType,
        fallbackUrl: result.resultUrls[0],
      });
      if (outcome === "aborted") return;
      toast({ title: "Image téléchargée !" });
    } catch {
      toast({
        title: "Téléchargement impossible",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  if (loading || activating) {
    return (
      <div className="lx-postpay lx-welcome flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--lx-gold)]" />
        <p className="lx-welcome__loading">
          {activating
            ? "Activation de ton abonnement…"
            : "Préparation de ton espace…"}
        </p>
      </div>
    );
  }

  // After a successful Stripe checkout: celebratory welcome (not "no result").
  if (checkoutWelcome && !result) {
    return (
      <div className="lx-postpay lx-welcome">
        <div className="lx-welcome__glow" aria-hidden />
        <div className="lx-welcome__card">
          <div className="lx-welcome__mark" aria-hidden>
            <span className="lx-welcome__diamond" />
            <Sparkles className="lx-welcome__spark" strokeWidth={1.25} />
          </div>

          <p className="lx-welcome__eyebrow">Bienvenue chez LuxeFlexIA</p>

          <h1 className="lx-welcome__title">
            {firstName ? (
              <>
                Félicitations, <span className="lx-welcome__name">{firstName}</span>
              </>
            ) : (
              "Félicitations"
            )}
          </h1>

          <p className="lx-welcome__lede">
            Ton abonnement est confirmé. Tes crédits sont prêts — il ne reste plus
            qu&apos;à créer ta première image.
          </p>

          <div className="lx-welcome__divider" aria-hidden />

          <button
            type="button"
            onClick={() => {
              consumeCheckoutWelcomeFlag();
              setLocation("/generate");
            }}
            className="lx-postpay__btn-gold lx-welcome__cta inline-flex h-12 w-full max-w-xs items-center justify-center rounded-lg px-6 text-sm"
          >
            Créer une image
          </button>

          <button
            type="button"
            onClick={() => {
              consumeCheckoutWelcomeFlag();
              setLocation("/settings");
            }}
            className="lx-welcome__link"
          >
            Voir mon abonnement
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="lx-postpay lx-welcome mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
        <Sparkles className="h-10 w-10 text-[var(--lx-gold)]" strokeWidth={1.5} />
        <h1 className="lx-welcome__title lx-welcome__title--sm">
          Aucun résultat pour le moment
        </h1>
        <p className="lx-welcome__lede">
          Crée une image pour la retrouver ici, prête à télécharger.
        </p>
        <button
          type="button"
          onClick={() => setLocation("/generate")}
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
      {checkoutWelcome ? (
        <div className="lx-welcome__inline">
          <p className="lx-welcome__eyebrow">Abonnement activé</p>
          <h1 className="lx-welcome__title lx-welcome__title--sm">
            {firstName
              ? `Bravo ${firstName}, ton image est prête`
              : "Ton image est prête"}
          </h1>
        </div>
      ) : (
        <h1
          className="text-center text-2xl font-semibold text-[var(--lx-ink)] md:text-3xl"
          style={{ fontFamily: "var(--lx-display)" }}
        >
          Ton image est prête
        </h1>
      )}

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
          onClick={() => setLocation("/generate")}
          className="lx-postpay__btn-outline inline-flex h-12 flex-1 items-center justify-center rounded-lg px-4 text-sm"
        >
          Créer une autre image
        </button>
      </div>
    </div>
  );
}
