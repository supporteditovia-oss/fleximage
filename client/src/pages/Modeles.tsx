import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Gem, ImagePlus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentPlan } from "@/hooks/use-billing";
import { useTemplateFeed, type FeedTemplate } from "@/hooks/use-template-feed";
import { useGenerateDirectLarp } from "@/hooks/use-larps";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
import { compressImageForGeneration } from "@/lib/compress-image";
import { getBuiltinGenerationPrompt, isVehicleSwapTemplate } from "@/lib/builtin-image-templates";
import { useToast } from "@/hooks/use-toast";
import "@/pages/modeles-page.css";

const IMAGE_CREDIT_COST = 10;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingTemplate, setPendingTemplate] = useState<FeedTemplate | null>(
    null,
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const credits = plan?.credits ?? profile?.credits ?? 0;
  const list = templates ?? [];
  const active = list[activeIndex];

  // Plein écran façon TikTok : on cache header + dock pour ne pas recouvrir le CTA.
  useEffect(() => {
    document.documentElement.classList.add("luxeflexia-modeles-page");
    document.body.setAttribute("data-hide-app-chrome", "true");
    return () => {
      document.documentElement.classList.remove("luxeflexia-modeles-page");
      document.body.removeAttribute("data-hide-app-chrome");
    };
  }, []);

  // Suivre le modèle affiché pendant que l'utilisateur fait défiler.
  useEffect(() => {
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
        setActiveIndex(index);
      },
      { root, threshold: 0.6 },
    );

    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [list.length]);

  const scrollToIndex = (index: number) => {
    slideRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
  };

  // Ouvert depuis une vignette du studio : démarrer sur ce modèle.
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
    requestAnimationFrame(() => {
      slideRefs.current[index]?.scrollIntoView({ behavior: "auto" });
      setActiveIndex(index);
    });
  }, [list]);

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

      <div className="tpl-feed" ref={feedRef}>
        {list.map((template, index) => (
          <section
            key={template.id}
            className="tpl-slide"
            data-index={index}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
          >
            <div className="tpl-slide__frame">
              <div className="tpl-slide__photo">
                <img
                  className="tpl-slide__media"
                  src={template.previewUrl ?? ""}
                  alt={template.name}
                  loading={index <= 1 ? "eager" : "lazy"}
                />
                <div className="tpl-slide__scrim" aria-hidden />
              </div>

              <div className="tpl-bottom">
                <h2 className="tpl-slide__title">{template.name}</h2>

                <div className="tpl-badges">
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

                <div className="tpl-strip">
                  {list.map((other, otherIndex) => (
                    <button
                      key={other.id}
                      type="button"
                      className={`tpl-strip__item${otherIndex === activeIndex ? " is-active" : ""}`}
                      onClick={() => scrollToIndex(otherIndex)}
                      aria-label={other.name}
                    >
                      <img src={other.previewUrl ?? ""} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="tpl-cta"
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
                    : "Ta photo remplace la personne, le décor reste identique."}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void onPhotoPicked(event.target.files?.[0] ?? null)}
      />

      {active ? <span className="sr-only">{active.name}</span> : null}
    </>
  );
}
