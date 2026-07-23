import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Gem } from "lucide-react";
import { useGenerateDirectLarp, useGenerateVideoLarp } from "@/hooks/use-larps";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { FakeOnboardingLoader } from "@/components/larp/FakeOnboardingLoader";
import { PaywallOverlay, type PaywallPlan } from "@/components/larp/PaywallOverlay";
import { ImageUploadGrid } from "../components/generate/ImageUploadGrid";
import { PromptInputBar } from "@/components/generate/PromptInputBar";
import { TemplateSelectedPanel } from "@/components/generate/TemplateSelectedPanel";
import { UnlockedLarpView } from "@/components/generate/UnlockedLarpView";
import { LuxePaywallModal } from "@/components/generate/LuxePaywallModal";
import { useToast } from "@/hooks/use-toast";
import { useGenerationEligibility } from "@/hooks/use-generation-limits";
import { useAuth } from "@/hooks/use-auth";
import { currentPlanQueryKey } from "@/hooks/use-billing";
import { getPendingLarp, clearPendingLarp, savePendingLarp } from "@/lib/pending-larp";
import "./generate-page.css";
import {
  getPaywalledResult,
  clearPaywalledResult,
} from "@/lib/paywalled-result";
import { savePaywallImage, getPaywallImage, clearPaywallImage } from "@/lib/paywall-image";
import {
  markOnboardingResume,
  getOnboardingResume,
  clearOnboardingResume,
  dataUrlToFile,
} from "@/lib/onboarding-resume";
import { savePaywallPrompt, clearPaywallPrompt, getPaywallPrompt } from "@/lib/paywall-prompt";
import {
  clearPaywallExpiry,
  getPaywallExpiresAt,
  isPaywallExpired,
  resetPaywallExpiry,
} from "@/lib/paywall-expiry";
import {
  clearLastGeneration,
  getLastGeneration,
} from "@/lib/last-generation";
import { toGenerationImageFile } from "@/lib/video-frame";
import {
  markFakePaywallReached,
  clearFakePaywallReached,
  getFakePaywallGenerationMode,
  hasReachedFakePaywall,
} from "@/lib/fake-paywall-state";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { useTemplates } from "@/hooks/use-templates";
import type { PromptTemplate } from "@shared/schema";
import { OUTPUT_ASPECT_RATIO } from "@shared/schema";
import { templateSupportsGenerationMode } from "@/lib/template-utils";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { BrandMark } from "@/components/BrandMark";

const IMAGE_CREDIT_COST = 10;
const VIDEO_CREDIT_COST = 25;
type FakePaywallReason = "onboarding" | "insufficientCredits";
type GenerationMode = "image" | "video";

