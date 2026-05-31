import * as React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Plus,
  X,
  Shuffle,
  ArrowRight,
} from "lucide-react";
import {
  getLarpChipsForLocale,
  getLarpIdeasForLocale,
} from "@/lib/larp-data";
import HeroHeadline from "@/components/marketing/HeroHeadline";
import HeroBackgroundFrames from "@/components/marketing/HeroBackgroundFrames";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";
import { savePendingLarp } from "@/lib/pending-larp";
import { useAuth } from "@/hooks/use-auth";
import { useGenerateDirectLarp } from "@/hooks/use-larps";
import { useGenerationEligibility } from "@/hooks/use-generation-limits";
import { useToast } from "@/hooks/use-toast";
import { GenerationProgress } from "@/components/larp/GenerationProgress";
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
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const larpIdeas = React.useMemo(
    () => getLarpIdeasForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const larpChips = React.useMemo(
    () => getLarpChipsForLocale(i18n.resolvedLanguage),
    [i18n.resolvedLanguage],
  );
  const typewriterRef = useTypewriterPlaceholder(
    prompt,
    isMobile ? (Object.freeze([]) as unknown as string[]) : larpIdeas,
    t("promptInput.describePlaceholder"),
  );
  const { user } = useAuth();
  const generateDirect = useGenerateDirectLarp();
  const { data: eligibility, refetch: refetchEligibility } = useGenerationEligibility();
  const { toast } = useToast();
  const [taskId, setTaskId] = React.useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const shuffleIdea = () => {
    const random = larpChips[Math.floor(Math.random() * larpChips.length)];
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
        const result = await generateDirect.mutateAsync(payload);
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
          await savePendingLarp({
            prompt,
            images: files.map((f) => f.file),
            generationMode: "image",
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
  };

  return (
    <section className="relative h-[100svh] overflow-hidden flex flex-col items-center px-4">
      <HeroBackgroundFrames />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center justify-center w-full flex-1"
      >
        <div className="w-full flex flex-col items-center gap-4 md:gap-6 pt-14 md:pt-14">
        <HeroHeadline variants={itemVariants} showArrow={false} />

        {/* Bottom group: drop zone + input */}
        <div className="flex flex-col items-center gap-3 md:gap-4 w-full mt-[0.5rem] md:mt-[3rem] pb-8 md:pb-10">
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
                      {draggedIndex !== i && (
                        <span className="hero-image-slot absolute inset-0 z-10 rounded-lg pointer-events-none" />
                      )}
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
        </div>
        </div>
      </motion.div>
      {taskId && createPortal(
        <GenerationProgress
          taskId={taskId}
          inputImageUrl={images[0]?.url}
          onReset={handleReset}
          resultType="image"
        />,
        document.body
      )}
    </section>
  );
}
