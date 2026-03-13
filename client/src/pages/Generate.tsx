import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ImageUp,
  SendHorizonal,
  Search,
  X,
  Loader2,
  RotateCcw,
  Plus,
  Sparkles,
  ChevronDown,
  Star,
  Shuffle,
} from "lucide-react";
import { icons } from "lucide-react";
import { useGenerateDirectPrank } from "@/hooks/use-pranks";
import { useTemplates } from "@/hooks/use-templates";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { GenerationProgress } from "@/components/prank/GenerationProgress";
import { useToast } from "@/hooks/use-toast";
import { useTypewriterPlaceholder } from "@/hooks/use-typewriter";
import { prankIdeas, prankChips } from "@/lib/prank-data";
import type { PromptTemplate, ImageSlot, TextFieldSlot } from "@shared/schema";

function parseImageSlots(template: PromptTemplate | null): ImageSlot[] {
  if (!template?.image_slots) return [];
  try {
    return JSON.parse(template.image_slots) as ImageSlot[];
  } catch {
    return [];
  }
}

function parseTextFields(template: PromptTemplate | null): TextFieldSlot[] {
  if (!template?.text_fields) return [];
  try {
    return JSON.parse(template.text_fields) as TextFieldSlot[];
  } catch {
    return [];
  }
}

