import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, ChevronDown } from "lucide-react";
import { useGenerateDirectPrank } from "@/hooks/use-pranks";
import { GenerationProgress } from "@/components/prank/GenerationProgress";
import { GenerationLoader } from "@/components/prank/GenerationLoader";
import { PaywallOverlay } from "@/components/prank/PaywallOverlay";
import { ImageUploadGrid } from "../components/generate/ImageUploadGrid";
import { PromptInputBar } from "@/components/generate/PromptInputBar";
import { TemplateGallery } from "@/components/generate/TemplateGallery";
import { UnlockedPrankView } from "@/components/generate/UnlockedPrankView";
import { useToast } from "@/hooks/use-toast";
import { useGenerationEligibility } from "@/hooks/use-generation-limits";
import { posthog } from "@/lib/posthog";
import { useAuth } from "@/hooks/use-auth";
import { getPendingPrank, clearPendingPrank } from "@/lib/pending-prank";
import {
  getPaywalledResult,
  clearPaywalledResult,
} from "@/lib/paywalled-result";
import { savePaywallImage, getPaywallImage, clearPaywallImage } from "@/lib/paywall-image";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { parseImageSlots, parseTextFields } from "@/lib/template-utils";
import type { PromptTemplate } from "@shared/schema";
import { useTranslation } from "react-i18next";

