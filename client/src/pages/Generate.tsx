import { useState, useMemo } from "react";
import { useTemplates } from "@/hooks/use-templates";
import { useGeneratePrank } from "@/hooks/use-pranks";
import { TemplateCard } from "@/components/prank/TemplateCard";
import { PlaceholderForm, extractPlaceholders } from "@/components/prank/PlaceholderForm";
import { GenerationProgress } from "@/components/prank/GenerationProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { PromptTemplate } from "@shared/schema";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Carré)" },
  { value: "16:9", label: "16:9 (Paysage)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
];

type ViewState =
  | { type: "select" }
  | { type: "configure"; template: PromptTemplate }
  | { type: "generating"; taskId: string; template: PromptTemplate; placeholders: Record<string, string>; aspectRatio: string };

export default function Generate() {
  const { data: templates, isLoading } = useTemplates();
  const generatePrank = useGeneratePrank();
  const { toast } = useToast();

  const [viewState, setViewState] = useState<ViewState>({ type: "select" });
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    if (!templates) return [];
    const catSet = new Set(templates.map((t) => t.category));
    return Array.from(catSet).sort();
  }, [templates]);

  const filteredTemplates = templates?.filter(
    (t) => categoryFilter === "all" || t.category === categoryFilter
  );

  function handleSelectTemplate(template: PromptTemplate) {
    setPlaceholders({});
    setAspectRatio("1:1");
    setViewState({ type: "configure", template });
  }

  async function handleGenerate() {
    if (viewState.type !== "configure") return;
    const { template } = viewState;

    // Check all placeholders are filled
    const requiredPlaceholders = extractPlaceholders(template.prompt_text);
    const missingPlaceholders = requiredPlaceholders.filter((p) => !placeholders[p]?.trim());
    if (missingPlaceholders.length > 0) {
      toast({
        title: "Champs manquants",
        description: `Veuillez remplir : ${missingPlaceholders.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generatePrank.mutateAsync({
        template_id: template.id,
        placeholders: Object.keys(placeholders).length > 0 ? placeholders : undefined,
        aspect_ratio: aspectRatio,
      });

      setViewState({
        type: "generating",
        taskId: result.taskId,
        template,
        placeholders,
        aspectRatio,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleRetry() {
    if (viewState.type !== "generating") return;
    setViewState({
      type: "configure",
      template: viewState.template,
    });
    setPlaceholders(viewState.placeholders);
    setAspectRatio(viewState.aspectRatio);
    // Re-trigger generation automatically
    setTimeout(() => handleGenerate(), 0);
  }

  function handleReset() {
    setViewState({ type: "select" });
    setPlaceholders({});
    setAspectRatio("1:1");
  }

  // -- Generation progress view --
  if (viewState.type === "generating") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Génération en cours</h1>
          <p className="text-muted-foreground mt-1">
            Template : {viewState.template.name}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <GenerationProgress
              taskId={viewState.taskId}
              onRetry={handleRetry}
              onReset={handleReset}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- Configuration view --
  if (viewState.type === "configure") {
    const { template } = viewState;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Configurer le Prank</h1>
          <p className="text-muted-foreground mt-1">
            Personnalisez les détails de votre prank avant de le générer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{template.name}</CardTitle>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                )}
              </div>
              <Badge variant="secondary">{template.category}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">{template.prompt_text}</p>
            </div>

            <PlaceholderForm
              promptText={template.prompt_text}
              values={placeholders}
              onChange={setPlaceholders}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Format de l'image</label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ar) => (
                    <SelectItem key={ar.value} value={ar.value}>
                      {ar.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset}>
                Retour
              </Button>
              <Button onClick={handleGenerate} disabled={generatePrank.isPending}>
                {generatePrank.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Générer le Prank
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- Template selection view --
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Générer un Prank</h1>
        <p className="text-muted-foreground mt-1">
          Choisissez un template pour commencer à créer votre prank.
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={categoryFilter === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setCategoryFilter("all")}
          >
            Tous
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !filteredTemplates?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {templates?.length
              ? "Aucun template dans cette catégorie."
              : "Aucun template disponible. Contactez un administrateur."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={false}
              onClick={() => handleSelectTemplate(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
