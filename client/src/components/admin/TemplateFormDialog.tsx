import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTemplate, useUpdateTemplate } from "@/hooks/use-templates";
import { useToast } from "@/hooks/use-toast";
import type { PromptTemplate } from "@shared/schema";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "humour", label: "Humour" },
  { value: "absurde", label: "Absurde" },
  { value: "celebrite", label: "Célébrité" },
  { value: "situation", label: "Situation" },
  { value: "personnalise", label: "Personnalisé" },
];

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PromptTemplate | null;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: TemplateFormDialogProps) {
  const { toast } = useToast();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [category, setCategory] = useState("humour");
  const [isActive, setIsActive] = useState(true);
  const [requiredImages, setRequiredImages] = useState(0);
  const [optionalImages, setOptionalImages] = useState(0);
  const [outputLabel, setOutputLabel] = useState("");
  const [imageLabels, setImageLabels] = useState<string[]>([]);

  const isEditing = !!template;
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setPromptText(template.prompt_text);
      setCategory(template.category);
      setIsActive(template.is_active);
      setRequiredImages(template.required_images ?? 0);
      setOptionalImages(template.optional_images ?? 0);
      setOutputLabel(template.output_label || "");
      try {
        setImageLabels(
          template.image_labels ? JSON.parse(template.image_labels) : [],
        );
      } catch {
        setImageLabels([]);
      }
    } else {
      setName("");
      setDescription("");
      setPromptText("");
      setCategory("humour");
      setIsActive(true);
      setRequiredImages(0);
      setOptionalImages(0);
      setOutputLabel("");
      setImageLabels([]);
    }
  }, [template, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      description: description || undefined,
      prompt_text: promptText,
      category,
      is_active: isActive,
      required_images: requiredImages,
      optional_images: optionalImages,
      output_label: outputLabel || undefined,
      image_labels:
        imageLabels.length > 0 ? JSON.stringify(imageLabels) : undefined,
    };

    try {
      if (isEditing && template) {
        await updateTemplate.mutateAsync({ id: template.id, ...data });
        toast({ title: "Template mis à jour" });
      } else {
        await createTemplate.mutateAsync(data);
        toast({ title: "Template créé" });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le template" : "Nouveau template"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Photo embarrassante"
              required
              minLength={2}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brève description du template..."
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt_text">Texte du prompt</Label>
            <Textarea
              id="prompt_text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Ex: Une photo réaliste de {{nom}} en train de {{action}} dans {{lieu}}"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Utilisez {"{{variable}}"} pour les champs que l'utilisateur pourra
              personnaliser.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="output_label">Label de sortie</Label>
              <Input
                id="output_label"
                value={outputLabel}
                onChange={(e) => setOutputLabel(e.target.value)}
                placeholder="Ex: PV, Echo, SMS…"
                maxLength={50}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="required_images">Images requises</Label>
              <Select
                value={String(requiredImages)}
                onValueChange={(v) => {
                  const val = Number(v);
                  setRequiredImages(val);
                  if (val + optionalImages > 3) setOptionalImages(3 - val);
                  const totalNew = val + Math.min(optionalImages, 3 - val);
                  setImageLabels((prev) => {
                    const next = [...prev];
                    next.length = totalNew;
                    for (let j = 0; j < totalNew; j++)
                      if (!next[j]) next[j] = "";
                    return next;
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="optional_images">Images optionnelles</Label>
              <Select
                value={String(optionalImages)}
                onValueChange={(v) => {
                  const val = Number(v);
                  setOptionalImages(val);
                  const totalNew = requiredImages + val;
                  setImageLabels((prev) => {
                    const next = [...prev];
                    next.length = totalNew;
                    for (let j = 0; j < totalNew; j++)
                      if (!next[j]) next[j] = "";
                    return next;
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: 3 - requiredImages + 1 },
                    (_, i) => i,
                  ).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Total max : 3 images
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Actif</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <span className="text-sm text-muted-foreground">
                  {isActive ? "Visible" : "Masqué"}
                </span>
              </div>
            </div>
          </div>

          {requiredImages + optionalImages > 0 && (
            <div className="space-y-2">
              <Label>Consigne pour chaque image</Label>
              <p className="text-xs text-muted-foreground">
                Texte affiché à l'utilisateur pour chaque emplacement d'image.
              </p>
              {Array.from(
                { length: requiredImages + optionalImages },
                (_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      Image {idx + 1}{" "}
                      {idx < requiredImages ? "(requis)" : "(optionnel)"}
                    </span>
                    <Input
                      value={imageLabels[idx] || ""}
                      onChange={(e) => {
                        setImageLabels((prev) => {
                          const next = [...prev];
                          next[idx] = e.target.value;
                          return next;
                        });
                      }}
                      placeholder={`Ex: ton visage, ta voiture…`}
                      maxLength={100}
                    />
                  </div>
                ),
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
