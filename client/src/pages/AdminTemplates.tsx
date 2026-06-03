import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useAllTemplates,
  useDeleteTemplate,
  useUpdateTemplate,
} from "@/hooks/use-templates";
import {
  useAllCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-categories";
import { TemplateFormDialog } from "@/components/admin/TemplateFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ShieldAlert,
  Loader2,
  Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PromptTemplate, Category } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---- Category Form Dialog (inline in this page) ----

type TemplateGenerationType = "image" | "video" | "both";

const TEMPLATE_GENERATION_LABELS: Record<TemplateGenerationType, string> = {
  image: "Image",
  video: "Image + vidéo",
  both: "Image + vidéo",
};

function getTemplateGenerationLabel(template: PromptTemplate) {
  return TEMPLATE_GENERATION_LABELS[template.generation_type ?? "image"];
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}) {
  const { toast } = useToast();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [autoSlug, setAutoSlug] = useState(true);

  const isEditing = !!category;
  const isPending = createCategory.isPending || updateCategory.isPending;

  useEffect(() => {
    if (open) {
      setName(category?.name || "");
      setNameEn(category?.name_en || "");
      setSlug(category?.slug || "");
      setIsActive(category?.is_active ?? true);
      setDisplayOrder(category?.display_order ?? 0);
      setAutoSlug(!category);
    }
  }, [open, category]);

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          name,
          name_en: nameEn.trim() || null,
          slug,
          is_active: isActive,
          display_order: displayOrder,
        });
        toast({ title: "Catégorie mise à jour" });
      } else {
        await createCategory.mutateAsync({
          name,
          name_en: nameEn.trim() || null,
          slug,
          is_active: isActive,
          display_order: displayOrder,
        });
        toast({ title: "Catégorie créée" });
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nom français</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Célébrité"
                required
                minLength={2}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-name-en">Nom anglais</Label>
              <Input
                id="cat-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Ex: Celebrity"
                maxLength={100}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-slug">Slug</Label>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setAutoSlug(false);
              }}
              placeholder="Ex: celebrite"
              required
              minLength={2}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Identifiant unique utilisé en interne.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-order">Ordre d'affichage</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-active">Active</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="cat-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <span className="text-sm text-muted-foreground">
                  {isActive ? "Visible" : "Masquée"}
                </span>
              </div>
            </div>
          </div>
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

// ---- Category Management Panel ----

function CategoryManagementDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: categories, isLoading } = useAllCategories();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  function handleEditCat(cat: Category) {
    setEditingCat(cat);
    setFormOpen(true);
  }

  function handleCreateCat() {
    setEditingCat(null);
    setFormOpen(true);
  }

  async function handleDeleteCat() {
    if (!deletingCat) return;
    try {
      await deleteCategory.mutateAsync(deletingCat.id);
      toast({ title: "Catégorie supprimée" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
    setDeletingCat(null);
  }

  async function handleToggleActive(cat: Category) {
    try {
      await updateCategory.mutateAsync({
        id: cat.id,
        is_active: !cat.is_active,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestion des catégories</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreateCat}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nouvelle catégorie
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !categories?.length ? (
              <p className="text-center text-muted-foreground py-6">
                Aucune catégorie.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom FR</TableHead>
                    <TableHead>Nom EN</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cat.name_en || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cat.slug}</Badge>
                      </TableCell>
                      <TableCell>{cat.display_order}</TableCell>
                      <TableCell>
                        <Switch
                          checked={cat.is_active}
                          onCheckedChange={() => handleToggleActive(cat)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditCat(cat)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeletingCat(cat)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCat}
      />

      <AlertDialog
        open={!!deletingCat}
        onOpenChange={(o) => !o && setDeletingCat(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer "{deletingCat?.name}" ? Si des templates actifs
              l'utilisent, la suppression sera refusée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- Main Page ----

export default function AdminTemplates() {
  const { isAdmin } = useAuth();
  const { data: templates, isLoading } = useAllTemplates();
  const { data: categoriesList } = useAllCategories();
  const deleteTemplate = useDeleteTemplate();
  const updateTemplate = useUpdateTemplate();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null,
  );
  const [deletingTemplate, setDeletingTemplate] =
    useState<PromptTemplate | null>(null);
  const [catMgmtOpen, setCatMgmtOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">Accès refusé</h2>
        <p className="text-muted-foreground">
          Cette page est réservée aux administrateurs.
        </p>
      </div>
    );
  }

  const filteredTemplates = templates?.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.name_en || "").toLowerCase().includes(search.toLowerCase()) ||
      t.prompt_text.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "__none__"
        ? !t.category
        : t.category === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  function handleEdit(template: PromptTemplate) {
    setEditingTemplate(template);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditingTemplate(null);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingTemplate) return;
    try {
      await deleteTemplate.mutateAsync(deletingTemplate.id);
      toast({ title: "Template supprimé" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
    setDeletingTemplate(null);
  }

  async function handleToggleActive(template: PromptTemplate) {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        is_active: !template.is_active,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleCategoryChange(
    template: PromptTemplate,
    newCategory: string,
  ) {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        category: newCategory || null,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const getCategoryName = (slug: string | null) =>
    slug
      ? categoriesList?.find((c) => c.slug === slug)?.name || slug
      : "Sans catégorie";

  return (
    <div className="space-y-5 pt-2">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display">Templates</h1>
            {templates && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {templates.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez les modèles de prompts pour la génération de LARPs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCatMgmtOpen(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Catégories
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau template
          </Button>
        </div>
      </div>

      {/* Search + category filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
            )}
          >
            Toutes
          </button>
          {(categoriesList || []).map((cat) => (
            <button
              key={cat.slug}
              onClick={() =>
                setCategoryFilter(
                  cat.slug === categoryFilter ? "all" : cat.slug,
                )
              }
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                categoryFilter === cat.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
              )}
            >
              {cat.name}
              {cat.name_en ? ` / ${cat.name_en}` : ""}
            </button>
          ))}
          <button
            onClick={() =>
              setCategoryFilter(
                categoryFilter === "__none__" ? "all" : "__none__",
              )
            }
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              categoryFilter === "__none__"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted",
            )}
          >
            Sans catégorie
          </button>
        </div>
      </div>

      {/* Templates table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !filteredTemplates?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              {templates?.length
                ? "Aucun template ne correspond à la recherche."
                : "Aucun template créé. Commencez par en créer un."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre FR</TableHead>
                  <TableHead>Titre EN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center" title="Images de référence dans le tirage aléatoire">
                    Refs
                  </TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id} className="group">
                    <TableCell>
                      <p className="font-medium">{template.name}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.name_en || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTemplateGenerationLabel(template)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          (template.reference_image_count ?? 0) === 0
                            ? "destructive"
                            : "secondary"
                        }
                        className="tabular-nums"
                        title={
                          (template.reference_image_count ?? 0) === 0
                            ? "Aucune image de référence — prompt global uniquement"
                            : `${template.reference_image_count} image(s) dans le tirage aléatoire`
                        }
                      >
                        {template.reference_image_count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={template.category || "__none__"}
                        onValueChange={(val) =>
                          handleCategoryChange(
                            template,
                            val === "__none__" ? "" : val,
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground italic">
                              Aucune
                            </span>
                          </SelectItem>
                          {(categoriesList || []).map((cat) => (
                            <SelectItem key={cat.slug} value={cat.slug}>
                              {cat.name}
                              {cat.name_en ? ` / ${cat.name_en}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => handleToggleActive(template)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(template.created_at), "dd MMM yyyy", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeletingTemplate(template)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTemplate(null);
        }}
        template={editingTemplate}
      />

      <CategoryManagementDialog
        open={catMgmtOpen}
        onOpenChange={setCatMgmtOpen}
      />

      <AlertDialog
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le template</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le template "
              {deletingTemplate?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplate.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
