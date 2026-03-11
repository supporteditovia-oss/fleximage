import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ImageUp,
  SendHorizonal,
  Search,
  X,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useGenerateDirectPrank } from "@/hooks/use-pranks";
import { useTemplates } from "@/hooks/use-templates";
import { GenerationProgress } from "@/components/prank/GenerationProgress";
import { useToast } from "@/hooks/use-toast";
import type { PromptTemplate } from "@shared/schema";

export default function Generate() {
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<({ url: string; file: File } | null)[]>([
    null,
  ]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const generateDirect = useGenerateDirectPrank();
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { toast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);

  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[index] = { url, file };
      return next;
    });
  };

  const addSlot = () => {
    const maxSlots = selectedTemplate
      ? (selectedTemplate.required_images ?? 0) +
        (selectedTemplate.optional_images ?? 0)
      : 3;
    if (images.length < maxSlots) setImages((prev) => [...prev, null]);
  };

  const removeSlot = (index: number) => {
    const minSlots = selectedTemplate
      ? (selectedTemplate.required_images ?? 0)
      : 0;
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length < minSlots)
        return next.concat(Array(minSlots - next.length).fill(null));
      return next.length === 0 ? [null] : next;
    });
  };

  const selectTemplate = (tpl: PromptTemplate) => {
    const total = (tpl.required_images ?? 0) + (tpl.optional_images ?? 0);
    const slots = Math.max(
      tpl.required_images ?? 0,
      total > 0 ? (tpl.required_images ?? 0) : 0,
    );
    setSelectedTemplate(tpl);
    setPrompt(tpl.prompt_text);
    setImages(slots > 0 ? Array(slots).fill(null) : [null]);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const deselectTemplate = () => {
    setSelectedTemplate(null);
    setPrompt("");
    setImages([null]);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const filtered = (templates || []).filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt vide",
        description: "Décris ton prank avant de lancer la génération.",
      });
      return;
    }

    try {
      const files = images.filter(
        (img): img is { url: string; file: File } => img !== null,
      );
      const base64Images = await Promise.all(
        files.map((img) => fileToBase64(img.file)),
      );

      const result = await generateDirect.mutateAsync({
        prompt: prompt.trim(),
        aspect_ratio: "9:16",
        images: base64Images.length > 0 ? base64Images : undefined,
        template_id: selectedTemplate?.id,
      });
      setTaskId(result.taskId);
    } catch (error: any) {
      let message = error.message;
      try {
        const parsed = JSON.parse(error.message);
        message = parsed.message || error.message;
      } catch {}
      // If we got HTML back (server error), show a clean message
      if (message.includes("<!DOCTYPE") || message.includes("<html")) {
        message = "Erreur serveur. Veuillez réessayer.";
      }
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message,
      });
    }
  };

  const handleReset = () => {
    setTaskId(null);
    setPrompt("");
    setImages([null]);
    setSelectedTemplate(null);
  };

  // -- Generation in progress / result view --
  if (taskId) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">
            Génération en cours
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{prompt}</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <GenerationProgress
              taskId={taskId}
              onRetry={handleGenerate}
              onReset={handleReset}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Image upload zone + prompt */}
      <div ref={topRef} className="flex flex-col items-center gap-4">
        <h1 className="font-display text-3xl font-bold text-center">
          {selectedTemplate ? selectedTemplate.name : "Crée ton prank,"}
        </h1>
        {selectedTemplate && (
          <button
            onClick={deselectTemplate}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Revenir au mode libre
          </button>
        )}

        <div className="relative flex flex-col items-center w-full pb-14">
          {/* 9:16 image drop zone(s) */}
          <div className="flex items-center justify-center gap-3 flex-shrink-0">
            {images.map((img, i) => {
              const reqCount = selectedTemplate?.required_images ?? 0;
              const isRequired = i < reqCount;
              return (
                <div
                  key={i}
                  className="relative flex-shrink-0"
                  style={{ height: "min(52vh, 440px)", aspectRatio: "9/16" }}
                >
                  {img ? (
                    <>
                      <img
                        src={img.url}
                        alt={`Image ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                      />
                      <button
                        onClick={() => removeSlot(i)}
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <label
                      className={`group absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                        selectedTemplate && isRequired
                          ? "border-secondary bg-secondary/5 hover:border-secondary hover:bg-secondary/10"
                          : "border-border bg-card hover:border-primary hover:bg-primary/5"
                      }`}
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
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          selectedTemplate && isRequired
                            ? "bg-secondary/10 group-hover:bg-secondary/20"
                            : "bg-muted group-hover:bg-primary/10"
                        }`}
                      >
                        <ImageUp
                          className={`w-6 h-6 transition-colors ${
                            selectedTemplate && isRequired
                              ? "text-secondary"
                              : "text-muted-foreground group-hover:text-primary"
                          }`}
                        />
                      </div>
                      <div className="text-center px-3">
                        {selectedTemplate ? (
                          (() => {
                            let labels: string[] = [];
                            try {
                              labels = selectedTemplate.image_labels
                                ? JSON.parse(selectedTemplate.image_labels)
                                : [];
                            } catch {}
                            const label = labels[i] || "";
                            return (
                              <>
                                <p
                                  className={`text-sm font-semibold ${isRequired ? "text-secondary" : "text-foreground"}`}
                                >
                                  {label
                                    ? `Met une photo de ${label}`
                                    : "Dépose ton image"}
                                </p>
                                <p
                                  className={`text-[10px] mt-1 ${isRequired ? "text-secondary/70" : "text-muted-foreground/70"}`}
                                >
                                  {isRequired ? "Obligatoire" : "Optionnel"}
                                </p>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">
                              Dépose ton image
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ou clique pour parcourir
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add slot button — below images, doesn't shift layout */}
          {(() => {
            const maxSlots = selectedTemplate
              ? (selectedTemplate.required_images ?? 0) +
                (selectedTemplate.optional_images ?? 0)
              : 3;
            return images.length < maxSlots ? (
              <button
                onClick={addSlot}
                className="mt-3 flex items-center justify-center w-10 h-10 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
              >
                <span className="text-xl leading-none">+</span>
              </button>
            ) : null;
          })()}

          {/* Text input */}
          <div className="absolute bottom-4 z-20 w-full max-w-sm">
            <div className="flex items-center gap-2 w-full rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-lg hover:border-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décris ton prank…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                className="rounded-xl h-8 w-8 p-0 shrink-0"
                onClick={handleGenerate}
                disabled={generateDirect.isPending}
              >
                {generateDirect.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SendHorizonal className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Pranks Gallery */}
      <div className="flex flex-col gap-6">
        <h2 className="font-display text-2xl font-bold text-center">
          Choisis parmi les pranks existants
        </h2>

        {/* Search bar */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche un prank… ex: diplôme, amende"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Prank list */}
        <div className="space-y-3">
          {templatesLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!templatesLoading && filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Aucun prank trouvé.
            </p>
          )}
          {filtered.map((tpl) => {
            const totalInputs =
              (tpl.required_images ?? 0) + (tpl.optional_images ?? 0);
            const isSelected = selectedTemplate?.id === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() =>
                  isSelected ? deselectTemplate() : selectTemplate(tpl)
                }
                className={`group cursor-pointer flex items-center gap-5 rounded-2xl border px-4 py-5 min-h-[132px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: Math.max(totalInputs, 1) },
                      (_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {idx > 0 && (
                            <span className="text-muted-foreground text-sm font-semibold">
                              +
                            </span>
                          )}
                          <div
                            className={`h-24 aspect-[9/16] rounded-xl border flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide ${
                              idx < (tpl.required_images ?? 0)
                                ? "border-secondary/40 bg-secondary/10 text-secondary"
                                : "border-border bg-muted/80 text-muted-foreground"
                            }`}
                          >
                            {idx < (tpl.required_images ?? 0)
                              ? "Requis"
                              : "Optionnel"}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs font-medium px-1">
                    →
                  </span>
                  <div className="h-24 aspect-[9/16] rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-primary group-hover:bg-primary/10 transition-colors">
                    {tpl.output_label || "Result"}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold flex-shrink-0 transition-opacity ${
                    isSelected
                      ? "text-primary opacity-100"
                      : "text-primary opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSelected ? "Sélectionné ✓" : "Essayer →"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
