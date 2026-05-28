import * as React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Plus,
  X,
  Shuffle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  getPrankChipsForLocale,
  getPrankIdeasForLocale,
} from "@/lib/prank-data";
import HeroHeadline from "@/components/marketing/HeroHeadline";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";
import { savePendingPrank } from "@/lib/pending-prank";
import { useAuth } from "@/hooks/use-auth";
import { useGenerateDirectPrank, useGenerateVideoPrank } from "@/hooks/use-pranks";
import { useGenerationEligibility } from "@/hooks/use-generation-limits";
import { useToast } from "@/hooks/use-toast";
import { GenerationProgress } from "@/components/prank/GenerationProgress";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function HeroSection() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = React.useState("");
  const [images, setImages] = React.useState<({ url: string; file: File } | null)[]>([null]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [accordionOpen, setAccordionOpen] = React.useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const prankIdeas = React.useMemo(
    () => getPrankIdeasForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const prankChips = React.useMemo(
    () => getPrankChipsForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const typewriterRef = useTypewriterPlaceholder(
    prompt,
    isMobile ? (Object.freeze([]) as unknown as string[]) : prankIdeas,
    t("promptInput.describePlaceholder"),
  );
  const { user } = useAuth();
  const generateDirect = useGenerateDirectPrank();
  const generateVideo = useGenerateVideoPrank();
  const { data: eligibility, refetch: refetchEligibility } = useGenerationEligibility();
  const { toast } = useToast();
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [generationMode, setGenerationMode] = React.useState<"image" | "video">("image");

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const shuffleIdea = () => {
    const random = prankChips[Math.floor(Math.random() * prankChips.length)];
    setPrompt(random.example);
  };

  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      const next: ({ url: string; file: File } | null)[] = [...prev];
      next[index] = { url, file };
      const allFilled = !next.includes(null);
      if (allFilled && next.length < 3) {
        next.push(null);
      }
      return next;
    });
  };

  const removeSlot = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [null] : next;
    });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedIndex(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageSelect(index, file);
    }
  };

  const handleSubmit = async () => {
    const files = images.filter(
      (img): img is { url: string; file: File } => img !== null,
    );

    if (user) {
      if (eligibility && !eligibility.canGenerate) {
        toast({
          variant: "destructive",
          title: t("hero.limitReachedTitle"),
          description: t("hero.limitReachedDescription"),
        });
        return;
      }
      if (!prompt.trim() && files.length === 0) {
        toast({
          variant: "destructive",
          title: t("hero.emptyPromptTitle"),
          description: t("hero.emptyPromptDescription"),
        });
        return;
      }
      try {
        const base64Images = await Promise.all(files.map((img) => fileToBase64(img.file)));
        const payload = {
          prompt: prompt.trim() || t("hero.surprisePrompt"),
          aspect_ratio: "9:16",
          images: base64Images.length > 0 ? base64Images : undefined,
        };
        const result = generationMode === "video"
          ? await generateVideo.mutateAsync(payload)
          : await generateDirect.mutateAsync(payload);
        setTaskId(result.taskId);
        refetchEligibility();
      } catch (error: any) {
        let message = error.message;
        try {
          const parsed = JSON.parse(error.message);
          message = parsed.message || error.message;
        } catch {}
        if (message.includes("<!DOCTYPE") || message.includes("<html")) {
          message = t("hero.serverRetry");
        }
        toast({
          variant: "destructive",
          title: t("hero.emptyPromptTitle"),
          description: message,
        });
      }
    } else {
      if (files.length > 0 || prompt.trim()) {
        try {
          await savePendingPrank({
            prompt,
            images: files.map((f) => f.file),
            generationMode,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("Ignored IDB save error:", error);
        }
      }
      navigate("/register");
    }
  };

  const handleReset = () => {
    setTaskId(null);
    setPrompt("");
    setImages([null]);
    setGenerationMode("image");
  };

  return (
    <section className="relative h-[100svh] overflow-hidden flex flex-col items-center px-4">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(255,255,255,0.78)_0_28%,transparent_28%_100%),linear-gradient(78deg,transparent_0_62%,rgba(0,0,0,0.04)_62%_76%,transparent_76%_100%)]" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center w-full flex-1"
      >
        <div className="w-full flex flex-col items-center gap-4 md:gap-6 pt-14 md:pt-14">
        <HeroHeadline
          variants={itemVariants}
          showArrow={!images.some((img) => img !== null)}
        />

        {/* Bottom group: drop zone + input + prank ideas */}
        <div className="flex flex-col items-center gap-3 md:gap-4 w-full mt-[0.5rem] md:mt-[3rem] pb-8 md:pb-10">
          <motion.div variants={itemVariants} className="flex justify-center px-4">
            <div
              role="tablist"
              aria-label="Generation mode"
              className="relative grid grid-cols-2 rounded-full border border-border/80 bg-white/70 p-0.5 shadow-sm backdrop-blur-md"
            >
              <div
                className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-primary shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition-transform duration-300 ${
                  generationMode === "video" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <button
                type="button"
                role="tab"
                aria-selected={generationMode === "image"}
                onClick={() => setGenerationMode("image")}
                className={`relative z-10 min-w-20 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
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
                className={`relative z-10 min-w-20 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  generationMode === "video"
                    ? "text-primary-foreground"
                    : "text-muted-foreground/75 hover:text-muted-foreground"
                }`}
              >
                {t("generate.modeVideo")}
              </button>
            </div>
          </motion.div>

          {/* Image upload grid */}
          <motion.div
            variants={itemVariants}
            className="w-full flex justify-center px-4 -mb-7 md:-mb-8"
          >
            <div className="flex items-end justify-center gap-2 md:gap-3 w-full max-w-md">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-1 min-w-0 h-[min(40vh,340px)] md:h-[min(47vh,420px)] aspect-[9/16]"
                >
                  {img ? (
                    <>
                      <img
                        src={img.url}
                        alt={t("imageUpload.imageAlt", { index: i + 1 })}
                        className="absolute inset-0 w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {draggedIndex !== i && (
                        <span className="hero-image-slot absolute -inset-[2px] rounded-lg pointer-events-none" />
                      )}
                    <label
                      className={`group absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer transition-all ${
                        draggedIndex === i
                          ? "border-primary bg-primary/10 border-solid"
                          : "border-foreground/25 bg-white/80"
                      }`}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, i)}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(i, file);
                        }}
                      />
                      {images.length === 1 && i === 0 ? (
                        draggedIndex === i ? (
                          <p className="text-sm font-semibold text-primary text-center px-2 whitespace-nowrap">
                            {t("hero.dropHere")} 👇
                          </p>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                              <Plus className="w-7 h-7 text-primary transition-colors" />
                            </div>
                            <p className="text-base md:text-lg font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center px-2 whitespace-nowrap">
                              {t("hero.dropImage")}
                            </p>
                          </>
                        )
                      ) : (
                        draggedIndex === i ? (
                          <p className="text-xs font-semibold text-primary">👇</p>
                        ) : (
                          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )
                      )}
                    </label>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Text input */}
          <motion.div
            variants={itemVariants}
            className="relative z-10 w-full flex justify-center px-4"
          >
            <div className="flex items-center gap-2 md:gap-3 w-full max-w-md rounded-lg border border-border/80 bg-white/85 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-sm shadow-black/5 hover:border-foreground/30 focus-within:border-foreground/50 focus-within:ring-2 focus-within:ring-foreground/10 transition-all">
              <input
                ref={typewriterRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isMobile ? t("promptInput.describePlaceholder") : ""}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                onClick={shuffleIdea}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all"
                title={t("hero.randomIdea")}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                className="shrink-0 w-8 h-8 rounded-full flex md:hidden items-center justify-center text-primary-foreground bg-primary active:scale-95 transition-all"
                onClick={handleSubmit}
                title={t("hero.create")}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <Button
                size="sm"
                className="rounded-full h-9 px-5 shrink-0 text-xs font-semibold border-0 shadow-none active:scale-95 transition-transform hidden md:flex"
                onClick={handleSubmit}
              >
                {t("hero.create")}
              </Button>
            </div>
          </motion.div>

          {/* Idées de pranks trigger */}
          <motion.div
            variants={itemVariants}
            className="relative w-full flex justify-center px-4"
          >
            <button
              onClick={() => setAccordionOpen(!accordionOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/80 bg-white/85 backdrop-blur text-sm font-semibold text-foreground hover:border-foreground/40 hover:text-foreground active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {t("hero.prankIdeas")}
              <motion.span
                animate={{ rotate: accordionOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="inline-flex"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>

            {/* Desktop dropdown */}
            {accordionOpen && (
              <div className="hidden md:block absolute bottom-full mb-3 w-full max-w-md z-50">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-lg border border-border/80 bg-card shadow-xl"
                >
                  <div className="grid grid-cols-3 gap-1.5">
                    {prankChips.map((chip) => {
                      const Icon = chip.icon;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => {
                            setPrompt(chip.example);
                            setAccordionOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 h-10 rounded-full border border-border/80 bg-card hover:border-foreground/40 hover:bg-muted text-foreground text-xs font-medium transition-all focus:outline-none"
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>

          {/* Mobile bottom sheet overlay */}
          {accordionOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/40"
                onClick={() => setAccordionOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-lg px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full bg-muted" />
                </div>
                <h3 className="text-base font-semibold text-center mb-4">{t("hero.prankIdeas")}</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {prankChips.map((chip) => {
                    const Icon = chip.icon;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => {
                          setPrompt(chip.example);
                          setAccordionOpen(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 h-10 rounded-full border border-border bg-card hover:border-foreground/40 hover:bg-muted text-foreground text-xs font-medium transition-all focus:outline-none"
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {/* Desktop overlay to close dropdown */}
          {accordionOpen && (
            <div
              className="hidden md:block fixed inset-0 z-40"
              onClick={() => setAccordionOpen(false)}
            />
          )}
        </div>
        </div>
      </motion.div>
      {taskId && createPortal(
        <GenerationProgress
          taskId={taskId}
          inputImageUrl={images[0]?.url}
          onReset={handleReset}
          resultType={generationMode}
        />,
        document.body
      )}
    </section>
  );
}
