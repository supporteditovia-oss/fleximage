import { useState, useEffect, useRef } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  useCreateTemplate,
  useUpdateTemplate,
  useUploadTemplateImage,
} from "@/hooks/use-templates";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import type { PromptTemplate, ImageSlot, TextFieldSlot } from "@shared/schema";
import {
  Loader2,
  Plus,
  X,
  Type,
  ImageUp,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { icons } from "lucide-react";
import { cn } from "@/lib/utils";

const POPULAR_ICONS = [
  "Camera", "Image", "Laugh", "Smile", "SmilePlus", "Zap", "Flame", "Ghost",
  "Skull", "PartyPopper", "Sparkles", "Wand2", "Star", "Heart", "HeartCrack",
  "ThumbsUp", "ThumbsDown", "MessageCircle", "User", "Users", "Baby", "Cat",
  "Dog", "Fish", "Bug", "Palette", "Music", "Video", "Film", "Mic", "Phone",
  "Gift", "Trophy", "Crown", "Gem", "Rocket", "Plane", "Car", "Bomb", "Shield",
  "Sword", "Target", "Eye", "EyeOff", "Scissors", "Pen", "Pencil",
  "AlertTriangle", "Ban", "Clock", "Calendar", "MapPin", "Home", "Building",
  "Briefcase", "Coffee", "Wine", "Pizza", "Apple", "ShoppingCart", "Sun",
  "Moon", "Cloud", "Umbrella", "Snowflake", "Tree", "Mountain", "Waves",
  "Glasses", "Shirt", "Cookie", "Cake", "Monitor", "Smartphone", "Gamepad2",
  "Headphones", "Book", "Newspaper", "Flag", "Hand", "Fingerprint", "Lock",
  "Unlock", "Key", "Bell", "Megaphone", "Angry", "Frown", "Meh", "Drama",
  "Siren", "CircleAlert", "Radiation", "Biohazard", "Scan", "ScanFace",
  "Handshake", "Brain", "Dumbbell", "Cigarette", "Beer", "GlassWater",
  "Utensils", "Popcorn", "IceCreamCone", "Banana", "Cherry", "Grape", "Leaf",
  "Flower2", "PawPrint", "Rabbit", "Bird", "Turtle", "Squirrel",
  "CircleDollarSign", "Wallet", "CreditCard", "Receipt", "BadgeCheck",
  "BadgeAlert", "Flame", "Lightbulb", "Tv", "Radio", "Speaker", "Volume2",
  "Clapperboard", "Ticket", "Dices", "Joystick", "Puzzle", "ToyBrick",
  "Armchair", "Bath", "BedDouble", "DoorOpen", "Hammer", "Wrench",
  "Paintbrush", "Brush", "Eraser", "Ruler", "Compass", "Scale", "Telescope",
  "Microscope", "FlaskConical", "TestTube2", "Pill", "Stethoscope",
  "Ambulance", "Cross", "Hospital", "GraduationCap", "School",
  "BookOpen", "PenTool", "FileText", "FolderOpen", "Globe", "Languages",
  "QrCode", "Wifi", "Bluetooth", "Usb", "Battery", "Power", "Cpu", "HardDrive",
];

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PromptTemplate | null;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: TemplateFormDialogProps) {
  const { toast } = useToast();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const uploadImage = useUploadTemplateImage();
  const { data: categoriesList } = useCategories();

  const createCategory = useCreateCategory();
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const [name, setName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const [textFields, setTextFields] = useState<TextFieldSlot[]>([]);
  const [keywords, setKeywords] = useState("");
  const [icon, setIcon] = useState("");
  const [iconOpen, setIconOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!template;
  const isPending =
    createTemplate.isPending ||
    updateTemplate.isPending ||
    uploadImage.isPending;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setPromptText(template.prompt_text);
      setCategory(template.category || "");
      setIsActive(template.is_active);
      setKeywords(template.keywords || "");
      setIcon(template.icon || "");
      setImageSlots(parseJson<ImageSlot[]>(template.image_slots, []));
      setTextFields(parseJson<TextFieldSlot[]>(template.text_fields, []));
      setBeforePreview(template.example_before_url || null);
      setAfterPreview(template.example_after_url || null);
      setBeforeFile(null);
      setAfterFile(null);
    } else {
      setName("");
      setPromptText("");
      setCategory("");
      setIsActive(true);
      setKeywords("");
      setIcon("");
      setImageSlots([]);
      setTextFields([]);
      setBeforePreview(null);
      setAfterPreview(null);
      setBeforeFile(null);
      setAfterFile(null);
    }
  }, [template, open]);

  function slugify(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleQuickCreateCategory(name: string) {
    const slug = slugify(name);
    if (!slug) return;
    try {
      await createCategory.mutateAsync({ name, slug, is_active: true });
      setCategory(slug);
      setCatPopoverOpen(false);
      setCatSearch("");
      toast({ title: `Catégorie "${name}" créée` });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // --- Image slots ---
  function addImageSlot() {
    if (imageSlots.length >= 3) return;
    setImageSlots((prev) => [...prev, { label: "", required: false }]);
  }
  function removeImageSlot(index: number) {
    setImageSlots((prev) => prev.filter((_, i) => i !== index));
  }
  function updateImageSlot(index: number, updates: Partial<ImageSlot>) {
    setImageSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)),
    );
  }

  // --- Text fields ---
  function addTextField() {
    if (textFields.length >= 5) return;
    setTextFields((prev) => [...prev, { label: "", required: false }]);
  }
  function removeTextField(index: number) {
    setTextFields((prev) => prev.filter((_, i) => i !== index));
  }
  function updateTextField(index: number, updates: Partial<TextFieldSlot>) {
    setTextFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, ...updates } : field)),
    );
  }

  function handleFileSelect(
    file: File,
    setPreview: (url: string) => void,
    setFile: (f: File) => void,
  ) {
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      prompt_text: promptText,
      category: category || null,
      is_active: isActive,
      keywords: keywords.trim() || null,
      icon: icon.trim() || null,
      image_slots:
        imageSlots.length > 0 ? JSON.stringify(imageSlots) : undefined,
      text_fields:
        textFields.length > 0 ? JSON.stringify(textFields) : undefined,
    };

    try {
      let templateId: string;
      if (isEditing && template) {
        await updateTemplate.mutateAsync({ id: template.id, ...data });
        templateId = template.id;
        toast({ title: "Template mis à jour" });
      } else {
        const created = await createTemplate.mutateAsync(data);
        templateId = created.id;
        toast({ title: "Template créé" });
      }

      // Upload example images if new files were selected
      if (beforeFile) {
        const b64 = await fileToBase64(beforeFile);
        await uploadImage.mutateAsync({
          id: templateId,
          field: "example_before_url",
          image: b64,
        });
      }
      if (afterFile) {
        const b64 = await fileToBase64(afterFile);
        await uploadImage.mutateAsync({
          id: templateId,
          field: "example_after_url",
          image: b64,
        });
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
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le template" : "Nouveau template"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 overflow-y-auto pr-1 flex-1"
        >
          {/* ── SECTION 1: Informations générales ── */}
          <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-2 text-sm font-semibold">
              Informations générales
            </legend>

            <div className="space-y-2">
              <Label htmlFor="name">Titre</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={catPopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {category
                        ? categoriesList?.find((c) => c.slug === category)
                            ?.name || category
                        : "Aucune catégorie"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Rechercher ou créer…"
                        value={catSearch}
                        onValueChange={setCatSearch}
                      />
                      <CommandList>
                        <CommandEmpty className="py-2 px-3 text-sm text-muted-foreground">
                          Aucune catégorie trouvée.
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setCategory("");
                              setCatPopoverOpen(false);
                              setCatSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !category ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="text-muted-foreground italic">
                              Aucune catégorie
                            </span>
                          </CommandItem>
                          {(categoriesList || [])
                            .filter(
                              (cat) =>
                                cat.name
                                  .toLowerCase()
                                  .includes(catSearch.toLowerCase()) ||
                                cat.slug
                                  .toLowerCase()
                                  .includes(catSearch.toLowerCase()),
                            )
                            .map((cat) => (
                              <CommandItem
                                key={cat.slug}
                                value={cat.slug}
                                onSelect={() => {
                                  setCategory(cat.slug);
                                  setCatPopoverOpen(false);
                                  setCatSearch("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    category === cat.slug
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {cat.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                        {catSearch.trim() &&
                          !(categoriesList || []).some(
                            (c) =>
                              c.name.toLowerCase() ===
                              catSearch.trim().toLowerCase(),
                          ) && (
                            <CommandGroup>
                              <CommandItem
                                onSelect={() =>
                                  handleQuickCreateCategory(catSearch.trim())
                                }
                                className="text-primary"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Créer « {catSearch.trim()} »
                              </CommandItem>
                            </CommandGroup>
                          )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Icône</Label>
                <Popover open={iconOpen} onOpenChange={(o) => { setIconOpen(o); if (!o) setIconSearch(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={iconOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {icon && icons[icon as keyof typeof icons] ? (() => {
                          const Ic = icons[icon as keyof typeof icons];
                          return <Ic className="w-4 h-4 shrink-0" />;
                        })() : null}
                        <span className="truncate">{icon || "Aucune"}</span>
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Rechercher une icône…"
                        value={iconSearch}
                        onValueChange={setIconSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Aucune icône trouvée.</CommandEmpty>
                        <CommandGroup className="max-h-[250px] overflow-y-auto">
                          {icon && (
                            <CommandItem
                              value="__clear__"
                              onSelect={() => {
                                setIcon("");
                                setIconOpen(false);
                              }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Aucune icône
                            </CommandItem>
                          )}
                          {(iconSearch.trim()
                            ? Object.keys(icons)
                                .filter(name => name.toLowerCase().includes(iconSearch.toLowerCase()))
                                .slice(0, 150)
                            : POPULAR_ICONS.filter(name => name in icons)
                          ).map((name) => {
                            const Ic = icons[name as keyof typeof icons];
                            return (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  setIcon(name);
                                  setIconOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", icon === name ? "opacity-100" : "opacity-0")} />
                                <Ic className="mr-2 h-4 w-4" />
                                {name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mots-clés</Label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="drôle, bureau, collègue…"
                  maxLength={1000}
                />
                <p className="text-[11px] text-muted-foreground">
                  Séparés par des virgules, pour la recherche.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Visibilité</Label>
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
          </fieldset>

          {/* ── SECTION 2: Prompt ── */}
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-2 text-sm font-semibold">Prompt</legend>
            <Textarea
              id="prompt_text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Ex: Une photo réaliste de {text1} en train de {text2}…"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
            />
            {textFields.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Variables disponibles :{" "}
                {textFields.map((f, i) => (
                  <code
                    key={i}
                    className="bg-muted px-1 rounded text-[11px] mr-1"
                  >
                    {`{text${i + 1}}`}
                  </code>
                ))}
              </p>
            )}
          </fieldset>

          {/* ── SECTION 3: Entrées utilisateur ── */}
          <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-2 text-sm font-semibold">
              Entrées demandées à l'utilisateur
            </legend>

            {/* Image slots */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Images</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Images que l'utilisateur devra fournir (max 3).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImageSlot}
                  disabled={imageSlots.length >= 3}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Image
                </Button>
              </div>

              {imageSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Input
                      value={slot.label}
                      onChange={(e) =>
                        updateImageSlot(idx, { label: e.target.value })
                      }
                      placeholder="Ex: ton visage, ta voiture…"
                      maxLength={100}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={slot.required}
                      onCheckedChange={(checked) =>
                        updateImageSlot(idx, { required: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground w-16">
                      {slot.required ? "Requis" : "Facultatif"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeImageSlot(idx)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Separator */}
            {(imageSlots.length > 0 || textFields.length > 0) && (
              <div className="border-t" />
            )}

            {/* Text fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Champs texte</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Champs que l'utilisateur pourra remplir (max 5). Utilisez{" "}
                    <code className="bg-muted px-1 rounded text-[11px]">
                      {"{text1}"}
                    </code>
                    ,{" "}
                    <code className="bg-muted px-1 rounded text-[11px]">
                      {"{text2}"}
                    </code>
                    … dans le prompt pour les injecter.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTextField}
                  disabled={textFields.length >= 5}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Texte
                </Button>
              </div>

              {textFields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {`{text${idx + 1}}`}
                    </code>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateTextField(idx, { label: e.target.value })
                      }
                      placeholder="Ex: Prénom de la personne"
                      maxLength={100}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateTextField(idx, { required: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground w-16">
                      {field.required ? "Requis" : "Facultatif"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeTextField(idx)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {imageSlots.length === 0 && textFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                  Aucune entrée définie. Ajoutez des images ou des champs texte.
                </p>
              )}
            </div>
          </fieldset>

          {/* ── SECTION 4: Images d'illustration ── */}
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-2 text-sm font-semibold">
              Images d'illustration
            </legend>
            <p className="text-xs text-muted-foreground">
              Photos d'exemple affichées dans la galerie de pranks (avant / après).
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Before */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Avant
                </span>
                <div
                  onClick={() => beforeInputRef.current?.click()}
                  className="relative aspect-[9/16] rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/60 transition-colors overflow-hidden bg-muted/30"
                >
                  <input
                    ref={beforeInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        handleFileSelect(f, setBeforePreview, setBeforeFile);
                    }}
                  />
                  {beforePreview ? (
                    <>
                      <img
                        src={beforePreview}
                        alt="Avant"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBeforePreview(null);
                          setBeforeFile(null);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <ImageUp className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        Photo avant
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* After */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Après
                </span>
                <div
                  onClick={() => afterInputRef.current?.click()}
                  className="relative aspect-[9/16] rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/60 transition-colors overflow-hidden bg-muted/30"
                >
                  <input
                    ref={afterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        handleFileSelect(f, setAfterPreview, setAfterFile);
                    }}
                  />
                  {afterPreview ? (
                    <>
                      <img
                        src={afterPreview}
                        alt="Après"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAfterPreview(null);
                          setAfterFile(null);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <ImageUp className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        Photo après
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </fieldset>

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