export default function Generate() {
  const { t } = useTranslation();
  // ── Form state ──────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<({ url: string; file: File } | null)[]>([
    null,
  ]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const [textValues, setTextValues] = useState<Record<number, string>>({});

  // ── Generation state ────────────────────────────────────────
  const [taskId, setTaskId] = useState<string | null>(null);
  const [autoGenerateReady, setAutoGenerateReady] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [transitionBg, setTransitionBg] = useState(false);

  // ── Fake generation / paywall state ─────────────────────────
  const [isFakeGenerating, setIsFakeGenerating] = useState(false);
  const [fakeLoaderStatus, setFakeLoaderStatus] = useState<"connecting" | "waiting" | "success">("connecting");
  const [showFakePaywall, setShowFakePaywall] = useState(false);
  const [savedPaywall, setSavedPaywall] = useState<{
    resultUrls: string[];
    prankId: string;
  } | null>(null);
  const [unlockedPrank, setUnlockedPrank] = useState<{
    resultUrls: string[];
    prankId: string;
  } | null>(null);
  const [unlockingPrank, setUnlockingPrank] = useState(false);

  // ── Hooks ───────────────────────────────────────────────────
  const generateDirect = useGenerateDirectPrank();
  const { toast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const { data: eligibility, refetch: refetchEligibility } =
    useGenerationEligibility();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  // Store checkout state early before URL gets cleaned
  const [isReturningFromCheckout] = useState(() => {
    return new URLSearchParams(window.location.search).get("checkout") === "success";
  });

  // ── Stripe checkout return ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      posthog.capture("subscription_created", { source: "checkout_return" });

      const paywalled = getPaywalledResult();
      window.history.replaceState({}, "", "/generate");
      clearPaywalledResult();
      setSavedPaywall(null);
      sessionStorage.removeItem("fake_paywall_reached");
      clearPaywallImage();

      const onVerified = async () => {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        await refetchEligibility();

        if (paywalled) {
          setUnlockingPrank(true);
          authFetch(
            `/api/pranks/${encodeURIComponent(paywalled.taskId)}/status`,
          )
            .then((r) => r.json())
            .then((statusData) => {
              if (
                statusData.status === "success" &&
                statusData.resultUrls?.length
              ) {
                setUnlockedPrank({
                  resultUrls: statusData.resultUrls,
                  prankId: statusData.prankId,
                });
              } else {
                toast({
                  title: t("settings.subscription.title"),
                  description: t("settings.subscription.manage"),
                });
              }
            })
            .catch(() => {
              toast({
                title: t("settings.subscription.title"),
                description: t("settings.subscription.manage"),
              });
            })
            .finally(() => setUnlockingPrank(false));
        } else {
          // No paywalled result: trigger real generation from pending prank
          // The pending prank data was already restored into React state by the
          // restore effect but autoGenerateReady was NOT set (we skipped it for
          // checkout returns). Now that credits are verified, trigger generation.
          console.log("[Checkout] Credits verified, triggering auto-generate");
          setAutoGenerateReady(true);
        }
      };

      authFetch("/api/stripe/verify-session", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          console.log("[Checkout] verify-session result:", data);
          onVerified();
        })
        .catch((err) => {
          console.error("[Checkout] verify-session error:", err);
          onVerified();
        });
    }
  }, []);

  // ── Re-show saved paywall for non-subscribers ───────────────
  useEffect(() => {
    if (profile?.is_subscriber) {
      clearPaywalledResult();
      return;
    }
    const saved = getPaywalledResult();
    if (saved) {
      setSavedPaywall({ resultUrls: saved.resultUrls, prankId: saved.prankId });
    }
  }, [profile?.is_subscriber]);

  // ── Hide header/dock while fullscreen overlay is active ─────
  useLayoutEffect(() => {
    if (pendingLoading || taskId) {
      document.body.setAttribute("data-fullscreen-overlay", "true");
    } else {
      document.body.removeAttribute("data-fullscreen-overlay");
    }
    return () => document.body.removeAttribute("data-fullscreen-overlay");
  }, [pendingLoading, taskId]);

  // ── Restore pending prank from IndexedDB ────────────────────
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("[Generate] Pending prank timeout — forcing pendingLoading=false");
        setPendingLoading(false);
      }
    }, 5000);
    getPendingPrank()
      .then((pending) => {
        if (cancelled) return;
        if (!pending) {
          console.log("[Generate] No pending prank found");
          setPendingLoading(false);
          return;
        }
        console.log("[Generate] Pending prank found:", {
          prompt: pending.prompt,
          images: pending.images.length,
        });
        if (pending.prompt) setPrompt(pending.prompt);
        if (pending.images.length > 0) {
          const restored = pending.images.map((file) => ({
            url: URL.createObjectURL(file),
            file,
          }));
          setImages(restored);
          savePaywallImage(pending.images[0]);
        }
        // When returning from checkout, don't trigger auto-generate immediately.
        // The checkout handler will trigger it after verify-session completes.
        if (!isReturningFromCheckout) {
          setAutoGenerateReady(true);
        } else {
          console.log("[Generate] Returning from checkout, keeping loader while waiting for verify-session");
          // Keep pendingLoading=true so the fullscreen loader stays visible
          // until the checkout handler triggers auto-generate.
        }
        // NOTE: We do NOT clear the pending prank here.
        // It will be cleared when a real generation starts (in handleGenerate).
        // This ensures data persists through the fake loader → paywall → Stripe checkout flow.
      })
      .catch((err) => {
        console.error("[Generate] getPendingPrank error:", err);
        if (!cancelled) setPendingLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  // ── Image & template handlers ───────────────────────────────
  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[index] = { url, file };
      const slots = parseImageSlots(selectedTemplate);
      const maxSlots = selectedTemplate ? slots.length : 3;
      const allFilled = !next.some((img) => img === null);
      if (allFilled && next.length < maxSlots) {
        next.push(null);
      }
      return next;
    });
    if (index === 0) savePaywallImage(file);
  };

  const removeSlot = (index: number) => {
    const slots = parseImageSlots(selectedTemplate);
    const minSlots = selectedTemplate
      ? slots.filter((s) => s.required).length
      : 0;
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length < minSlots)
        return next.concat(Array(minSlots - next.length).fill(null));
      return next.length === 0 ? [null] : next;
    });
  };

  const selectTemplate = (tpl: PromptTemplate) => {
    const slots = parseImageSlots(tpl);
    const initSlots = slots.length > 0 ? slots.length : 1;
    setSelectedTemplate(tpl);
    setPrompt(tpl.prompt_text);
    setImages(Array(initSlots).fill(null));
    setTextValues({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deselectTemplate = () => {
    setSelectedTemplate(null);
    setPrompt("");
    setImages([null]);
    setTextValues({});
  };

  const handleTextValueChange = (index: number, value: string) => {
    setTextValues((prev) => ({ ...prev, [index]: value }));
  };

  // ── Generation ──────────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleGenerate = async () => {
    // Skip client-side eligibility check when returning from checkout:
    // the cached data is stale (user just got credits via Stripe).
    // Server will still validate credits.
    if (!isReturningFromCheckout && eligibility && !eligibility.canGenerate) {
      toast({
        variant: "destructive",
        title: t("generate.insufficientCreditsTitle"),
        description: t("generate.insufficientCreditsDescription"),
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: t("generate.emptyPromptTitle"),
        description: t("generate.emptyPromptDescription"),
      });
      return;
    }

    // Validate required image slots
    if (selectedTemplate) {
      const slots = parseImageSlots(selectedTemplate);
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].required && !images[i]) {
          toast({
            variant: "destructive",
            title: t("generate.missingImageTitle"),
            description: t("generate.missingImageDescription", {
              label:
                slots[i].label ||
                t("generate.imageFallbackLabel", { index: i + 1 }),
            }),
          });
          return;
        }
      }

      const fields = parseTextFields(selectedTemplate);
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].required && !textValues[i]?.trim()) {
          toast({
            variant: "destructive",
            title: t("generate.missingFieldTitle"),
            description: t("generate.missingFieldDescription", {
              label:
                fields[i].label ||
                t("generate.textFallbackLabel", { index: i + 1 }),
            }),
          });
          return;
        }
      }
    }

    try {
      clearPendingPrank();

      const files = images.filter(
        (img): img is { url: string; file: File } => img !== null,
      );
      const base64Images = await Promise.all(
        files.map((img) => fileToBase64(img.file)),
      );

      let finalPrompt = prompt.trim();
      const fields = parseTextFields(selectedTemplate);
      fields.forEach((_, idx) => {
        const val = textValues[idx] || "";
        finalPrompt = finalPrompt.replaceAll(`{text${idx + 1}}`, val);
      });

      const result = await generateDirect.mutateAsync({
        prompt: finalPrompt,
        aspect_ratio: "9:16",
        images: base64Images.length > 0 ? base64Images : undefined,
        template_id: selectedTemplate?.id,
      });
      posthog.capture("prank_created", { isFake: false, template_id: selectedTemplate?.id });
      setTaskId(result.taskId);
      refetchEligibility();
    } catch (error: any) {
      let message = error.message;
      try {
        const parsed = JSON.parse(error.message);
        message = parsed.message || error.message;
      } catch { }
      if (message.includes("<!DOCTYPE") || message.includes("<html")) {
        message = t("generate.serverRetry");
      }
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: message,
      });
    }
  };

  const handleReset = () => {
    setTaskId(null);
    setPrompt("");
    setImages([null]);
    setSelectedTemplate(null);
    setTextValues({});
    refetchEligibility();
  };

  // ── Auto-generate when pending prank data has been restored ─
  // We need `profile` to be loaded to decide fake vs real generation,
  // so we defer until auth is available.
  useEffect(() => {
    if (!autoGenerateReady) return;
    // Wait for auth to finish loading before deciding the generation path
    if (isAuthLoading) {
      console.log("[Generate] Waiting for auth to load before auto-generate...");
      return; // effect will re-fire when isAuthLoading changes
    }
    setAutoGenerateReady(false);
    console.log(
      "[Generate] Auto-generate ready, prompt:",
      JSON.stringify(prompt.slice(0, 50)),
    );
    if (!prompt.trim()) {
      console.log("[Generate] Empty prompt, skipping auto-generate");
      setPendingLoading(false);
      return;
    }

    if (profile && !profile.is_subscriber && profile.role !== "admin" && !isReturningFromCheckout) {
      if (sessionStorage.getItem("fake_paywall_reached") === "true") {
        console.log("[Generate] Fake paywall already reached, skipping loader directly to paywall");
        setPendingLoading(false);
        setShowFakePaywall(true);
        return;
      }

      console.log("[Generate] Starting FAKE generation flow...");
      setPendingLoading(false);
      posthog.capture("prank_created", { isFake: true, template_id: selectedTemplate?.id });
      document.body.setAttribute("data-fullscreen-overlay", "true");
      setIsFakeGenerating(true);
      return;
    }

    // Real generation
    setTransitionBg(true);
    console.log("[Generate] Starting handleGenerate...");
    handleGenerate()
      .then(() =>
        console.log("[Generate] handleGenerate resolved, taskId:", taskId),
      )
      .catch((err) => console.error("[Generate] handleGenerate rejected:", err))
      .finally(() => {
        console.log("[Generate] handleGenerate finally, setting pendingLoading=false");
        setPendingLoading(false);
        setTimeout(() => setTransitionBg(false), 1500);
      });
  }, [autoGenerateReady, isAuthLoading]);

  // ── Fake loader timing ──────────────────────────────────────
  useEffect(() => {
    if (isFakeGenerating) {
      setFakeLoaderStatus("connecting");
      const t1 = setTimeout(() => setFakeLoaderStatus("waiting"), 4000);
      const t2 = setTimeout(() => setFakeLoaderStatus("success"), 15000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isFakeGenerating]);

  // ── Transition backdrop ─────────────────────────────────────
  const transitionBackdrop = transitionBg
    ? createPortal(
      <div className="fixed inset-0 z-[99] bg-background bg-grid" />,
      document.body,
    )
    : null;

  // ── Debug logging ───────────────────────────────────────────
  console.log("[Generate] Render:", {
    taskId: !!taskId,
    pendingLoading,
    transitionBg,
    savedPaywall: !!savedPaywall,
    isFakeGenerating,
    fakeLoaderStatus,
    showFakePaywall
  });

  // ── Portal overlays ─────────────────────────────────────────
  const portalOverlay = taskId
    ? createPortal(
      <GenerationProgress
        taskId={taskId}
        inputImageUrl={images[0]?.url}
        onRetry={handleGenerate}
        onReset={handleReset}
      />,
      document.body,
    )
    : pendingLoading
      ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background bg-grid"
        >
          <img
            src="/assets/turboprank.png"
            alt="TurboPrank"
            className="h-20 md:h-28 object-contain drop-shadow-[0_0_40px_hsl(var(--primary)/0.5)] mb-4"
          />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>,
        document.body,
      )
      : null;

  const fakeLoaderOverlay = isFakeGenerating ? createPortal(
    <GenerationLoader
      status={fakeLoaderStatus}
      inputImageUrl={images[0]?.url}
      onRevealComplete={() => {
        setIsFakeGenerating(false);
        sessionStorage.setItem("fake_paywall_reached", "true");
        setShowFakePaywall(true);
        document.body.removeAttribute("data-fullscreen-overlay");
      }}
    />,
    document.body
  ) : null;

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // -- Generation in progress
  if (taskId) {
    return (
      <>
        {transitionBackdrop}
        {portalOverlay}
      </>
    );
  }

  // -- Fake loader playing
  if (isFakeGenerating) {
    return (
      <>
        {transitionBackdrop}
        {fakeLoaderOverlay}
      </>
    );
  }

  // -- Loading pending prank from hero flow
  if (pendingLoading) {
    return (
      <>
        {transitionBackdrop}
        {portalOverlay}
      </>
    );
  }

  // -- Loading unlocked prank after payment
  if (unlockingPrank) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 min-h-[calc(100vh-12rem)] animate-in fade-in duration-300">
        <div className="h-7 w-48 rounded-full bg-muted animate-pulse" />
        <div className="w-full max-w-[260px] aspect-[9/16] rounded-2xl bg-muted animate-pulse" />
        <div className="h-11 w-56 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  // -- Fake Paywall from onboarding OR persistent paywall for non-subscribers
  const shouldShowPaywall = showFakePaywall || (
    profile && !profile.is_subscriber && profile.role !== "admin"
  );

  if (shouldShowPaywall) {
    const paywallImageUrl = images[0]?.url || getPaywallImage() || "";
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-5 overflow-hidden px-4 pt-24 pb-24 animate-in fade-in duration-500 bg-background bg-grid">
        <PaywallOverlay isFake={true} imageUrl={paywallImageUrl} />
      </div>
    );
  }

  // -- Unlocked prank after successful payment
  if (unlockedPrank) {
    return (
      <UnlockedPrankView
        resultUrls={unlockedPrank.resultUrls}
        prankId={unlockedPrank.prankId}
        onReset={() => {
          setUnlockedPrank(null);
          handleReset();
        }}
      />
    );
  }

  // -- Persistent paywall for non-subscribers with a previous generation
  if (savedPaywall && !profile?.is_subscriber) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-5 overflow-hidden px-4 pt-24 pb-24 animate-in fade-in duration-500 bg-background bg-grid">
        <PaywallOverlay imageUrl={savedPaywall.resultUrls[0]} />
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Image upload zone + prompt */}
      <div
        ref={topRef}
        className="relative flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-12rem)] pt-4 pb-4"
      >
        {/* Mobile Lightweight Background Glow */}
        <div className="md:hidden absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[100vh] bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,_var(--tw-gradient-stops))] from-primary/10 via-secondary/5 to-transparent -z-10 pointer-events-none" />

        {/* Abstract Background Shapes (hidden on mobile) */}
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="hidden md:block absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/3 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="hidden md:block absolute bottom-0 left-0 w-[350px] h-[350px] bg-secondary/2 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Images + input group */}
        <div className="relative flex flex-col items-center gap-3 md:gap-4 w-full">
          <ImageUploadGrid
            images={images}
            selectedTemplate={selectedTemplate}
            onImageSelect={handleImageSelect}
            onRemoveSlot={removeSlot}
            onDeselectTemplate={deselectTemplate}
          />

          <PromptInputBar
            prompt={prompt}
            onPromptChange={setPrompt}
            selectedTemplate={selectedTemplate}
            textValues={textValues}
            onTextValueChange={handleTextValueChange}
            onGenerate={handleGenerate}
            isGenerating={generateDirect.isPending}
          />

          {/* Voir les templates link */}
          <button
            onClick={() =>
              galleryRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mt-1"
          >
            {t("generate.viewTemplates")}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Template Gallery */}
      <div ref={galleryRef}>
        <TemplateGallery
          selectedTemplateId={selectedTemplate?.id ?? null}
          onSelectTemplate={selectTemplate}
          onDeselectTemplate={deselectTemplate}
        />
      </div>
    </div>
  );
}
