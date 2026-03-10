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

export function TemplateFormDialog({ open, onOpenChange, template }: TemplateFormDialogProps) {
  const { toast } = useToast();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [category, setCategory] = useState("humour");
  const [isActive, setIsActive] = useState(true);

  const isEditing = !!template;
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setPromptText(template.prompt_text);
      setCategory(template.category);
      setIsActive(template.is_active);
    } else {
      setName("");
      setDescription("");
      setPromptText("");
      setCategory("humour");
      setIsActive(true);
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
              Utilisez {"{{variable}}"} pour les champs que l'utilisateur pourra personnaliser.
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
              <Label htmlFor="is_active">Actif</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <span className="text-sm text-muted-foreground">
                  {isActive ? "Visible par les utilisateurs" : "Masqué"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