export default function Generate() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [isReturningFromCheckout] = useState(() => {
    return new URLSearchParams(window.location.search).get("checkout") === "success";
  });
  // ── Form state ──────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<({ url: string; file: File } | null)[]>([
    null,
  ]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(
    null,
  );

  // ── Generation state ────────────────────────────────────────
  const [taskId, setTaskId] = useState<string | null>(() => {
    if (isReturningFromCheckout) return null;
    return getLastGeneration()?.taskId ?? null;
  });
  const [isStartingGeneration, setIsStartingGeneration] = useState(false);
  const [autoGenerateReady, setAutoGenerateReady] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(isReturningFromCheckout);
  const [transitionBg, setTransitionBg] = useState(false);
  const [generationResultVisible, setGenerationResultVisible] = useState(
    () => !isReturningFromCheckout && !!getLastGeneration()?.taskId,
  );

  // ── Fake generation / paywall state ─────────────────────────
  const [showFakeOnboardingLoader, setShowFakeOnboardingLoader] = useState(false);
  const [fakeLoaderImageUrl, setFakeLoaderImageUrl] = useState<string | null>(null);
  const [showLuxePaywall, setShowLuxePaywall] = useState(false);
  const [fakePaywallReason, setFakePaywallReason] =
    useState<FakePaywallReason>("onboarding");
  const [paywallDefaultPlan, setPaywallDefaultPlan] = useState<PaywallPlan>("essential");
  const [savedPaywall, setSavedPaywall] = useState<{
    resultUrls: string[];
    larpId: string;
  } | null>(null);
  const [unlockedLarp, setUnlockedLarp] = useState<{
    resultUrls: string[];
    larpId: string;
    resultType: "image" | "video";
  } | null>(null);
  const [unlockingLarp, setUnlockingLarp] = useState(false);

  // ── Hooks ───────────────────────────────────────────────────
  const generateDirect = useGenerateDirectLarp();
  const generateVideo = useGenerateVideoLarp();

  // ── Mode state ─────────────────────────────────────────────
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>("image");
  const { toast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);
  const { data: eligibility, refetch: refetchEligibility } =
    useGenerationEligibility();
  const { profile, user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: templatesList } = useTemplates();

  // Fond LuxeFlexIA uniquement sur /generate
  useEffect(() => {
    document.documentElement.classList.add("luxeflexia-generate-page");
    return () => {
      document.documentElement.classList.remove("luxeflexia-generate-page");
    };
  }, []);

  // ── Stripe checkout return ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      const checkoutSessionId = params.get("session_id");
      const paywalled = getPaywalledResult();
      window.history.replaceState({}, "", "/generate");
      clearPaywalledResult();
      setSavedPaywall(null);
      clearFakePaywallReached();
      clearPaywallImage();
      clearPaywallPrompt();
      clearPaywallExpiry();

      const waitForWebhookActivation = async () => {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const res = await authFetch("/api/stripe/verify-session", {
            method: "POST",
            body: checkoutSessionId
              ? JSON.stringify({ session_id: checkoutSessionId })
              : undefined,
          });
          const data = await res.json();
          console.log("[Checkout] verify-session result:", data);
          if (data.active) return true;
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
        }
        return false;
      };

      const onVerified = async (isActive: boolean) => {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: currentPlanQueryKey });
        await refetchEligibility();

        if (!isActive) {
          setPendingLoading(false);
          return;
        }

        if (paywalled) {
          setUnlockingLarp(true);
          authFetch(
            `/api/larps/${encodeURIComponent(paywalled.taskId)}/status`,
          )
            .then((r) => r.json())
            .then((statusData) => {
              if (
                statusData.status === "success" &&
                statusData.resultUrls?.length
              ) {
                setUnlockedLarp({
                  resultUrls: statusData.resultUrls,
                  larpId: statusData.larpId,
                  resultType:
                    statusData.resultType === "video" ? "video" : generationMode,
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
            .finally(() => setUnlockingLarp(false));
        } else {
          // No paywalled result: trigger real generation from pending LARP
          // The pending LARP data was already restored into React state by the
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
      clearFakePaywallReached();
      return;
    }
    const saved = getPaywalledResult();
    if (saved) {
      setSavedPaywall({ resultUrls: saved.resultUrls, larpId: saved.larpId });
    }
  }, [profile?.is_subscriber]);

  const hasSavedPaywall = !!savedPaywall && !profile?.is_subscriber;
  const isPaywallOverlayActive = hasSavedPaywall;
  const isFullscreenOverlayActive =
    showFakeOnboardingLoader ||
    pendingLoading ||
    (!!taskId && !generationResultVisible) ||
    isPaywallOverlayActive ||
    unlockingLarp;

  useEffect(() => {
    if (taskId) {
      setGenerationResultVisible(false);
    }
  }, [taskId]);

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

  // ── Fresh visit: keep landing onboarding draft, else blank form ─
  useEffect(() => {
    if (isReturningFromCheckout) return;

    const resume = getOnboardingResume();
    const paywallPreview = getPaywallImage();
    const hasOnboardingDraft = Boolean(resume && paywallPreview);

    if (hasOnboardingDraft && resume && paywallPreview) {
      console.log("[Generate] Preserving landing onboarding draft");
      if (resume.prompt) {
        setPrompt(resume.prompt);
        savePaywallPrompt(resume.prompt);
      }
      const file = dataUrlToFile(paywallPreview);
      if (file) {
        setImages([{ url: paywallPreview, file }]);
      }
      setGenerationMode(resume.generationMode === "video" ? "video" : "image");
      setTaskId(null);
      setGenerationResultVisible(false);
      setUnlockedLarp(null);
      setSavedPaywall(null);
      setShowLuxePaywall(false);
      setPendingLoading(false);
      setAutoGenerateReady(false);
      return;
    }

    // No onboarding draft: clear sticky leftovers for a clean Créer form.
    console.log("[Generate] Clearing leftover drafts; restoring last result if any");
    clearPendingLarp();
    clearPaywallImage();
    clearPaywallPrompt();
    clearPaywallExpiry();
    clearOnboardingResume();
    clearPaywalledResult();
    clearFakePaywallReached();

    setPrompt("");
    setImages((prev) => {
      prev.forEach((slot) => {
        if (slot?.url) URL.revokeObjectURL(slot.url);
      });
      return [null];
    });
    setSelectedTemplate(null);
    setPendingTemplateId(null);
    setPendingLoading(false);
    setAutoGenerateReady(false);
    setUnlockedLarp(null);
    setSavedPaywall(null);
    setShowLuxePaywall(false);
    setShowFakeOnboardingLoader(false);

    const last = getLastGeneration();
    if (last?.taskId) {
      setTaskId(last.taskId);
      setGenerationResultVisible(true);
    } else {
      setTaskId(null);
      setGenerationResultVisible(false);
    }
  }, [isReturningFromCheckout]);

  // Resume landing → auth → fake loader → blurred lock paywall.
  useEffect(() => {
    if (isReturningFromCheckout || isAuthLoading) return;
    if (showFakeOnboardingLoader || taskId || pendingLoading || unlockingLarp) {
      return;
    }
    if (profile?.is_subscriber || profile?.role === "admin") return;

    const resume = getOnboardingResume();
    const paywallPreview = getPaywallImage();
    if (!paywallPreview) return;

    // Already showed the loader once: jump back to locked preview if still valid.
    if (hasReachedFakePaywall(profile?.id)) {
      if (resume) clearOnboardingResume();
      if (!isPaywallExpired(getPaywallExpiresAt())) {
        navigate("/image-prete?paywall=1");
      }
      return;
    }

    // Need an onboarding intent (landing CTA) to auto-start the fake flow.
    if (!resume) return;

    console.log("[Generate] Starting onboarding fake loader → image-prete");
    if (resume.prompt) {
      setPrompt(resume.prompt);
      savePaywallPrompt(resume.prompt);
    }
    const file = dataUrlToFile(paywallPreview);
    if (file) {
      setImages([{ url: paywallPreview, file }]);
    }
    setGenerationMode(resume.generationMode === "video" ? "video" : "image");
    setFakePaywallReason("onboarding");
    setShowLuxePaywall(false);
    setFakeLoaderImageUrl(paywallPreview);
    setShowFakeOnboardingLoader(true);
  }, [
    isAuthLoading,
    isReturningFromCheckout,
    navigate,
    pendingLoading,
    profile?.id,
    profile?.is_subscriber,
    profile?.role,
    showFakeOnboardingLoader,
    taskId,
    unlockingLarp,
  ]);

  // ── Restore pending LARP only after Stripe checkout return ─
  useEffect(() => {
    if (!isReturningFromCheckout) return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("[Generate] Pending LARP timeout — forcing pendingLoading=false");
        setPendingLoading(false);
      }
    }, 5000);

    const resumeFromLocalStorage = () => {
      const resume = getOnboardingResume();
      const paywallPreview = getPaywallImage();
      if (!resume || !paywallPreview) {
        console.log("[Generate] No pending LARP / onboarding resume found");
        setPendingLoading(false);
        return;
      }

      console.log("[Generate] Resuming onboarding from localStorage (checkout)");
      setPendingLoading(true);
      setGenerationMode(resume.generationMode);
      if (resume.prompt) {
        setPrompt(resume.prompt);
        savePaywallPrompt(resume.prompt);
      }

      const file = dataUrlToFile(paywallPreview);
      if (file) {
        setImages([{ url: paywallPreview, file }]);
      }
      setAutoGenerateReady(true);
    };

    getPendingLarp()
      .then((pending) => {
        if (cancelled) return;
        if (!pending) {
          resumeFromLocalStorage();
          return;
        }
        console.log("[Generate] Pending LARP found for checkout:", {
          prompt: pending.prompt,
          images: pending.images.length,
          generationMode: pending.generationMode ?? "image",
          templateId: pending.templateId ?? null,
        });
        setPendingLoading(true);
        setGenerationMode("image");
        setPendingTemplateId(pending.templateId ?? null);
        if (pending.prompt) setPrompt(pending.prompt);
        if (!pending.templateId) {
          if (pending.images.length > 0) {
            const restored = pending.images.map((file) => ({
              url: URL.createObjectURL(file),
              file,
            }));
            setImages(restored);
            void savePaywallImage(pending.images[0]);
          } else {
            const paywallPreview = getPaywallImage();
            const file = paywallPreview ? dataUrlToFile(paywallPreview) : null;
            if (file && paywallPreview) {
              setImages([{ url: paywallPreview, file }]);
            }
          }
        }
        markOnboardingResume({
          prompt: pending.prompt || "",
          generationMode: pending.generationMode === "video" ? "video" : "image",
        });
        if (pending.prompt) {
          savePaywallPrompt(pending.prompt);
        }
        console.log("[Generate] Returning from checkout, keeping loader while waiting for verify-session");
      })
      .catch((err) => {
        console.error("[Generate] getPendingLarp error:", err);
        if (!cancelled) resumeFromLocalStorage();
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isReturningFromCheckout]);

  useEffect(() => {
    if (!pendingTemplateId || selectedTemplate || !templatesList) return;
    const tpl = templatesList.find((t) => t.id === pendingTemplateId);
    if (!tpl) return;
    setSelectedTemplate(tpl);
    setGenerationMode("image");
  }, [pendingTemplateId, selectedTemplate, templatesList]);

  const loaderInputImageUrl = useMemo(() => {
    if (images[0]?.url) return images[0].url;

    const activeTemplate =
      selectedTemplate ??
      (pendingTemplateId && templatesList
        ? templatesList.find((t) => t.id === pendingTemplateId)
        : undefined);

    if (activeTemplate) {
      return (
        activeTemplate.example_after_url ||
        activeTemplate.example_before_url ||
        undefined
      );
    }

    return undefined;
  }, [
    images,
    selectedTemplate,
    pendingTemplateId,
    templatesList,
  ]);

  // ── Image & template handlers ───────────────────────────────
  // Object URLs leak memory if not revoked once the preview is gone.
  const revokeSlotUrl = useCallback(
    (slot: { url: string; file: File } | null) => {
      if (slot?.url.startsWith("blob:")) URL.revokeObjectURL(slot.url);
    },
    [],
  );

  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      revokeSlotUrl(prev[index]);
      const next = [...prev];
      next[index] = { url, file };
      const maxSlots = generationMode === "video" ? 1 : 3;
      const allFilled = !next.some((img) => img === null);
      if (allFilled && next.length < maxSlots) {
        next.push(null);
      }
      return next;
    });
    if (index === 0) {
      void toGenerationImageFile(file)
        .then((imageFile) => savePaywallImage(imageFile))
        .catch(() => {
          // Paywall blur preview is optional; ignore frame extraction failures.
        });
    }
  };

  const removeSlot = (index: number) => {
    setImages((prev) => {
      revokeSlotUrl(prev[index]);
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [null] : next;
    });
  };

  const selectTemplate = (tpl: PromptTemplate) => {
    setSelectedTemplate(tpl);
    setPendingTemplateId(null);
    setPrompt("");
    setImages((prev) => {
      prev.forEach(revokeSlotUrl);
      return [null];
    });
    setGenerationMode("image");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deselectTemplate = () => {
    setSelectedTemplate(null);
    setPendingTemplateId(null);
    setPrompt("");
    setImages((prev) => {
      prev.forEach(revokeSlotUrl);
      return [null];
    });
  };

  // ── Generation ──────────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const startInsufficientCreditsFlow = useCallback(
    (context?: {
      currentCredits?: number;
      requiredCredits?: number;
      generationMode?: GenerationMode;
    }) => {
      void context;
      setPendingLoading(false);
      setShowLuxePaywall(true);
      setPaywallDefaultPlan("essential");
      setFakePaywallReason("insufficientCredits");
    },
    [],
  );

  const finishFakeOnboardingLoader = useCallback(() => {
    setShowFakeOnboardingLoader(false);
    setFakeLoaderImageUrl(null);
    markFakePaywallReached(profile?.id, "image");
    // Fresh 15:00 countdown starts when the locked preview is shown.
    resetPaywallExpiry();
    clearOnboardingResume();
    navigate("/image-prete?paywall=1");
  }, [navigate, profile?.id]);

  const startOnboardingPaywallFlow = useCallback(() => {
    setPendingLoading(false);
    setFakePaywallReason("onboarding");
    setShowLuxePaywall(false);
    setFakeLoaderImageUrl(
      images[0]?.url || getPaywallImage() || null,
    );
    setShowFakeOnboardingLoader(true);
  }, [images]);

  const storedPaywallGenerationMode =
    profile?.id != null
      ? getFakePaywallGenerationMode(profile.id)
      : "image";
  const activePaywallGenerationMode =
    generationMode === "video" ? "video" : storedPaywallGenerationMode;
  const isSubmittingGeneration =
    isStartingGeneration || generateDirect.isPending || generateVideo.isPending;

  const handleGenerate = async () => {
    const selectedOrPendingTemplateId =
      selectedTemplate?.id ?? pendingTemplateId ?? undefined;
    const isTemplateGeneration = Boolean(selectedOrPendingTemplateId);

    const activeTemplate =
      selectedTemplate ??
      (pendingTemplateId && templatesList
        ? templatesList.find((t) => t.id === pendingTemplateId)
        : undefined);

    const files = images.filter(
      (img): img is { url: string; file: File } => img !== null,
    );
    const filesForGeneration =
      generationMode === "video" ? files.slice(0, 1) : files;

    if (isTemplateGeneration && activeTemplate) {
      if ((activeTemplate.reference_image_count ?? 0) === 0) {
        toast({
          variant: "destructive",
          title: t("generate.referenceImageRequiredTitle"),
          description: t("templateSelected.noReferenceImages"),
        });
        return;
      }
      if (!templateSupportsGenerationMode(activeTemplate, generationMode)) {
        toast({
          variant: "destructive",
          title: t("generate.templateModeUnavailableTitle"),
          description: t("generate.templateModeUnavailableDescription"),
        });
        return;
      }
    } else if (filesForGeneration.length === 0) {
      toast({
        variant: "destructive",
        title:
          generationMode === "video"
            ? t("generate.referenceVideoRequiredTitle")
            : t("generate.referenceImageRequiredTitle"),
        description:
          generationMode === "video"
            ? t("generate.referenceVideoRequiredDescription")
            : t("generate.referenceImageRequiredDescription"),
      });
      return;
    }

    const serverPrompt = isTemplateGeneration
      ? selectedTemplate?.prompt_text?.trim() || " "
      : prompt.trim();

    const saveCurrentDraftForCheckout = async () => {
      try {
        const draftImages = isTemplateGeneration
          ? []
          : await Promise.all(
              filesForGeneration.map((f) => toGenerationImageFile(f.file)),
            );
        await savePendingLarp({
          prompt: serverPrompt,
          images: draftImages,
          generationMode,
          templateId: selectedOrPendingTemplateId,
          timestamp: Date.now(),
        });
        return true;
      } catch (error) {
        console.error("[Generate] Failed to save pending generation draft:", error);
        return false;
      }
    };

    const requiredCredits =
      generationMode === "video" ? VIDEO_CREDIT_COST : IMAGE_CREDIT_COST;
    // Non-subscribers always get fake loading → paywall (even with 0 credits).
    // Never open the paywall directly from Créer for this audience.
    const shouldUseOnboardingPaywall =
      profile &&
      !profile.is_subscriber &&
      profile.role !== "admin" &&
      !isReturningFromCheckout;

    if (shouldUseOnboardingPaywall) {
      markOnboardingResume({
        prompt: serverPrompt,
        generationMode,
      });
      savePaywallPrompt(serverPrompt);

      if (filesForGeneration[0]) {
        try {
          await savePaywallImage(
            await toGenerationImageFile(filesForGeneration[0].file),
          );
          clearPaywallExpiry();
        } catch {
          /* preview optional */
        }
      } else if (!getPaywallImage()) {
        toast({
          variant: "destructive",
          title:
            generationMode === "video"
              ? t("generate.referenceVideoRequiredTitle")
              : t("generate.referenceImageRequiredTitle"),
          description:
            generationMode === "video"
              ? t("generate.referenceVideoRequiredDescription")
              : t("generate.referenceImageRequiredDescription"),
        });
        return;
      }

      // Best-effort draft for Stripe return — never block the fake loader on IDB failure (common on mobile Safari).
      await saveCurrentDraftForCheckout();

      startOnboardingPaywallFlow();
      return;
    }

    if (
      !isReturningFromCheckout &&
      profile &&
      profile.role !== "admin" &&
      profile.credits < requiredCredits
    ) {
      await saveCurrentDraftForCheckout();
      startInsufficientCreditsFlow({
        currentCredits: profile.credits,
        requiredCredits,
        generationMode,
      });
      return;
    }

    // Skip client-side eligibility check when returning from checkout:
    // the cached data is stale (user just got credits via Stripe).
    // Server will still validate credits.
    if (!isReturningFromCheckout && eligibility && !eligibility.canGenerate) {
      await saveCurrentDraftForCheckout();
      startInsufficientCreditsFlow({
        currentCredits: profile?.credits ?? 0,
        requiredCredits,
        generationMode,
      });
      return;
    }

    try {
      setIsStartingGeneration(true);
      setPendingLoading(true);
      clearLastGeneration();
      clearPendingLarp();
      clearOnboardingResume();

      // Instant UI debit so the header diamond updates on click (server still authoritative).
      if (profile?.role !== "admin" && user?.id) {
        const debit = requiredCredits;
        queryClient.setQueryData(["profile", user.id], (old: typeof profile) => {
          if (!old) return old;
          return {
            ...old,
            credits: Math.max(0, (old.credits ?? 0) - debit),
          };
        });
        queryClient.setQueryData(currentPlanQueryKey, (old: any) => {
          if (!old || typeof old.credits !== "number") return old;
          return {
            ...old,
            credits: Math.max(0, old.credits - debit),
          };
        });
      }

      // ── Video mode ───────────────────────────────────────────
      if (generationMode === "video") {
        const base64Images = isTemplateGeneration
          ? undefined
          : await Promise.all(
              filesForGeneration.map(async (img) =>
                fileToBase64(await toGenerationImageFile(img.file)),
              ),
            );

        const result = await generateVideo.mutateAsync({
          prompt: serverPrompt,
          aspect_ratio: OUTPUT_ASPECT_RATIO,
          images: base64Images && base64Images.length > 0 ? base64Images : undefined,
          template_id: selectedOrPendingTemplateId,
          use_face_asset: false,
        });
        setPaywallDefaultPlan("essential");
        setTaskId(result.taskId);
        setPendingLoading(false);
        void refetchEligibility();
        return;
      }

      // ── Image mode (existing logic) ──────────────────────────
      const base64Images = isTemplateGeneration
        ? undefined
        : await Promise.all(
            filesForGeneration.map(async (img) =>
              fileToBase64(await toGenerationImageFile(img.file)),
            ),
          );

      const result = await generateDirect.mutateAsync({
        prompt: serverPrompt,
        aspect_ratio: OUTPUT_ASPECT_RATIO,
        images: base64Images && base64Images.length > 0 ? base64Images : undefined,
        template_id: selectedOrPendingTemplateId,
        use_face_asset: false,
      });
      setTaskId(result.taskId);
      setPendingLoading(false);
      void refetchEligibility();
    } catch (error: any) {
      setPendingLoading(false);
      // Restore balances from server if generation failed after optimistic debit.
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: currentPlanQueryKey });
      if (error.code === "REFERENCE_IMAGE_REQUIRED") {
        toast({
          variant: "destructive",
          title: t("generate.referenceImageRequiredTitle"),
          description: t("generate.referenceImageRequiredDescription"),
        });
        return;
      }
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
        setPaywallDefaultPlan("essential");
        setFakePaywallReason("onboarding");
        setShowLuxePaywall(true);
        return;
      }
      if (
        error.status === 403 &&
        (normalizedMessage.includes("credit") ||
          normalizedMessage.includes("credits") ||
          normalizedMessage.includes("jeton"))
      ) {
        await saveCurrentDraftForCheckout();
        startInsufficientCreditsFlow({
          currentCredits: profile?.credits ?? 0,
          requiredCredits,
          generationMode,
        });
        return;
      }
      toast({
        variant: "destructive",
        title: t("common.messages.error"),
        description: message,
      });
    } finally {
      setIsStartingGeneration(false);
    }
  };

  const handleReset = useCallback(() => {
    setTaskId(null);
    setGenerationResultVisible(false);
    setPendingLoading(false);
    setAutoGenerateReady(false);
    setIsStartingGeneration(false);
    setShowLuxePaywall(false);
    clearLastGeneration();
    clearPendingLarp();
    setPrompt("");
    setImages((prev) => {
      prev.forEach(revokeSlotUrl);
      return [null];
    });
    setSelectedTemplate(null);
    setPendingTemplateId(null);
    setGenerationMode("image");
    setFakePaywallReason("onboarding");
    refetchEligibility();
  }, [refetchEligibility]);

  useEffect(() => {
    const handleCreateNewLarp = () => {
      setUnlockedLarp(null);
      setUnlockingLarp(false);
      setSavedPaywall(null);
      setShowLuxePaywall(false);
      setTransitionBg(false);
      clearPendingLarp();
      clearPaywalledResult();
      clearPaywallImage();
      clearPaywallPrompt();
      clearPaywallExpiry();
      clearOnboardingResume();
      handleReset();
      window.requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ block: "start" });
      });
    };

    window.addEventListener("larpking:create-new-larp", handleCreateNewLarp);
    return () => {
      window.removeEventListener("larpking:create-new-larp", handleCreateNewLarp);
    };
  }, [handleReset]);

  // ── Auto-generate when pending LARP data has been restored ──
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

    // Hard guard: never auto-bill when revisiting Créer.
    // Real auto-generate is allowed only right after Stripe checkout.
    if (!isReturningFromCheckout) {
      console.log("[Generate] Skipping auto-generate (not a checkout return)");
      setPendingLoading(false);
      return;
    }

    console.log(
      "[Generate] Auto-generate ready, prompt:",
      JSON.stringify(prompt.slice(0, 50)),
    );
    const canAutoGenerate =
      Boolean(pendingTemplateId || selectedTemplate) ||
      prompt.trim().length > 0 ||
      images.some((img) => img !== null) ||
      Boolean(getPaywallImage());
    if (!canAutoGenerate) {
      console.log("[Generate] Nothing to auto-generate, skipping");
      setPendingLoading(false);
      return;
    }

    const requiredCredits =
      generationMode === "video" ? VIDEO_CREDIT_COST : IMAGE_CREDIT_COST;
    if (
      profile &&
      profile.role !== "admin" &&
      profile.credits < requiredCredits
    ) {
      console.log("[Generate] Starting insufficient credits fake flow...");
      startInsufficientCreditsFlow({
        currentCredits: profile.credits,
        requiredCredits,
        generationMode,
      });
      return;
    }

    // Real generation after checkout
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

  const lxCreamBgStyle = {
    background:
      "linear-gradient(160deg, #ffffff 0%, #f5f0e8 48%, #ebe6df 100%)",
    backgroundImage:
      "linear-gradient(160deg, #ffffff 0%, #f5f0e8 48%, #ebe6df 100%)",
  } as const;

  // ── Transition backdrop ─────────────────────────────────────
  const transitionBackdrop = transitionBg
    ? createPortal(
      <div className="fixed inset-0 z-[99]" style={lxCreamBgStyle} />,
      document.body,
    )
    : null;

  // ── Debug logging ───────────────────────────────────────────
  console.log("[Generate] Render:", {
    taskId: !!taskId,
    pendingLoading,
    transitionBg,
    savedPaywall: !!savedPaywall,
    showLuxePaywall,
  });

  // ── Portal overlays ─────────────────────────────────────────
  const generationProgress = taskId ? (
    <GenerationProgress
      taskId={taskId}
      inputImageUrl={loaderInputImageUrl}
      onReset={handleReset}
      onResultVisible={() => setGenerationResultVisible(true)}
      resultType={generationMode}
    />
  ) : null;

  const portalOverlay = pendingLoading
    ? createPortal(
      <div
        className="fixed inset-0 z-[100] w-full"
        style={lxCreamBgStyle}
        role="status"
        aria-live="polite"
      >
        {/* Wordmark pinned to true viewport center; spinner sits below with mt-8 */}
        <div className="absolute left-1/2 top-1/2 flex w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center px-4">
          <div className="inline-flex items-center justify-center gap-2.5 md:gap-3">
            <Gem
              className="h-8 w-8 shrink-0 text-[var(--lx-gold)] md:h-10 md:w-10"
              strokeWidth={1.75}
              aria-hidden
            />
            <BrandMark className="text-3xl font-semibold leading-none text-[var(--lx-ink)] md:text-4xl" />
          </div>
          <Loader2 className="mt-8 h-6 w-6 animate-spin text-[var(--lx-gold)]" />
        </div>
      </div>,
      document.body,
    )
    : null;

  const paywallOverlayClassName =
    "fixed inset-0 z-[100] overflow-hidden animate-in fade-in duration-300";

  const paywallOverlayInnerClassName =
    "absolute inset-x-0 top-20 bottom-0 flex min-h-0 items-stretch justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:top-24 md:bottom-10";

  const luxePreviewImageUrl =
    images[0]?.url || getPaywallImage() || "";
  const luxePreviewPrompt = prompt.trim() || getPaywallPrompt() || null;

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // -- Fake onboarding "generation" loader (no API)
  if (showFakeOnboardingLoader) {
    return (
      <FakeOnboardingLoader
        inputImageUrl={fakeLoaderImageUrl}
        onComplete={finishFakeOnboardingLoader}
      />
    );
  }

  // -- Generation in progress
  if (taskId) {
    return (
      <>
        {transitionBackdrop}
        {generationProgress}
      </>
    );
  }

  // -- Loading pending LARP from hero flow
  if (pendingLoading) {
    return (
      <>
        {transitionBackdrop}
        {portalOverlay}
      </>
    );
  }

  // -- Loading unlocked LARP after payment
  if (unlockingLarp) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 min-h-[calc(100vh-12rem)] animate-in fade-in duration-300">
        <div className="h-7 w-48 rounded-full bg-muted animate-pulse" />
        <div className="w-full max-w-[260px] aspect-[9/16] rounded-lg bg-muted animate-pulse" />
        <div className="h-11 w-56 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  // -- Unlocked LARP after successful payment
  if (unlockedLarp) {
    return (
      <UnlockedLarpView
        resultUrls={unlockedLarp.resultUrls}
        larpId={unlockedLarp.larpId}
        resultType={unlockedLarp.resultType}
        posterUrl={
          images[0]?.url ?? getPaywallImage() ?? undefined
        }
        onReset={() => {
          setUnlockedLarp(null);
          handleReset();
        }}
      />
    );
  }

  // -- Persistent paywall for non-subscribers with a previous generation
  if (hasSavedPaywall && savedPaywall?.resultUrls?.[0]) {
    return createPortal(
      <div className={paywallOverlayClassName} style={lxCreamBgStyle}>
        <div className={paywallOverlayInnerClassName}>
          <PaywallOverlay
            imageUrl={savedPaywall.resultUrls[0]}
            generationMode={activePaywallGenerationMode}
          />
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
        className="relative flex flex-col items-center justify-start gap-3 min-h-0 pt-2 pb-4 md:min-h-[calc(100vh-12rem)] md:justify-center md:pt-4"
      >
        {/* Images + input group */}
        <div className="relative flex flex-col items-center gap-3 md:gap-4 w-full">
          {selectedTemplate ? (
            <TemplateSelectedPanel
              template={selectedTemplate}
              generationMode={generationMode}
              onDeselect={deselectTemplate}
              onGenerate={handleGenerate}
              isGenerating={isSubmittingGeneration}
              creditCost={IMAGE_CREDIT_COST}
            />
          ) : (
            <>
              <ImageUploadGrid
                images={images}
                onImageSelect={handleImageSelect}
                onRemoveSlot={removeSlot}
                generationMode="image"
              />

              <PromptInputBar
                prompt={prompt}
                onPromptChange={setPrompt}
                onGenerate={handleGenerate}
                isGenerating={isSubmittingGeneration}
                goldCta
                creditCost={IMAGE_CREDIT_COST}
                canGenerate={images.some((img) => img !== null)}
              />
            </>
          )}
        </div>
      </div>

      <LuxePaywallModal
        open={showLuxePaywall}
        onOpenChange={setShowLuxePaywall}
        imageUrl={luxePreviewImageUrl}
        prompt={luxePreviewPrompt}
        defaultPlan={paywallDefaultPlan}
      />
    </div>
  );
}