export default function Generate() {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<({ url: string; file: File } | null)[]>([
    null,
  ]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const [textValues, setTextValues] = useState<Record<number, string>>({});
  const generateDirect = useGenerateDirectPrank();
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: favoriteIds = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { toast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useTypewriterPlaceholder(prompt, prankIdeas);

  const shuffleIdea = () => {
    const random = prankChips[Math.floor(Math.random() * prankChips.length)];
    setPrompt(random.example);
  };

  const handleImageSelect = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    setImages((prev) => {
      const next = [...prev];
      next[index] = { url, file };
      // Auto-add a new empty slot when all are filled
      const slots = parseImageSlots(selectedTemplate);
      const maxSlots = selectedTemplate ? slots.length : 3;
      const allFilled = !next.some((img) => img === null);
      if (allFilled && next.length < maxSlots) {
        next.push(null);
      }
      return next;
    });
  };

  const addSlot = () => {
    const slots = parseImageSlots(selectedTemplate);
    const maxSlots = selectedTemplate ? slots.length : 3;
    if (images.length < maxSlots) setImages((prev) => [...prev, null]);
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
    const requiredCount = slots.filter((s) => s.required).length;
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

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtered = (templates || [])
    .filter((t) => {
      const q = normalize(search);
      if (!q) return true;
      return (
        normalize(t.name).includes(q) ||
        (t.keywords && normalize(t.keywords).includes(q)) ||
        (t.category && normalize(t.category).includes(q))
      );
    })
    .sort((a, b) => {
      const aFav = favoriteIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteIds.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt vide",
        description: "Décris ton prank avant de lancer la génération.",
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
            title: "Image manquante",
            description: `L'image « ${slots[i].label || `Image ${i + 1}`} » est obligatoire.`,
          });
          return;
        }
      }

      // Validate required text fields
      const fields = parseTextFields(selectedTemplate);
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].required && !textValues[i]?.trim()) {
          toast({
            variant: "destructive",
            title: "Champ manquant",
            description: `Le champ « ${fields[i].label || `Texte ${i + 1}`} » est obligatoire.`,
          });
          return;
        }
      }
    }

    try {
      const files = images.filter(
        (img): img is { url: string; file: File } => img !== null,
      );
      const base64Images = await Promise.all(
        files.map((img) => fileToBase64(img.file)),
      );

      // Inject text field values into the prompt
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
    setTextValues({});
  };

  // -- Generation in progress / result view --
  if (taskId) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">
            Génération en cours
          </h1>
          {selectedTemplate ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {selectedTemplate.name}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-sm">{prompt}</p>
          )}
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
      <div
        ref={topRef}
        className="relative flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-6rem)] pt-4 pb-4"
      >
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/3 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-secondary/2 rounded-full blur-3xl -z-10 pointer-events-none" />
        {/* Images + input group */}
        <div className="relative flex flex-col items-center gap-3 md:gap-4 w-full">
          {/* Image upload grid — overlaps input via negative margin */}
          <div
            className="w-full flex justify-center px-4 -mb-7 md:-mb-8"
          >
            <div className="flex flex-col w-full max-w-md">
              <div className="flex items-end justify-center gap-2 md:gap-3 w-full">
              {images.map((img, i) => {
                const slots = parseImageSlots(selectedTemplate);
                const isRequired = selectedTemplate
                  ? (slots[i]?.required ?? false)
                  : false;
                return (
                  <div
                    key={i}
                    className="relative flex-shrink-1 min-w-0 h-[min(52vh,440px)] md:h-[min(58vh,520px)] aspect-[9/16] flex flex-col"
                  >
                    {/* Template header — above first image slot */}
                    {selectedTemplate && i === 0 && (
                      <div className="absolute bottom-full left-0 right-0 pb-2 flex items-end justify-between z-10">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                            Template
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {selectedTemplate.icon && icons[selectedTemplate.icon as keyof typeof icons] && (() => {
                              const LucideIcon = icons[selectedTemplate.icon as keyof typeof icons];
                              return <LucideIcon className="w-4 h-4 text-primary shrink-0" />;
                            })()}
                            <span className="text-base font-bold truncate">
                              {selectedTemplate.name}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={deselectTemplate}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
                      <>
                        {!selectedTemplate && (
                          <span className="hero-image-slot absolute inset-0 rounded-2xl pointer-events-none z-10" />
                        )}
                        {selectedTemplate && (
                          <span className="hero-image-slot--fast absolute inset-0 rounded-2xl pointer-events-none z-10" />
                        )}
                      <label className={`group absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 cursor-pointer transition-all border-transparent bg-card hover:bg-primary/5`}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageSelect(i, file);
                          }}
                        />
                        {selectedTemplate ? (
                          (() => {
                            const slots = parseImageSlots(selectedTemplate);
                            const label = slots[i]?.label || "";
                            return (
                              <>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors bg-primary/10 group-hover:bg-primary/15">
                                  <Plus className="w-7 h-7 transition-colors text-primary" />
                                </div>
                                <div className="text-center px-2">
                                  <p className="text-[11px] font-semibold text-foreground">
                                    {label
                                      ? `Photo ${label}`
                                      : "Dépose ton image"}
                                  </p>
                                  <p className="text-[10px] mt-0.5 text-muted-foreground/70">
                                    {isRequired ? "Obligatoire" : "Optionnel"}
                                  </p>
                                </div>
                              </>
                            );
                          })()
                        ) : images.length === 1 && i === 0 ? (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                              <Plus className="w-7 h-7 text-primary transition-colors" />
                            </div>
                            <p className="text-base md:text-lg font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center px-2 whitespace-nowrap">
                              Met ton image ici
                            </p>
                          </>
                        ) : (
                          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </label>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </div>

          {/* Unified input bar */}
          <div className="relative z-10 w-full flex justify-center px-4">
            <div className="flex flex-col gap-2 w-full max-w-md">
              {/* Free mode: single text input */}
              {!selectedTemplate && (
                <div className="flex items-center gap-2 md:gap-3 w-full rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-lg shadow-black/5 hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <input
                    ref={placeholderRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Décris ton prank…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                  />
                  <button
                    onClick={shuffleIdea}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 active:scale-90 transition-all"
                    title="Idée aléatoire"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button
                    className="shrink-0 w-8 h-8 rounded-full flex md:hidden items-center justify-center text-white bg-primary hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                    onClick={handleGenerate}
                    disabled={generateDirect.isPending}
                  >
                    {generateDirect.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <SendHorizonal className="w-4 h-4" />
                    )}
                  </button>
                  <Button
                    size="sm"
                    className="rounded-full h-9 px-5 shrink-0 text-xs font-semibold border-0 shadow-none active:scale-95 transition-transform hidden md:flex"
                    onClick={handleGenerate}
                    disabled={generateDirect.isPending}
                  >
                    {generateDirect.isPending ? "Création…" : "Créer"}
                  </Button>
                </div>
              )}

              {/* Template mode: fields overflow upward over image + generate button */}
              {selectedTemplate &&
                (() => {
                  const fields = parseTextFields(selectedTemplate);
                  return (
                    <div className="relative w-full">
                      {/* Parameter fields — positioned absolutely, growing upward over the image */}
                      {fields.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 flex flex-col gap-2 pb-2.5">
                          {fields.map((field, idx) => (
                            <div key={idx} className="flex flex-col w-full rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 pt-2 pb-2.5 md:pt-2.5 md:pb-3 shadow-lg shadow-black/5 hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                              <span className="text-[10px] font-semibold text-muted-foreground/70 mb-0.5">
                                {field.label || `Texte ${idx + 1}`}
                                {field.required && (
                                  <span className="text-destructive ml-0.5">*</span>
                                )}
                              </span>
                              <input
                                type="text"
                                value={textValues[idx] || ""}
                                onChange={(e) =>
                                  setTextValues((prev) => ({
                                    ...prev,
                                    [idx]: e.target.value,
                                  }))
                                }
                                placeholder={`Entrer ${field.label?.toLowerCase() || "une valeur"}…`}
                                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                                required={field.required}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Generate button */}
                      <Button
                        className="w-full rounded-3xl h-11 text-sm font-semibold shadow-lg shadow-black/5 active:scale-[0.98] transition-transform"
                        onClick={handleGenerate}
                        disabled={generateDirect.isPending}
                      >
                        {generateDirect.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Création…
                          </>
                        ) : (
                          "Créer"
                        )}
                      </Button>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* Voir les templates link */}
          <button
            onClick={() =>
              galleryRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mt-1"
          >
            Voir les templates
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pranks Gallery */}
      <div
        ref={galleryRef}
        className="flex flex-col gap-6 scroll-mt-20 max-w-3xl mx-auto"
      >
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center w-full">
          <span className="relative inline-block">
            Choisis parmi les pranks existants
            <svg className="pointer-events-none absolute left-0 right-0 mx-auto bottom-[-0.25em] md:bottom-[-0.35em] w-full h-[0.3em] md:h-[0.34em] text-primary/50" viewBox="0 0 100 12" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 Q 50 2 98 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round"></path></svg>
          </span>
        </h2>

        {/* Search bar — expands on focus */}
        <motion.div
          animate={{ width: searchOpen ? "100%" : "75%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="mx-auto flex items-center gap-2 md:gap-3 rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-sm hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-lg transition-colors cursor-text"
          onClick={() => {
            setSearchOpen(true);
            searchInputRef.current?.focus();
          }}
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche un prank…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => {
              if (!search) setSearchOpen(false);
            }}
          />
          {search && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSearch("");
                searchInputRef.current?.focus();
              }}
              className="shrink-0"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </motion.div>

        {/* Prank grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {templatesLoading && (
            <div className="col-span-full flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!templatesLoading && filtered.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground text-sm py-8">
              Aucun prank trouvé.
            </p>
          )}
          {filtered.map((tpl) => {
            const isSelected = selectedTemplate?.id === tpl.id;
            const isFav = favoriteIds.includes(tpl.id);
            const hasBothImages =
              !!tpl.example_before_url && !!tpl.example_after_url;

            return (
              <div
                key={tpl.id}
                onClick={() =>
                  isSelected ? deselectTemplate() : selectTemplate(tpl)
                }
                className="group relative cursor-pointer flex flex-col rounded-xl overflow-hidden bg-muted transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                {/* Favorite star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite.mutate({ templateId: tpl.id, isFavorite: isFav });
                  }}
                  className="absolute top-1.5 right-1.5 z-20 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <Star
                    className={`w-3.5 h-3.5 transition-colors ${
                      isFav
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/70 hover:text-white"
                    }`}
                  />
                </button>
                {/* Image area */}
                {hasBothImages ? (
                  <>
                    {/* Mobile: split view — après (top) + avant (bottom) */}
                    <div className="md:hidden relative aspect-[2/3] w-full overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-[calc(50%+1px)] overflow-hidden">
                        <img
                          src={tpl.example_after_url!}
                          alt={`${tpl.name} — après`}
                          className="absolute inset-0 w-full h-full object-cover object-center"
                          loading="lazy"
                        />
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
                          Après
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-[calc(50%+1px)] overflow-hidden">
                        <img
                          src={tpl.example_before_url!}
                          alt={`${tpl.name} — avant`}
                          className="absolute inset-0 w-full h-full object-cover object-center"
                          loading="lazy"
                        />
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
                          Avant
                        </span>
                      </div>
                    </div>
                    {/* Desktop: hover clip-path effect */}
                    <div className="hidden md:block relative aspect-[2/3] w-full overflow-hidden">
                      <img
                        src={tpl.example_after_url!}
                        alt={`${tpl.name} — après`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 w-full h-full overflow-hidden [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0_0_0)] transition-[clip-path] duration-700 ease-in-out">
                        <img
                          src={tpl.example_before_url!}
                          alt={`${tpl.name} — avant`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-y-0 left-0 group-hover:left-full w-[2px] bg-white/80 shadow-sm transition-all duration-700 ease-in-out pointer-events-none opacity-0 group-hover:opacity-100" />
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Avant
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                        <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Après
                        </span>
                      </div>
                    </div>
                  </>
                ) : tpl.example_after_url ? (
                  <div className="relative aspect-[2/3] w-full overflow-hidden">
                    <img
                      src={tpl.example_after_url}
                      alt={tpl.name}
                      className="block w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary/30" />
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-1 px-2.5 py-2.5 bg-card">
                  <p className="text-xs font-semibold leading-tight line-clamp-2">{tpl.name}</p>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 -rotate-90 transition-all ${
                      isSelected
                        ? "text-primary"
                        : "text-muted-foreground/40 group-hover:text-primary"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
