import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, ChevronDown, RefreshCw, ScanFace } from "lucide-react";
import { useGenerateDirectLarp, useGenerateVideoLarp } from "@/hooks/use-larps";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { GenerationLoader } from "@/components/larp/GenerationLoader";
import { PaywallOverlay, type PaywallPlan } from "@/components/larp/PaywallOverlay";
import { ImageUploadGrid } from "../components/generate/ImageUploadGrid";
import { PromptInputBar } from "@/components/generate/PromptInputBar";
import { TemplateGallery } from "@/components/generate/TemplateGallery";
import { TemplateSelectedPanel } from "@/components/generate/TemplateSelectedPanel";
import { FaceAssetControls } from "@/components/generate/FaceAssetControls";
import { UnlockedLarpView } from "@/components/generate/UnlockedLarpView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGenerationEligibility } from "@/hooks/use-generation-limits";
import { useAuth } from "@/hooks/use-auth";
import { currentPlanQueryKey } from "@/hooks/use-billing";
import { getPendingLarp, clearPendingLarp, savePendingLarp } from "@/lib/pending-larp";
import {
  getPaywalledResult,
  clearPaywalledResult,
} from "@/lib/paywalled-result";
import { savePaywallImage, getPaywallImage, clearPaywallImage } from "@/lib/paywall-image";
import {
  markFakePaywallReached,
  hasReachedFakePaywall,
  clearFakePaywallReached,
  getFakePaywallGenerationMode,
} from "@/lib/fake-paywall-state";
import { useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import {
  hasCompleteFaceCapture,
  loadFaceCapturePreviewUrl,
} from "@/lib/face-capture-generation";
import { useLatestFaceCapture } from "@/hooks/use-face-captures";
import { useTemplates } from "@/hooks/use-templates";
import type { PromptTemplate } from "@shared/schema";
import { OUTPUT_ASPECT_RATIO } from "@shared/schema";
import { templateRequiresFaceCapture, templateSupportsGenerationMode, getTemplateDefaultGenerationMode } from "@/lib/template-utils";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

const FAKE_LOADER_MIN_DELAY_MS = 10_000;
const FAKE_LOADER_MAX_DELAY_MS = 20_000;
const IMAGE_CREDIT_COST = 10;
const VIDEO_CREDIT_COST = 25;
type FakePaywallReason = "onboarding" | "insufficientCredits";
type GenerationMode = "image" | "video";
type InsufficientCreditsContext = {
  currentCredits: number;
  requiredCredits: number;
  generationMode: GenerationMode;
};

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
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
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
  const [facePreviewUrl, setFacePreviewUrl] = useState<string | null>(null);

  // ── Generation state ────────────────────────────────────────
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isStartingGeneration, setIsStartingGeneration] = useState(false);
  const [autoGenerateReady, setAutoGenerateReady] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(isReturningFromCheckout);
  const [transitionBg, setTransitionBg] = useState(false);
  const [generationResultVisible, setGenerationResultVisible] = useState(false);

  // ── Fake generation / paywall state ─────────────────────────
  const [isFakeGenerating, setIsFakeGenerating] = useState(false);
  const [fakeLoaderStatus, setFakeLoaderStatus] = useState<"connecting" | "waiting" | "success">("connecting");
  const [showFakePaywall, setShowFakePaywall] = useState(false);
  const [fakePaywallReason, setFakePaywallReason] =
    useState<FakePaywallReason>("onboarding");
  const [paywallDefaultPlan, setPaywallDefaultPlan] = useState<PaywallPlan>("essential");
  const [faceScanPromptOpen, setFaceScanPromptOpen] = useState(false);
  const [faceScanPromptMode, setFaceScanPromptMode] = useState<"start" | "review">("start");
  const [faceScanPreviewLoading, setFaceScanPreviewLoading] = useState(false);
  const [faceScanPreviewError, setFaceScanPreviewError] = useState<string | null>(null);
  const [holdFaceAutoEnable, setHoldFaceAutoEnable] = useState(false);
  const [insufficientCreditsContext, setInsufficientCreditsContext] =
    useState<InsufficientCreditsContext>({
      currentCredits: 0,
      requiredCredits: IMAGE_CREDIT_COST,
      generationMode: "image",
    });
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
  const galleryRef = useRef<HTMLDivElement>(null);
  const handledFaceScanReviewRef = useRef(false);
  const { data: eligibility, refetch: refetchEligibility } =
    useGenerationEligibility();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: templatesList } = useTemplates();
  const latestFaceCapture = useLatestFaceCapture();
  const refetchLatestFaceCapture = latestFaceCapture.refetch;
  const faceCaptureReady = hasCompleteFaceCapture(latestFaceCapture.data);
  const [useFaceAsset, setUseFaceAsset] = useState(false);

  useEffect(() => {
    if (!faceCaptureReady) {
      setUseFaceAsset(false);
      return;
    }

    if (!holdFaceAutoEnable) {
      setUseFaceAsset(true);
    }
  }, [faceCaptureReady, holdFaceAutoEnable, selectedTemplate?.id]);

  const handleUseFaceAssetChange = useCallback(
    (value: boolean) => {
      if (value && !faceCaptureReady) {
        setUseFaceAsset(false);
        setFaceScanPromptMode("start");
        setFaceScanPromptOpen(true);
        return;
      }

      setUseFaceAsset(value);
      if (value) {
        setHoldFaceAutoEnable(false);
      }
    },
    [faceCaptureReady],
  );

  const handleStartFaceScan = useCallback(() => {
    setFaceScanPromptOpen(false);
    setFaceScanPromptMode("start");
    navigate("/face-capture");
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("faceScan") !== "review") return;
    if (handledFaceScanReviewRef.current) return;
    handledFaceScanReviewRef.current = true;

    window.history.replaceState({}, "", "/generate");
    setHoldFaceAutoEnable(true);
    setUseFaceAsset(false);
    setFacePreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return null;
    });
    setFaceScanPromptMode("review");
    setFaceScanPromptOpen(true);
    setFaceScanPreviewLoading(true);
    setFaceScanPreviewError(null);

    let cancelled = false;
    void refetchLatestFaceCapture();
    loadFaceCapturePreviewUrl()
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (!url) {
          setFaceScanPreviewError(
            t("templateSelected.faceScanReviewLoadError", {
              defaultValue: "Impossible de charger la preview du scan.",
            }),
          );
          return;
        }
        setFacePreviewUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return url;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFaceScanPreviewError(
            t("templateSelected.faceScanReviewLoadError", {
              defaultValue: "Impossible de charger la preview du scan.",
            }),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setFaceScanPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, refetchLatestFaceCapture, t]);

  const handleUseReviewedFaceScan = useCallback(() => {
    setHoldFaceAutoEnable(false);
    setUseFaceAsset(true);
    setFaceScanPromptOpen(false);
    setFaceScanPromptMode("start");
  }, []);

  const handleFaceScanPromptOpenChange = useCallback((open: boolean) => {
    setFaceScanPromptOpen(open);
    if (!open) {
      setFaceScanPromptMode("start");
    }
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

      const waitForWebhookActivation = async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const res = await authFetch("/api/stripe/verify-session", {
            method: "POST",
            body: checkoutSessionId
              ? JSON.stringify({ session_id: checkoutSessionId })
              : undefined,
          });
          const data = await res.json();
          console.log("[Checkout] verify-session result:", data);
          if (data.active) return true;
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
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
  const isPaywallOverlayActive = showFakePaywall || hasSavedPaywall;
  const isFullscreenOverlayActive =
    pendingLoading ||
    (!!taskId && !generationResultVisible) ||
    isFakeGenerating ||
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

  // ── Restore pending LARP from IndexedDB ─────────────────────
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn("[Generate] Pending LARP timeout — forcing pendingLoading=false");
        setPendingLoading(false);
      }
    }, 5000);
    getPendingLarp()
      .then((pending) => {
        if (cancelled) return;
        if (!pending) {
          console.log("[Generate] No pending LARP found");
          setPendingLoading(false);
          return;
        }
        console.log("[Generate] Pending LARP found:", {
          prompt: pending.prompt,
          images: pending.images.length,
          generationMode: pending.generationMode ?? "image",
          templateId: pending.templateId ?? null,
        });
        setPendingLoading(true);
        setGenerationMode(pending.generationMode ?? "image");
        setPendingTemplateId(pending.templateId ?? null);
        if (pending.prompt) setPrompt(pending.prompt);
        if (pending.templateId) {
          void (async () => {
            const url = await loadFaceCapturePreviewUrl();
            if (!url) return;
            setFacePreviewUrl(url);
            try {
              const blob = await fetch(url).then((r) => r.blob());
              await savePaywallImage(
                new File([blob], "face-frontal.jpg", { type: "image/jpeg" }),
              );
            } catch {
              /* paywall preview optional */
            }
          })();
        } else if (pending.images.length > 0) {
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
        // NOTE: We do NOT clear the pending LARP here.
        // It will be cleared when a real generation starts (in handleGenerate).
        // This ensures data persists through the fake loader → paywall → Stripe checkout flow.
      })
      .catch((err) => {
        console.error("[Generate] getPendingLarp error:", err);
        if (!cancelled) setPendingLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!pendingTemplateId || selectedTemplate || !templatesList) return;
    const tpl = templatesList.find((t) => t.id === pendingTemplateId);
    if (!tpl) return;
    setSelectedTemplate(tpl);
    setGenerationMode((current) =>
      templateSupportsGenerationMode(tpl, current)
        ? current
        : getTemplateDefaultGenerationMode(tpl),
    );
  }, [pendingTemplateId, selectedTemplate, templatesList]);

  useEffect(() => {
    return () => {
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
    };
  }, [facePreviewUrl]);

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

    return facePreviewUrl ?? undefined;
  }, [
    images,
    selectedTemplate,
    pendingTemplateId,
    templatesList,
    facePreviewUrl,
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
    if (index === 0) savePaywallImage(file);
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
    setGenerationMode(getTemplateDefaultGenerationMode(tpl));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deselectTemplate = () => {
    if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
    setFacePreviewUrl(null);
    setSelectedTemplate(null);
    setPendingTemplateId(null);
    setPrompt("");
    setImages((prev) => {
      prev.forEach(revokeSlotUrl);
      return [null];
    });
  };

  const handleGenerationModeChange = (mode: GenerationMode) => {
    if (
      selectedTemplate &&
      !templateSupportsGenerationMode(selectedTemplate, mode)
    ) {
      return;
    }

    setGenerationMode(mode);
    setPendingTemplateId(null);

    if (!selectedTemplate) {
      setImages((prev) => {
        const next = mode === "video" ? prev.slice(0, 1) : prev;
        return next.length === 0 ? [null] : next;
      });
    }
  };

  const imageModeDisabled =
    Boolean(selectedTemplate) &&
    !templateSupportsGenerationMode(selectedTemplate!, "image");
  const videoModeDisabled =
    Boolean(selectedTemplate) &&
    !templateSupportsGenerationMode(selectedTemplate!, "video");

  // ── Generation ──────────────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const startInsufficientCreditsFlow = useCallback(
    (context?: Partial<InsufficientCreditsContext>) => {
      const requiredCredits =
        context?.requiredCredits ??
        (generationMode === "video" ? VIDEO_CREDIT_COST : IMAGE_CREDIT_COST);

      setPendingLoading(false);
      setShowFakePaywall(false);
      setIsFakeGenerating(true);
      setPaywallDefaultPlan("essential");
      setFakePaywallReason("insufficientCredits");
      setInsufficientCreditsContext({
        currentCredits: context?.currentCredits ?? profile?.credits ?? 0,
        requiredCredits,
        generationMode: context?.generationMode ?? generationMode,
      });
    },
    [generationMode, profile?.credits],
  );

  const startOnboardingPaywallFlow = useCallback(
    (options?: { showPaywallImmediately?: boolean }) => {
      const showPaywallImmediately = options?.showPaywallImmediately ?? false;
      setPendingLoading(false);
      setShowFakePaywall(showPaywallImmediately);
      setFakePaywallReason("onboarding");
      setIsFakeGenerating(!showPaywallImmediately);
    },
    [],
  );

  const shouldSkipFakeLoader =
    profile?.id != null && hasReachedFakePaywall(profile.id);
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
        title: t("generate.referenceImageRequiredTitle"),
        description: t("generate.referenceImageRequiredDescription"),
      });
      return;
    }

    const templateNeedsFace = activeTemplate
      ? templateRequiresFaceCapture(activeTemplate)
      : true;

    if (isTemplateGeneration && useFaceAsset && !faceCaptureReady) {
      toast({
        variant: "destructive",
        title: t("templateSelected.faceRequired"),
        description: t("generate.scanFace"),
      });
      return;
    }

    if (!isTemplateGeneration && useFaceAsset && !faceCaptureReady) {
      toast({
        variant: "destructive",
        title: t("templateSelected.faceRequired"),
        description: t("generate.scanFace"),
      });
      return;
    }

    if (isTemplateGeneration && templateNeedsFace && !useFaceAsset) {
      toast({
        variant: "destructive",
        title: t("templateSelected.faceRequiredForTemplate"),
        description: t("templateSelected.useFace"),
      });
      return;
    }

    const serverPrompt = isTemplateGeneration
      ? selectedTemplate?.prompt_text?.trim() || " "
      : prompt.trim();

    const saveCurrentDraftForCheckout = async () => {
      try {
        await savePendingLarp({
          prompt: serverPrompt,
          images: isTemplateGeneration
            ? []
            : filesForGeneration.map((f) => f.file),
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
    const shouldUseOnboardingPaywall =
      profile &&
      !profile.is_subscriber &&
      profile.role !== "admin" &&
      !isReturningFromCheckout;

    if (shouldUseOnboardingPaywall && isTemplateGeneration) {
      const saved = await saveCurrentDraftForCheckout();
      if (!saved) {
        toast({
          variant: "destructive",
          title: t("common.messages.error"),
          description: t("generate.serverRetry"),
        });
        return;
      }

      startOnboardingPaywallFlow({
        showPaywallImmediately: shouldSkipFakeLoader,
      });
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

    if (shouldUseOnboardingPaywall) {
      const saved = await saveCurrentDraftForCheckout();
      if (!saved) {
        toast({
          variant: "destructive",
          title: t("common.messages.error"),
          description: t("generate.serverRetry"),
        });
        return;
      }

      startOnboardingPaywallFlow({
        showPaywallImmediately: shouldSkipFakeLoader,
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
      clearPendingLarp();

      // ── Video mode ───────────────────────────────────────────
      if (generationMode === "video") {
        const base64Images = isTemplateGeneration
          ? undefined
          : await Promise.all(
              filesForGeneration.map((img) => fileToBase64(img.file)),
            );

        const result = await generateVideo.mutateAsync({
          prompt: serverPrompt,
          aspect_ratio: OUTPUT_ASPECT_RATIO,
          images: base64Images && base64Images.length > 0 ? base64Images : undefined,
          template_id: selectedOrPendingTemplateId,
          use_face_asset: useFaceAsset,
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
            filesForGeneration.map((img) => fileToBase64(img.file)),
          );

      const result = await generateDirect.mutateAsync({
        prompt: serverPrompt,
        aspect_ratio: OUTPUT_ASPECT_RATIO,
        images: base64Images && base64Images.length > 0 ? base64Images : undefined,
        template_id: selectedOrPendingTemplateId,
        use_face_asset: useFaceAsset,
      });
      setTaskId(result.taskId);
      setPendingLoading(false);
      void refetchEligibility();
    } catch (error: any) {
      setPendingLoading(false);
      if (error.code === "FACE_CAPTURE_REQUIRED") {
        toast({
          variant: "destructive",
          title: t("templateSelected.faceRequired"),
          description: t("generate.scanFace"),
        });
        return;
      }
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
        setShowFakePaywall(true);
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
    setPrompt("");
    setImages((prev) => {
      prev.forEach(revokeSlotUrl);
      return [null];
    });
    setSelectedTemplate(null);
    setPendingTemplateId(null);
    if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
    setFacePreviewUrl(null);
    setGenerationMode("image");
    setFakePaywallReason("onboarding");
    refetchEligibility();
  }, [facePreviewUrl, refetchEligibility]);

  useEffect(() => {
    const handleCreateNewLarp = () => {
      setUnlockedLarp(null);
      setUnlockingLarp(false);
      setSavedPaywall(null);
      setShowFakePaywall(false);
      setIsFakeGenerating(false);
      setTransitionBg(false);
      clearPendingLarp();
      clearPaywalledResult();
      clearPaywallImage();
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
    console.log(
      "[Generate] Auto-generate ready, prompt:",
      JSON.stringify(prompt.slice(0, 50)),
    );
    const canAutoGenerate =
      Boolean(pendingTemplateId || selectedTemplate) || prompt.trim().length > 0;
    if (!canAutoGenerate) {
      console.log("[Generate] Nothing to auto-generate, skipping");
      setPendingLoading(false);
      return;
    }

    const shouldUseOnboardingPaywall =
      profile &&
      !profile.is_subscriber &&
      profile.role !== "admin" &&
      !isReturningFromCheckout;

    if (shouldUseOnboardingPaywall && (pendingTemplateId || selectedTemplate)) {
      if (shouldSkipFakeLoader) {
        console.log(
          "[Generate] Template onboarding: fake paywall already reached, skipping loader",
        );
        startOnboardingPaywallFlow({ showPaywallImmediately: true });
      } else {
        console.log("[Generate] Starting template onboarding fake flow...");
        startOnboardingPaywallFlow();
      }
      return;
    }

    const requiredCredits =
      generationMode === "video" ? VIDEO_CREDIT_COST : IMAGE_CREDIT_COST;
    if (
      !isReturningFromCheckout &&
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

    if (shouldUseOnboardingPaywall) {
      if (shouldSkipFakeLoader) {
        console.log(
          "[Generate] Fake paywall already reached, skipping loader directly to paywall",
        );
        startOnboardingPaywallFlow({ showPaywallImmediately: true });
        return;
      }

      console.log("[Generate] Starting FAKE generation flow...");
      startOnboardingPaywallFlow();
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
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background bg-grid"
      >
        <img
          src="/assets/larpking.png"
          alt="LarpKing"
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
      inputImageUrl={loaderInputImageUrl}
      onRevealComplete={() => {
        setIsFakeGenerating(false);
        if (fakePaywallReason === "onboarding") {
          markFakePaywallReached(profile?.id, activePaywallGenerationMode);
        }
        setShowFakePaywall(true);
      }}
    />,
    document.body
  ) : null;

  const paywallOverlayClassName =
    "fixed inset-0 z-[100] overflow-hidden bg-background bg-grid animate-in fade-in duration-300";

  const paywallOverlayInnerClassName =
    "absolute inset-x-0 top-20 bottom-0 flex min-h-0 items-stretch justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:top-24 md:bottom-10";

  const faceScanPromptTitle =
    faceScanPromptMode === "review"
      ? t("templateSelected.faceScanReviewTitle")
      : t("templateSelected.faceScanPromptTitle");

  const faceScanPromptContent =
    faceScanPromptMode === "review" ? (
      <div className="w-full space-y-4">
        <p className="text-center text-sm font-medium leading-5 text-foreground">
          {t("templateSelected.faceScanReviewSubtitle")}
        </p>

        <div className="relative mx-auto aspect-[9/8] w-full max-w-sm overflow-hidden rounded-lg border border-border/70 bg-muted/40">
          {faceScanPreviewLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("templateSelected.faceScanReviewLoading")}
            </div>
          ) : facePreviewUrl ? (
            <img
              src={facePreviewUrl}
              alt={t("templateSelected.faceScanReviewAlt")}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-5 text-center text-sm font-medium text-muted-foreground">
              {faceScanPreviewError ?? t("templateSelected.faceScanReviewLoadError")}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <Button
            type="button"
            onClick={handleUseReviewedFaceScan}
            disabled={faceScanPreviewLoading || !facePreviewUrl}
            className="h-10 rounded-lg text-sm font-semibold"
          >
            <Check className="mr-2 h-4 w-4" />
            {t("templateSelected.faceScanReviewUse")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleStartFaceScan}
            className="h-10 rounded-lg text-sm font-semibold"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("templateSelected.faceScanReviewRetake")}
          </Button>
        </div>
      </div>
    ) : (
      <div className="w-full space-y-4">
        <p className="text-center text-sm font-medium leading-5 text-foreground">
          {t("templateSelected.faceScanPromptSubtitle")}
        </p>
        <p className="text-center text-xs font-medium leading-5 text-muted-foreground">
          {t("templateSelected.faceScanPromptDescription")}
        </p>
        <Button
          type="button"
          onClick={handleStartFaceScan}
          className="h-10 w-full rounded-lg text-sm font-semibold"
        >
          <ScanFace className="mr-2 h-4 w-4" />
          {t("generate.scanFace")}
        </Button>
      </div>
    );

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  // -- Generation in progress
  if (taskId) {
    return (
      <>
        {transitionBackdrop}
        {generationProgress}
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

  // -- Fake Paywall from onboarding
  if (showFakePaywall) {
    const paywallImageUrl = images[0]?.url || getPaywallImage() || "";
    return createPortal(
      <div className={paywallOverlayClassName}>
        <div className={paywallOverlayInnerClassName}>
          <PaywallOverlay
            isFake={true}
            imageUrl={paywallImageUrl}
            defaultPlan={paywallDefaultPlan}
            generationMode={
              fakePaywallReason === "insufficientCredits"
                ? insufficientCreditsContext.generationMode
                : activePaywallGenerationMode
            }
            variant={fakePaywallReason === "insufficientCredits" ? "insufficientCredits" : "default"}
          />
        </div>
      </div>,
      document.body,
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
          images[0]?.url ?? facePreviewUrl ?? getPaywallImage() ?? undefined
        }
        onReset={() => {
          setUnlockedLarp(null);
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
          <div className="sticky top-[5.25rem] z-20 flex w-full max-w-md justify-center md:static">
            <div
              role="tablist"
              aria-label="Generation mode"
              className="relative grid shrink-0 grid-cols-2 rounded-full border border-border/80 bg-white/70 p-0.5 shadow-sm backdrop-blur-md"
            >
              <div
                className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-primary shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition-[transform,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  generationMode === "video" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <button
                type="button"
                role="tab"
                aria-selected={generationMode === "image"}
                onClick={() => handleGenerationModeChange("image")}
                disabled={imageModeDisabled}
                className={`relative z-10 min-w-20 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-[color,opacity] duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
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
                onClick={() => handleGenerationModeChange("video")}
                disabled={videoModeDisabled}
                className={`relative z-10 min-w-20 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-[color,opacity] duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
                  generationMode === "video"
                    ? "text-primary-foreground"
                    : "text-muted-foreground/75 hover:text-muted-foreground"
                }`}
              >
                {t("generate.modeVideo")}
              </button>
            </div>
          </div>

          {selectedTemplate ? (
            <TemplateSelectedPanel
              template={selectedTemplate}
              generationMode={generationMode}
              requiresFaceCapture={templateRequiresFaceCapture(selectedTemplate)}
              useFaceAsset={useFaceAsset}
              onUseFaceAssetChange={handleUseFaceAssetChange}
              faceCaptureReady={faceCaptureReady}
              faceCaptureLoading={latestFaceCapture.isLoading}
              onDeselect={deselectTemplate}
              onGenerate={handleGenerate}
              isGenerating={isSubmittingGeneration}
            />
          ) : (
            <>
              <ImageUploadGrid
                images={images}
                onImageSelect={handleImageSelect}
                onRemoveSlot={removeSlot}
              />

              <PromptInputBar
                prompt={prompt}
                onPromptChange={setPrompt}
                onGenerate={handleGenerate}
                isGenerating={isSubmittingGeneration}
                canGenerate={
                  images.some((img) => img !== null) &&
                  (!useFaceAsset || faceCaptureReady)
                }
              />

              <FaceAssetControls
                idPrefix="free-prompt-face-asset"
                useFaceAsset={useFaceAsset}
                onUseFaceAssetChange={handleUseFaceAssetChange}
                faceCaptureReady={faceCaptureReady}
                faceCaptureLoading={latestFaceCapture.isLoading}
              />
            </>
          )}

          <button
            onClick={() =>
              galleryRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            {t("generate.viewTemplates")}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={galleryRef}>
        <TemplateGallery
          selectedTemplateId={selectedTemplate?.id ?? null}
          onSelectTemplate={selectTemplate}
          onDeselectTemplate={deselectTemplate}
        />
      </div>

      {isMobile ? (
        <Drawer open={faceScanPromptOpen} onOpenChange={handleFaceScanPromptOpenChange}>
          <DrawerContent className="rounded-t-2xl border-border/70 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="w-full px-0 pb-3 pt-4 text-center">
              <DrawerTitle className="flex items-center justify-center gap-2 font-display text-2xl font-bold">
                <ScanFace className="h-5 w-5" />
                {faceScanPromptTitle}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {t("templateSelected.faceScanPromptDescription")}
              </DrawerDescription>
            </DrawerHeader>
            {faceScanPromptContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={faceScanPromptOpen} onOpenChange={handleFaceScanPromptOpenChange}>
          <DialogContent className="w-[min(calc(100vw-2rem),28rem)] rounded-2xl border border-border/70 bg-white p-6 shadow-2xl">
            <DialogTitle className="flex items-center justify-center gap-2 text-center font-display text-2xl font-bold">
              <ScanFace className="h-5 w-5" />
              {faceScanPromptTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("templateSelected.faceScanPromptDescription")}
            </DialogDescription>
            {faceScanPromptContent}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
