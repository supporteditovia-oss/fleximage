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
  Plus,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useGenerateDirectPrank } from "@/hooks/use-pranks";
import { useTemplates } from "@/hooks/use-templates";
import { GenerationProgress } from "@/components/prank/GenerationProgress";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const topRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

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
    const initSlots = Math.max(
      requiredCount,
      slots.length > 0 ? requiredCount : 0,
    );
    setSelectedTemplate(tpl);
    setPrompt(tpl.prompt_text);
    setImages(initSlots > 0 ? Array(initSlots).fill(null) : [null]);
    setTextValues({});
    topRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const filtered = (templates || []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
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
      <div
        ref={topRef}
        className="flex flex-col items-center justify-center gap-5 min-h-[calc(100vh-6rem)] pt-8 pb-4"
      >
        <div className="relative">
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-center">
            {selectedTemplate
              ? selectedTemplate.name
              : "Crée ton prank rapidement"}
          </h1>
          {!selectedTemplate && (
            <svg
              viewBox="0 0 512 512"
              preserveAspectRatio="xMidYMid meet"
              className="animate-arrow-bounce opacity-70 absolute -right md:-right-14 top-12 md:top-10 h-[70px] md:h-[100px] w-auto"
            >
              <g
                transform="translate(512,512) scale(-0.1,-0.1)"
                fill="#F97316"
                stroke="none"
              >
                <path d="M1016 4325 c-11 -11 -14 -28 -11 -58 3 -23 10 -89 16 -147 25 -243 85 -516 167 -760 156 -465 380 -843 747 -1259 375 -427 866 -703 1595 -895 l125 -33 -60 -13 c-290 -59 -695 -192 -711 -234 -12 -30 47 -115 98 -142 37 -19 68 -18 125 7 196 86 588 187 868 224 136 18 146 26 115 90 -13 27 -39 59 -60 74 -44 30 -248 330 -385 565 -116 199 -111 192 -161 216 -83 41 -110 6 -65 -84 31 -63 218 -368 303 -493 35 -53 44 -73 33 -73 -24 0 -281 65 -452 115 -493 144 -836 321 -1102 569 -239 225 -432 476 -599 781 -222 406 -358 852 -402 1324 -15 160 -31 191 -113 226 -45 19 -52 19 -71 0z" />
              </g>
            </svg>
          )}
        </div>
        {selectedTemplate && (
          <button
            onClick={deselectTemplate}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Revenir au mode libre
          </button>
        )}

        {/* Images + input group */}
        <div className="flex flex-col items-center gap-3 md:gap-4 w-full">
          {/* Image upload grid — overlaps input via negative margin */}
          <div className="w-full flex justify-center px-4 -mb-7 md:-mb-8">
            <div className="flex items-end justify-center gap-2 md:gap-3 w-full max-w-md">
              {images.map((img, i) => {
                const slots = parseImageSlots(selectedTemplate);
                const isRequired = selectedTemplate
                  ? (slots[i]?.required ?? false)
                  : false;
                return (
                  <div
                    key={i}
                    className="relative flex-shrink-1 min-w-0 h-[min(42vh,340px)] md:h-[min(48vh,420px)] aspect-[9/16]"
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
                        className={`group absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                          selectedTemplate && isRequired
                            ? "border-secondary bg-secondary/5 hover:border-secondary hover:bg-secondary/10"
                            : "border-border/60 bg-card/80 hover:border-primary/60 hover:bg-primary/5"
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
                        {selectedTemplate ? (
                          (() => {
                            const slots = parseImageSlots(selectedTemplate);
                            const label = slots[i]?.label || "";
                            return (
                              <>
                                <div
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                    isRequired
                                      ? "bg-secondary/10 group-hover:bg-secondary/20"
                                      : "bg-primary/10 group-hover:bg-primary/15"
                                  }`}
                                >
                                  <ImageUp
                                    className={`w-7 h-7 transition-colors ${
                                      isRequired
                                        ? "text-secondary"
                                        : "text-primary"
                                    }`}
                                  />
                                </div>
                                <div className="text-center px-2">
                                  <p
                                    className={`text-[11px] font-semibold ${isRequired ? "text-secondary" : "text-foreground"}`}
                                  >
                                    {label
                                      ? `Photo de ${label}`
                                      : "Dépose ton image"}
                                  </p>
                                  <p
                                    className={`text-[10px] mt-0.5 ${isRequired ? "text-secondary/70" : "text-muted-foreground/70"}`}
                                  >
                                    {isRequired ? "Obligatoire" : "Optionnel"}
                                  </p>
                                </div>
                              </>
                            );
                          })()
                        ) : images.length === 1 && i === 0 ? (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                              <ImageUp className="w-7 h-7 text-primary transition-colors" />
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center px-2 whitespace-nowrap">
                              Clique ou glisse une image ici
                            </p>
                          </>
                        ) : (
                          <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Text input — sits on top of images via z-10 */}
          <div className="relative z-10 w-full flex justify-center px-4">
            <div className="flex items-center gap-2 md:gap-3 w-full max-w-md rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-lg shadow-black/5 hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décris ton prank…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
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
                {generateDirect.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Générer"
                )}
              </Button>
            </div>
          </div>

          {/* Text fields for selected template */}
          {selectedTemplate &&
            (() => {
              const fields = parseTextFields(selectedTemplate);
              if (fields.length === 0) return null;
              return (
                <div className="relative z-10 w-full flex justify-center px-4">
                  <div className="w-full max-w-md space-y-2">
                    {fields.map((field, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-4 py-2 shadow-sm"
                      >
                        <label className="text-xs text-muted-foreground shrink-0 min-w-[80px]">
                          {field.label || `Texte ${idx + 1}`}
                          {field.required && (
                            <span className="text-destructive ml-0.5">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={textValues[idx] || ""}
                          onChange={(e) =>
                            setTextValues((prev) => ({
                              ...prev,
                              [idx]: e.target.value,
                            }))
                          }
                          placeholder={field.label || `Texte ${idx + 1}`}
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                          required={field.required}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
        <h2 className="font-display text-2xl md:text-3xl font-bold text-center">
          Choisis parmi les pranks existants
        </h2>

        {/* Search bar */}
        <div className="flex items-center gap-2 md:gap-3 rounded-3xl border border-border/40 bg-card/90 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-lg shadow-black/5 hover:border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche un prank… ex: diplôme, amende"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        {/* Prank grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            const hasBothImages =
              !!tpl.example_before_url && !!tpl.example_after_url;

            return (
              <div
                key={tpl.id}
                onClick={() =>
                  isSelected ? deselectTemplate() : selectTemplate(tpl)
                }
                className={`group cursor-pointer flex flex-col rounded-2xl border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border/60 hover:border-primary/40"
                }`}
              >
                {/* Image area */}
                {hasBothImages ? (
                  <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
                    {/* After image (base layer, visible by default) */}
                    <img
                      src={tpl.example_after_url!}
                      alt={`${tpl.name} — après`}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Before image (overlay, clips on hover via CSS) */}
                    <div className="absolute inset-0 w-full h-full overflow-hidden [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0_0_0)] transition-[clip-path] duration-700 ease-in-out">
                      <img
                        src={tpl.example_before_url!}
                        alt={`${tpl.name} — avant`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {/* Divider line */}
                    <div className="absolute inset-y-0 right-0 group-hover:right-full w-[2px] bg-white/80 shadow-sm transition-all duration-700 ease-in-out pointer-events-none" />
                    {/* Labels */}
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
                ) : tpl.example_after_url ? (
                  <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
                    <img
                      src={tpl.example_after_url}
                      alt={tpl.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[9/16] w-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary/30" />
                  </div>
                )}

                {/* Text overlay at bottom */}
                <div className="p-3 bg-card">
                  <p className="text-sm font-semibold truncate">{tpl.name}</p>
                  <span
                    className={`text-[11px] font-semibold transition-all ${
                      isSelected
                        ? "text-primary"
                        : "text-primary/0 group-hover:text-primary/100"
                    }`}
                  >
                    {isSelected ? "Sélectionné ✓" : "Essayer →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
