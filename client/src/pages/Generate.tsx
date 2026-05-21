import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, ChevronDown } from "lucide-react";
import { useGenerateDirectPrank, useGenerateVideoPrank } from "@/hooks/use-pranks";
import { GenerationProgress } from "@/components/prank/GenerationProgress";
import { GenerationLoader } from "@/components/prank/GenerationLoader";
import { PaywallOverlay } from "@/components/prank/PaywallOverlay";
import { ImageUploadGrid } from "../components/generate/ImageUploadGrid";
import { PromptInputBar } from "@/components/generate/PromptInputBar";
import { TemplateGallery } from "@/components/generate/TemplateGallery";
import { UnlockedPrankView } from "@/components/generate/UnlockedPrankView";
import { useToast } from "@/hooks/use-toast";
import { useGenerationEligibility } from "@/hooks/use-generation-limits";
import { useAuth } from "@/hooks/use-auth";
import { posthog } from "@/lib/posthog";
import { getPendingPrank, clearPendingPrank, savePendingPrank } from "@/lib/pending-prank";
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

const FAKE_LOADER_MIN_DELAY_MS = 10_000;
const FAKE_LOADER_MAX_DELAY_MS = 20_000;

function getRandomFakeLoaderDelay() {
  return (
    FAKE_LOADER_MIN_DELAY_MS +
    Math.floor(
      Math.random() * (FAKE_LOADER_MAX_DELAY_MS - FAKE_LOADER_MIN_DELAY_MS + 1),
    )
  );
}

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
  const [paywallDefaultPlan, setPaywallDefaultPlan] = useState<"weekly" | "monthly">("monthly");
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
  const generateVideo = useGenerateVideoPrank();

  // ── Mode state ─────────────────────────────────────────────
  const [generationMode, setGenerationMode] = useState<"image" | "video">("image");
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
      const paywalled = getPaywalledResult();
      window.history.replaceState({}, "", "/generate");
      clearPaywalledResult();
      setSavedPaywall(null);
      sessionStorage.removeItem("fake_paywall_reached");
      clearPaywallImage();

      const waitForWebhookActivation = async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const res = await authFetch("/api/stripe/verify-session", { method: "POST" });
          const data = await res.json();
          console.log("[Checkout] verify-session result:", data);
          if (data.active) return true;
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
        return false;
      };

      const onVerified = async (isActive: boolean) => {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        await refetchEligibility();

        if (!isActive) {
          setPendingLoading(false);
          return;
        }

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

      waitForWebhookActivation()
        .then((isActive) => onVerified(isActive))
        .catch((err) => {
          console.error("[Checkout] verify-session error:", err);
          onVerified(false);
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

  const hasSavedPaywall = !!savedPaywall && !profile?.is_subscriber;
  const isPaywallOverlayActive = showFakePaywall || hasSavedPaywall;
  const isFullscreenOverlayActive =
    pendingLoading ||
    !!taskId ||
    isFakeGenerating ||
    isPaywallOverlayActive ||
    unlockingPrank;

  // ── Hide header/dock while fullscreen overlay is active ─────
  useLayoutEffect(() => {
    if (isFullscreenOverlayActive) {
      document.documentElement.setAttribute("data-fullscreen-overlay", "true");
      document.body.setAttribute("data-fullscreen-overlay", "true");
    } else {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
    }

    if (isPaywallOverlayActive) {
      document.body.setAttribute("data-paywall-overlay", "true");
    } else {
      document.body.removeAttribute("data-paywall-overlay");
    }

    return () => {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-paywall-overlay");
    };
  }, [isFullscreenOverlayActive, isPaywallOverlayActive]);

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
          generationMode: pending.generationMode ?? "image",
        });
        setGenerationMode(pending.generationMode ?? "image");
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
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: t("generate.emptyPromptTitle"),
        description: t("generate.emptyPromptDescription"),
      });
      return;
    }

    // Validate required image slots (image mode only — video mode skips templates)
    if (generationMode === "image" && selectedTemplate) {
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

    const files = images.filter(
      (img): img is { url: string; file: File } => img !== null,
    );
    let finalPrompt = prompt.trim();
    if (generationMode === "image") {
      const fields = parseTextFields(selectedTemplate);
      fields.forEach((_, idx) => {
        const val = textValues[idx] || "";
        finalPrompt = finalPrompt.replaceAll(`{text${idx + 1}}`, val);
      });
    }

    if (profile && !profile.is_subscriber && profile.role !== "admin" && !isReturningFromCheckout) {
      try {
        await savePendingPrank({
          prompt: finalPrompt,
          images: files.map((f) => f.file),
          generationMode,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("[Generate] Failed to save onboarding prank:", error);
        toast({
          variant: "destructive",
          title: t("common.messages.error"),
          description: t("generate.serverRetry"),
        });
        return;
      }

      setPendingLoading(false);
      setShowFakePaywall(false);
      posthog.capture("prank_created", { isFake: true, template_id: selectedTemplate?.id });
      setIsFakeGenerating(true);
      return;
    }

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

    try {
      clearPendingPrank();

      // ── Video mode ───────────────────────────────────────────
      if (generationMode === "video") {
        const base64Images = await Promise.all(
          files.map((img) => fileToBase64(img.file)),
        );

        const result = await generateVideo.mutateAsync({
          prompt: finalPrompt,
          aspect_ratio: "9:16",
          images: base64Images.length > 0 ? base64Images : undefined,
        });
        posthog.capture("prank_created", { isFake: false, resultType: "video" });
        setPaywallDefaultPlan("monthly");
        setTaskId(result.taskId);
        refetchEligibility();
        return;
      }

      // ── Image mode (existing logic) ──────────────────────────
      const base64Images = await Promise.all(
        files.map((img) => fileToBase64(img.file)),
      );

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
      const normalizedMessage = message
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (
        generationMode === "video" &&
        (error.code === "VIDEO_PLAN_REQUIRED" ||
          error.code === "SUBSCRIPTION_REQUIRED" ||
          normalizedMessage.includes("video")) &&
        !profile?.is_subscriber &&
        profile?.role !== "admin"
      ) {
        setPaywallDefaultPlan("monthly");
        setShowFakePaywall(true);
        return;
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
    setGenerationMode("image");
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
      const successDelay = getRandomFakeLoaderDelay();
      const t1 = setTimeout(() => setFakeLoaderStatus("waiting"), 4000);
      const t2 = setTimeout(() => setFakeLoaderStatus("success"), successDelay);
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
        onReset={handleReset}
        resultType={generationMode}
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
      }}
    />,
    document.body
  ) : null;

  const paywallOverlayClassName =
    "fixed inset-0 z-[100] overflow-hidden bg-background bg-grid animate-in fade-in duration-300";

  const paywallOverlayInnerClassName =
    "absolute inset-x-0 top-20 bottom-4 flex items-stretch justify-center px-4 md:top-24 md:bottom-10";

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

  // -- Fake Paywall from onboarding
  if (showFakePaywall) {
    const paywallImageUrl = images[0]?.url || getPaywallImage() || "";
    return createPortal(
      <div className={paywallOverlayClassName}>
        <div className={paywallOverlayInnerClassName}>
          <PaywallOverlay isFake={true} imageUrl={paywallImageUrl} defaultPlan={paywallDefaultPlan} />
        </div>
      </div>,
      document.body,
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
  if (hasSavedPaywall) {
    return createPortal(
      <div className={paywallOverlayClassName}>
        <div className={paywallOverlayInnerClassName}>
          <PaywallOverlay imageUrl={savedPaywall.resultUrls[0]} />
        </div>
      </div>,
      document.body,
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
          <div
            role="tablist"
            aria-label="Generation mode"
            className="relative grid grid-cols-2 rounded-full border border-border/60 bg-muted/40 p-0.5 shadow-sm backdrop-blur-md"
          >
            <div
              className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-gradient-to-b from-primary to-primary/85 shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                generationMode === "video" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              role="tab"
              aria-selected={generationMode === "image"}
              onClick={() => setGenerationMode("image")}
              className={`relative z-10 min-w-20 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-[color,opacity] duration-300 ease-out ${
                generationMode === "image"
                  ? "text-primary-foreground"
                  : "text-muted-foreground/75 hover:text-muted-foreground"
              }`}
            >
              {t("generate.modeImage")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={generationMode === "video"}
              onClick={() => setGenerationMode("video")}
              className={`relative z-10 min-w-20 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-[color,opacity] duration-300 ease-out ${
                generationMode === "video"
                  ? "text-primary-foreground"
                  : "text-muted-foreground/75 hover:text-muted-foreground"
              }`}
            >
              {t("generate.modeVideo")}
            </button>
          </div>

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
            isGenerating={generateDirect.isPending || generateVideo.isPending}
          />

          <button
            onClick={() =>
              galleryRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className={`relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mt-1 ${
              generationMode === "video" ? "invisible pointer-events-none" : ""
            }`}
            aria-hidden={generationMode === "video"}
            tabIndex={generationMode === "video" ? -1 : 0}
          >
            {t("generate.viewTemplates")}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Template Gallery — hidden in video mode */}
      {generationMode === "image" && (
        <div ref={galleryRef}>
          <TemplateGallery
            selectedTemplateId={selectedTemplate?.id ?? null}
            onSelectTemplate={selectTemplate}
            onDeselectTemplate={deselectTemplate}
          />
        </div>
      )}
    </div>
  );
}
