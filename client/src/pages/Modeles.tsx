import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { ChevronLeft, Expand, Gem, ImagePlus, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import { useTemplateFeed, type FeedTemplate } from "@/hooks/use-template-feed";
import { useGenerateDirectLarp } from "@/hooks/use-larps";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { compressImageForGeneration } from "@/lib/compress-image";
import { getBuiltinGenerationPrompt, hasTemplateBeforeAfterDemo, isVehicleSwapTemplate } from "@/lib/builtin-image-templates";
import { BeforeAfterSlider } from "@/components/v2/BeforeAfterSlider";
import { useToast } from "@/hooks/use-toast";
import { ModelesScene } from "@/components/modeles/ModelesScene";
import "@/pages/modeles-page.css";

const IMAGE_CREDIT_COST = 10;
const DESKTOP_WHEEL_COOLDOWN_MS = 520;

type SlideDirection = "next" | "prev" | "none";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function TemplateSlideContent({
  template,
  activeIndex,
  list,
  busy,
  enterDirection = "none",
  onPrimaryAction,
  onScrollToIndex,
  onOpenPreview,
}: {
  template: FeedTemplate;
  activeIndex: number;
  list: FeedTemplate[];
  busy: boolean;
  enterDirection?: SlideDirection;
  onPrimaryAction: (template: FeedTemplate) => void;
  onScrollToIndex: (index: number) => void;
  onOpenPreview: (template: FeedTemplate) => void;
}) {
  const luxeClass =
    enterDirection === "none"
      ? ""
      : ` tpl-slide__frame--${enterDirection}`;

  return (
    <div className={`tpl-slide__frame${luxeClass}`}>
      <div className="tpl-slide__lux-flash" aria-hidden />
      <div className="tpl-slide__lux-ring" aria-hidden />
      <div className="tpl-slide__frame-glow" aria-hidden />
      <div className="tpl-slide__photo">
        <img
          className="tpl-slide__media"
          src={template.previewUrl ?? ""}
          alt={template.name}
          decoding="async"
        />
        <div className="tpl-slide__scrim" aria-hidden />
      </div>

      <div className="tpl-bottom tpl-bottom--lux">
        <h2 className="tpl-slide__title tpl-slide__title--lux">{template.name}</h2>

        <div className="tpl-preview-row">
          <button
            type="button"
            className="tpl-preview-btn"
            onClick={(event) => {
              event.stopPropagation();
              onOpenPreview(template);
            }}
            aria-label={
              hasTemplateBeforeAfterDemo(template)
                ? `Avant / Après — ${template.name}`
                : `Aperçu — ${template.name}`
            }
          >
            <Expand className="h-4 w-4" aria-hidden />
            <span>
              {hasTemplateBeforeAfterDemo(template) ? "Avant / Après" : "Aperçu"}
            </span>
          </button>
        </div>

        <div className="tpl-badges tpl-badges--lux">
          <span className="tpl-badge">
            {isVehicleSwapTemplate(template)
              ? "Préparer le quad"
              : template.requiresUserPhoto
                ? "1 photo"
                : "photo optionnelle"}
          </span>
          <span className="tpl-badge">
            <Gem className="h-3 w-3" aria-hidden />
            {IMAGE_CREDIT_COST} crédits
          </span>
          {template.categoryName ? (
            <span className="tpl-badge">{template.categoryName}</span>
          ) : null}
        </div>

        <div className="tpl-strip tpl-strip--lux">
          {list.map((other, otherIndex) => (
            <button
              key={other.id}
              type="button"
              className={`tpl-strip__item${otherIndex === activeIndex ? " is-active" : ""}`}
              onClick={() => onScrollToIndex(otherIndex)}
              aria-label={other.name}
            >
              <img src={other.previewUrl ?? ""} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="tpl-cta tpl-cta--lux"
          disabled={busy}
          onClick={() => onPrimaryAction(template)}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isVehicleSwapTemplate(template) ? (
            <>Remplacer le quad (Can-Am)</>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" aria-hidden />
              Générer l’image
            </>
          )}
        </button>

        <p className="tpl-hint">
          {isVehicleSwapTemplate(template)
            ? "Étape 1 : l’IA remplace le quad Polaris par le Can-Am. Quand le résultat est bon, on le mettra en modèle prêt."
            : "Ta photo remplace uniquement la personne — le décor, la pose et la tenue du modèle restent identiques."}
        </p>
      </div>
    </div>
  );
}

function TemplatePreviewLightbox({
  template,
  onClose,
}: {
  template: FeedTemplate;
  onClose: () => void;
}) {
  const hasCompare = hasTemplateBeforeAfterDemo(template);
  const beforeSrc = template.demoBeforeUrl ?? template.previewUrl ?? "";
  const afterSrc = template.demoAfterUrl ?? "";

  useEffect(() => {
    document.documentElement.setAttribute("data-fullscreen-overlay", "true");
    document.body.setAttribute("data-fullscreen-overlay", "true");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.removeAttribute("data-fullscreen-overlay");
      document.body.removeAttribute("data-fullscreen-overlay");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="tpl-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu — ${template.name}`}
      onClick={onClose}
    >
      <button
        type="button"
        className="tpl-preview-overlay__close"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Fermer l’aperçu"
      >
        <X className="h-5 w-5" />
      </button>
      <figure
        className={`tpl-preview-overlay__figure${hasCompare ? " tpl-preview-overlay__figure--compare" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        {hasCompare ? (
          <BeforeAfterSlider
            pair={{
              id: template.id,
              beforeSrc,
              afterSrc,
              beforeAlt: `Modèle original — ${template.name}`,
              afterAlt: `Exemple généré — ${template.name}`,
            }}
            autoPlayLoop
            showLabels
            hint="Glisse pour comparer"
            className="tpl-preview-overlay__compare"
            label={`Avant et après — ${template.name}`}
          />
        ) : (
          <img
            className="tpl-preview-overlay__img"
            src={template.previewUrl ?? ""}
            alt={template.name}
            decoding="async"
          />
        )}
        <figcaption className="tpl-preview-overlay__caption">
          {hasCompare
            ? `${template.name} — le décor reste identique, seule la personne change`
            : template.name}
        </figcaption>
        {!hasCompare ? (
          <p className="tpl-preview-overlay__note">
            Ajoute ta photo pour te mettre à la place du modèle. Un exemple avant / après
            sera bientôt disponible ici.
          </p>
        ) : null}
      </figure>
    </div>,
    document.body,
  );
}

export default function Modeles() {
  const [, navigate] = useLocation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: plan } = useCurrentPlan({ enabled: Boolean(profile?.id) });
  const { data: templates, isLoading } = useTemplateFeed();
  const generateDirect = useGenerateDirectLarp();

  const feedRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const wheelLockRef = useRef(false);
  const wheelTimerRef = useRef<number | null>(null);
  const prevIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [enterDirection, setEnterDirection] = useState<SlideDirection>("none");
  const [scenePulse, setScenePulse] = useState(0);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<FeedTemplate | null>(
    null,
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<FeedTemplate | null>(
    null,
  );

  const credits = plan?.credits ?? profile?.credits ?? 0;
  const list = templates ?? [];
  const active = list[activeIndex];

  useEffect(() => {
    document.documentElement.classList.add("luxeflexia-modeles-page");
    document.body.setAttribute("data-hide-app-chrome", "true");

    const syncDesktopLayout = () => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      setIsDesktopLayout(desktop);
      document.documentElement.classList.toggle(
        "luxeflexia-modeles-desktop",
        desktop,
      );
    };
    syncDesktopLayout();
    window.addEventListener("resize", syncDesktopLayout);

    return () => {
      document.documentElement.classList.remove("luxeflexia-modeles-page");
      document.documentElement.classList.remove("luxeflexia-modeles-desktop");
      document.body.removeAttribute("data-hide-app-chrome");
      window.removeEventListener("resize", syncDesktopLayout);
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
    };
  }, []);

  // Précharger toutes les vignettes pour un scroll / changement instantané.
  useEffect(() => {
    list.forEach((template) => {
      if (!template.previewUrl) return;
      const img = new Image();
      img.decoding = "async";
      img.src = template.previewUrl;
    });
  }, [list]);

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= list.length) return;
      setActiveIndex((prev) => {
        if (index === prev) return prev;
        return index;
      });
    },
    [list.length],
  );

  // Direction + pulse luxe à chaque changement de modèle (desktop).
  useEffect(() => {
    if (!isDesktopLayout) return;
    const prev = prevIndexRef.current;
    if (activeIndex === prev) return;
    setEnterDirection(activeIndex > prev ? "next" : "prev");
    setScenePulse((n) => n + 1);
    prevIndexRef.current = activeIndex;
  }, [activeIndex, isDesktopLayout]);

  // Mobile : scroll snap + intersection observer.
  useEffect(() => {
    if (isDesktopLayout) return;
    const root = feedRef.current;
    if (!root || list.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(
          (visible.target as HTMLElement).dataset.index ?? "0",
        );
        setActiveIndex((prev) => (prev === index ? prev : index));
      },
      { root, threshold: 0.6 },
    );

    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isDesktopLayout, list.length]);

  // Desktop : molette = carrousel fluide sans scroll lourd.
  useEffect(() => {
    if (!isDesktopLayout || previewTemplate) return;
    const root = feedRef.current;
    if (!root || list.length === 0) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (wheelLockRef.current) return;
      if (Math.abs(event.deltaY) < 28) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      setActiveIndex((prev) => {
        const next = prev + direction;
        if (next < 0 || next >= list.length) return prev;
        return next;
      });

      wheelLockRef.current = true;
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => {
        wheelLockRef.current = false;
      }, DESKTOP_WHEEL_COOLDOWN_MS);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [isDesktopLayout, list.length, previewTemplate]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (isDesktopLayout) {
        setActiveIndex(index);
        return;
      }
      slideRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
    },
    [isDesktopLayout],
  );

  const jumpedRef = useRef(false);
  useEffect(() => {
    if (jumpedRef.current || list.length === 0) return;
    const wanted = new URLSearchParams(window.location.search).get("t");
    if (!wanted) return;
    const index = list.findIndex((t) => t.id === wanted || t.slug === wanted);
    if (index <= 0) {
      jumpedRef.current = true;
      return;
    }
    jumpedRef.current = true;
    setActiveIndex(index);
    if (!isDesktopLayout) {
      requestAnimationFrame(() => {
        slideRefs.current[index]?.scrollIntoView({ behavior: "auto" });
      });
    }
  }, [isDesktopLayout, list]);

  const askForPhoto = (template: FeedTemplate) => {
    setPendingTemplate(template);
    fileRef.current?.click();
  };

  const runGeneration = async (
    template: FeedTemplate,
    userImages: string[] = [],
  ) => {
    setBusy(true);
    try {
      const result = await generateDirect.mutateAsync({
        prompt: getBuiltinGenerationPrompt(template),
        template_id: template.id,
        images: userImages,
        use_face_asset: false,
      });
      setTaskId(result.taskId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Génération impossible",
        description: error?.message || "Réessaie dans un instant.",
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPrimaryAction = (template: FeedTemplate) => {
    if (isVehicleSwapTemplate(template)) {
      void runGeneration(template, []);
      return;
    }
    askForPhoto(template);
  };

  const onPhotoPicked = async (file: File | null) => {
    const template = pendingTemplate;
    setPendingTemplate(null);
    if (!file || !template) return;

    const compressed = await compressImageForGeneration(file);
    const base64 = await fileToBase64(compressed);
    await runGeneration(template, [base64]);
  };

  if (taskId) {
    return (
      <GenerationProgress
        taskId={taskId}
        onReset={() => setTaskId(null)}
        resultType="image"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="tpl-empty">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Chargement des modèles…</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="tpl-empty">
        <p>Chargement des modèles…</p>
        <button className="tpl-cta" onClick={() => navigate("/create")}>
          Revenir au studio
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="tpl-topbar">
        <button
          type="button"
          className="tpl-round-button"
          onClick={() => navigate("/create")}
          aria-label="Retour"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="tpl-credits">
          <Gem className="h-3.5 w-3.5" aria-hidden />
          {credits}
        </span>
      </div>

      {isDesktopLayout ? <ModelesScene pulseKey={scenePulse} /> : null}

      <div
        className={`tpl-feed${isDesktopLayout ? " tpl-feed--desktop" : ""}`}
        ref={feedRef}
      >
        {isDesktopLayout && active ? (
          <section className="tpl-slide tpl-slide--desktop" data-index={activeIndex}>
            <TemplateSlideContent
              key={active.id}
              template={active}
              activeIndex={activeIndex}
              list={list}
              busy={busy}
              enterDirection={enterDirection}
              onPrimaryAction={onPrimaryAction}
              onScrollToIndex={scrollToIndex}
              onOpenPreview={setPreviewTemplate}
            />
          </section>
        ) : (
          list.map((template, index) => (
            <section
              key={template.id}
              className="tpl-slide"
              data-index={index}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
            >
              <TemplateSlideContent
                template={template}
                activeIndex={activeIndex}
                list={list}
                busy={busy}
                onPrimaryAction={onPrimaryAction}
                onScrollToIndex={scrollToIndex}
                onOpenPreview={setPreviewTemplate}
              />
            </section>
          ))
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void onPhotoPicked(event.target.files?.[0] ?? null)}
      />

      {previewTemplate ? (
        <TemplatePreviewLightbox
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      ) : null}

      {active ? <span className="sr-only">{active.name}</span> : null}
    </>
  );
}
