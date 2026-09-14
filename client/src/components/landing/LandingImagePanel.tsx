import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { ImageUploadGrid } from "@/components/generate/ImageUploadGrid";
import { PromptInputBar } from "@/components/generate/PromptInputBar";
import { startLandingGuestFunnel } from "@/lib/landing-funnel";
import { OUTPUT_ASPECT_RATIO, type GenerationAspectRatio } from "@shared/schema";

export function LandingImagePanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const [images, setImages] = useState<({ url: string; file: File } | null)[]>([null]);
  const [prompt, setPrompt] = useState(() => t("landing:imagePanel.defaultPrompt"));
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>(OUTPUT_ASPECT_RATIO);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrompt(t("landing:imagePanel.defaultPrompt"));
  }, [i18n.resolvedLanguage, t]);

  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      if (next[index]?.url) URL.revokeObjectURL(next[index]!.url);
      next[index] = { url, file };
      return next;
    });
  };

  const removeSlot = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      if (next[index]?.url) URL.revokeObjectURL(next[index]!.url);
      next[index] = null;
      return next;
    });
  };

  const handleGenerate = async () => {
    const file = images.find((img) => img)?.file;
    if (!file || busy) return;
    setBusy(true);
    try {
      await startLandingGuestFunnel({
        mode: "image",
        prompt: prompt.trim() || t("landing:imagePanel.fallbackPrompt"),
        imageFile: file,
      });
      navigate(user ? "/create" : "/register");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="landing-image-panel">
      <ImageUploadGrid
        images={images}
        onImageSelect={handleImageSelect}
        onRemoveSlot={removeSlot}
        generationMode="image"
      />
      <PromptInputBar
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={() => void handleGenerate()}
        isGenerating={busy}
        goldCta
        hideCreditHint
        canGenerate={images.some((img) => img !== null)}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
      />
    </div>
  );
}
