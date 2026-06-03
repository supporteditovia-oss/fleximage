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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  useUploadTemplateReferenceImages,
  useTemplateReferenceImages,
  useUpdateReferenceImage,
  useDeleteReferenceImage,
} from "@/hooks/use-templates";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import type {
  PromptTemplate,
  ReferenceImageDto,
} from "@shared/schema";
import {
  Loader2,
  Plus,
  X,
  ImageUp,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { icons } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AFTER_ILLUSTRATION_ACCEPT,
  isAfterIllustrationVideo,
  MAX_AFTER_VIDEO_BYTES,
} from "@/lib/template-illustration";

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
  onTemplateSaved?: (template: PromptTemplate) => void;
}

type TemplateGenerationType = "image" | "video" | "both";

type EditableReferenceImage = ReferenceImageDto & {
  image_prompt: string;
  video_prompt: string;
  dirty: boolean;
};

type PendingReferenceImage = {
  id: string;
  file: File;
  previewUrl: string;
  image_prompt: string;
  video_prompt: string;
  requires_face_asset: boolean;
};

const TEMPLATE_GENERATION_TYPES: {
  value: TemplateGenerationType;
  label: string;
}[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Image + vidéo" },
];
const REFERENCE_IMAGE_ACCEPT = "image/*";
const REFERENCE_IMAGE_INPUT_ID = "template-reference-images-input";
const REFERENCE_FOLDER_INPUT_ID = "template-reference-images-folder";
const REFERENCE_TILE_WIDTH = "w-[108px]";

type SelectedReferenceKey = `existing:${string}` | `pending:${string}`;

function isReferenceImageFile(file: File) {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return true;
  }
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function isReferenceImagePromptMissing(prompt: string) {
  return prompt.trim().length < 10;
}

function getReferenceTileClasses(isInvalid: boolean, isSelected: boolean) {
  return cn(
    "relative aspect-[9/16] w-full overflow-hidden rounded-lg border-2 transition-colors",
    isInvalid
      ? "border-destructive bg-destructive/15"
      : "border-border bg-muted/30",
    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
  );
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onTemplateSaved,
}: TemplateFormDialogProps) {
  const { toast } = useToast();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const uploadImage = useUploadTemplateImage();
  const uploadReferenceImages = useUploadTemplateReferenceImages();
  const updateReferenceImage = useUpdateReferenceImage();
  const deleteReferenceImage = useDeleteReferenceImage();
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const activeTemplateId = template?.id ?? savedTemplateId;
  const { data: categoriesList } = useCategories();
  const { data: loadedReferenceImages, refetch: refetchReferenceImages } =
    useTemplateReferenceImages(activeTemplateId);

  const createCategory = useCreateCategory();
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [activeTab, setActiveTab] = useState("principal");

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [promptText, setPromptText] = useState("");
  const [videoPromptText, setVideoPromptText] = useState("");
  const [category, setCategory] = useState("");
  const [generationType, setGenerationType] =
    useState<TemplateGenerationType>("image");
  const [isActive, setIsActive] = useState(true);
  const [keywords, setKeywords] = useState("");
  const [icon, setIcon] = useState("");
  const [iconOpen, setIconOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [existingReferences, setExistingReferences] = useState<
    EditableReferenceImage[]
  >([]);
  const [referenceFiles, setReferenceFiles] = useState<PendingReferenceImage[]>(
    [],
  );
  const [selectedReferenceKey, setSelectedReferenceKey] =
    useState<SelectedReferenceKey | null>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const referenceFilesRef = useRef<PendingReferenceImage[]>([]);
  const initializedSessionKeyRef = useRef<string | null>(null);

  const isEditing = !!activeTemplateId;
  const isPending =
    createTemplate.isPending ||
    updateTemplate.isPending ||
    uploadImage.isPending ||
    uploadReferenceImages.isPending ||
    updateReferenceImage.isPending ||
    deleteReferenceImage.isPending;

  useEffect(() => {
    if (!open) {
      setSavedTemplateId(null);
      initializedSessionKeyRef.current = null;
      return;
    }

    const sessionKey = template?.id ?? savedTemplateId ?? "new";

    if (initializedSessionKeyRef.current === sessionKey) {
      return;
    }

    if (
      initializedSessionKeyRef.current === "new" &&
      sessionKey !== "new" &&
      !template
    ) {
      initializedSessionKeyRef.current = sessionKey;
      void refetchReferenceImages();
      return;
    }

    initializedSessionKeyRef.current = sessionKey;

    if (template) {
      setName(template.name);
      setNameEn(template.name_en || "");
      setPromptText(template.prompt_text);
      setVideoPromptText(template.video_prompt_text || "");
      setCategory(template.category || "");
      setGenerationType(
        template.generation_type === "both"
          ? "video"
          : template.generation_type ?? "image",
      );
      setIsActive(template.is_active);
      setKeywords(template.keywords || "");
      setIcon(template.icon || "");
      setExistingReferences([]);
      clearPendingReferenceFiles();
      setSelectedReferenceKey(null);
      void refetchReferenceImages();
      setAfterPreview(template.example_after_url || null);
      setAfterFile(null);
      setActiveTab("principal");
    } else if (sessionKey === "new") {
      setName("");
      setNameEn("");
      setPromptText("");
      setVideoPromptText("");
      setCategory("");
      setGenerationType("image");
      setIsActive(true);
      setKeywords("");
      setIcon("");
      setExistingReferences([]);
      clearPendingReferenceFiles();
      setSelectedReferenceKey(null);
      setAfterPreview(null);
      setAfterFile(null);
      setActiveTab("principal");
    }
  }, [open, template?.id, savedTemplateId, refetchReferenceImages]);

  useEffect(() => {
    if (!loadedReferenceImages) return;
    setExistingReferences(
      loadedReferenceImages.map((ref) => ({
        ...ref,
        image_prompt: ref.image_prompt,
        video_prompt: ref.video_prompt ?? "",
        requires_face_asset: ref.requires_face_asset !== false,
        dirty: false,
      })),
    );
  }, [loadedReferenceImages]);

  useEffect(() => {
    referenceFilesRef.current = referenceFiles;
  }, [referenceFiles]);

  useEffect(() => {
    return () => {
      referenceFilesRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, []);

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

  function handleFileSelect(
    file: File,
    setPreview: (url: string) => void,
    setFile: (f: File) => void,
  ) {
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function appendReferenceFiles(files: File[]) {
    const accepted = files.filter(isReferenceImageFile);
    const rejectedCount = files.length - accepted.length;

    if (accepted.length === 0) {
      if (files.length > 0) {
        toast({
          title: "Format non supporté",
          description: "Utilisez des images JPEG, PNG ou WebP.",
          variant: "destructive",
        });
      }
      return;
    }

    if (rejectedCount > 0) {
      toast({
        title: "Certains fichiers ont été ignorés",
        description: `${rejectedCount} fichier(s) non supporté(s) sur ${files.length}.`,
        variant: "destructive",
      });
    }

    const newItems: PendingReferenceImage[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      image_prompt: promptText.trim() || "",
      video_prompt: videoPromptText.trim() || "",
      requires_face_asset: true,
    }));

    setReferenceFiles((prev) => [...prev, ...newItems]);

    if (newItems.length === 1) {
      setSelectedReferenceKey(`pending:${newItems[0].id}`);
    }
  }

  function handleReferenceFilesSelect(
    fileList: FileList | File[] | null | undefined,
  ) {
    appendReferenceFiles(Array.from(fileList ?? []));
  }

  function updateExistingReference(
    id: string,
    updates: Partial<
      Pick<
        EditableReferenceImage,
        "image_prompt" | "video_prompt" | "requires_face_asset"
      >
    >,
  ) {
    setExistingReferences((prev) =>
      prev.map((ref) =>
        ref.id === id
          ? { ...ref, ...updates, dirty: true }
          : ref,
      ),
    );
  }

  async function removeExistingReference(id: string) {
    if (!activeTemplateId) return;
    try {
      await deleteReferenceImage.mutateAsync({
        templateId: activeTemplateId,
        refId: id,
      });
      setExistingReferences((prev) => prev.filter((ref) => ref.id !== id));
      setSelectedReferenceKey((current) =>
        current === `existing:${id}` ? null : current,
      );
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function updatePendingReference(
    id: string,
    updates: Partial<
      Pick<
        PendingReferenceImage,
        "image_prompt" | "video_prompt" | "requires_face_asset"
      >
    >,
  ) {
    setReferenceFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  function removePendingReferenceImage(id: string) {
    setReferenceFiles((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
    setSelectedReferenceKey((current) =>
      current === `pending:${id}` ? null : current,
    );
  }

  function clearPendingReferenceFiles() {
    setReferenceFiles((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }

  function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
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

    if (name.trim().length < 2) {
      setActiveTab("principal");
      toast({
        title: "Titre requis",
        description: "Le titre du template doit contenir au moins 2 caractères.",
        variant: "destructive",
      });
      return;
    }

    if (promptText.trim().length < 10) {
      setActiveTab("workflow");
      toast({
        title: "Prompt requis",
        description: "Le prompt doit contenir au moins 10 caractères.",
        variant: "destructive",
      });
      return;
    }

    if (generationType === "video" && videoPromptText.trim().length < 10) {
      setActiveTab("workflow");
      toast({
        title: "Prompt vidéo requis",
        description: "Le prompt vidéo doit contenir au moins 10 caractères.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name,
      name_en: nameEn.trim() || null,
      prompt_text: promptText,
      video_prompt_text:
        generationType === "video" ? videoPromptText.trim() : "",
      category: category || null,
      generation_type: generationType,
      is_active: isActive,
      keywords: keywords.trim() || null,
      icon: icon.trim() || null,
    };

    const allRefs = [...existingReferences, ...referenceFiles];
    for (const ref of allRefs) {
      const imagePrompt =
        "image_prompt" in ref ? ref.image_prompt.trim() : "";
      if (imagePrompt.length < 10) {
        setActiveTab("workflow");
        toast({
          title: "Prompt image requis",
          description:
            "Chaque image de référence doit avoir un prompt image d'au moins 10 caractères.",
          variant: "destructive",
        });
        return;
      }
      if (generationType === "video") {
        const videoPrompt =
          "video_prompt" in ref ? ref.video_prompt.trim() : "";
        if (videoPrompt.length < 10) {
          setActiveTab("workflow");
          toast({
            title: "Prompt vidéo requis",
            description:
              "Chaque image de référence doit avoir un prompt vidéo d'au moins 10 caractères.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      let templateId = activeTemplateId;

      if (templateId) {
        await updateTemplate.mutateAsync({ id: templateId, ...data });
        toast({ title: "Template enregistré" });
      } else {
        const created = (await createTemplate.mutateAsync(
          data,
        )) as PromptTemplate;
        templateId = created.id;
        setSavedTemplateId(created.id);
        onTemplateSaved?.(created);
        toast({ title: "Template créé — vous pouvez continuer à éditer" });
      }

      // Upload example images if new files were selected
      if (afterFile) {
        const b64 = await fileToBase64(afterFile);
        const updated = await uploadImage.mutateAsync({
          id: templateId,
          field: "example_after_url",
          image: b64,
        });
        setAfterPreview(updated.example_after_url || afterPreview);
        setAfterFile(null);
      }
      const dirtyExisting = existingReferences.filter((ref) => ref.dirty);
      for (const ref of dirtyExisting) {
        await updateReferenceImage.mutateAsync({
          templateId,
          refId: ref.id,
          image_prompt: ref.image_prompt.trim(),
          video_prompt:
            generationType === "video" ? ref.video_prompt.trim() : null,
          requires_face_asset: ref.requires_face_asset,
        });
      }

      if (referenceFiles.length > 0) {
        const items = await Promise.all(
          referenceFiles.map(async (item) => ({
            image: await fileToBase64(item.file),
            image_prompt: item.image_prompt.trim(),
            video_prompt:
              generationType === "video" && item.video_prompt.trim()
                ? item.video_prompt.trim()
                : null,
            requires_face_asset: item.requires_face_asset,
          })),
        );
        for (const batch of chunkArray(items, 10)) {
          await uploadReferenceImages.mutateAsync({
            id: templateId,
            items: batch,
          });
        }
        clearPendingReferenceFiles();
      }

      setExistingReferences((prev) =>
        prev.map((ref) => ({ ...ref, dirty: false })),
      );
      setSelectedReferenceKey((current) =>
        current?.startsWith("pending:") ? null : current,
      );
      await refetchReferenceImages();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  const referenceCount = existingReferences.length + referenceFiles.length;
  const selectedExistingReference = selectedReferenceKey?.startsWith("existing:")
    ? existingReferences.find(
        (ref) => ref.id === selectedReferenceKey.slice("existing:".length),
      )
    : undefined;
  const selectedPendingReference = selectedReferenceKey?.startsWith("pending:")
    ? referenceFiles.find(
        (item) => item.id === selectedReferenceKey.slice("pending:".length),
      )
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1400px)] max-w-[min(96vw,1400px)] h-[min(92vh,1100px)] max-h-[min(92vh,1100px)] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le template" : "Nouveau template"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 overflow-y-auto pr-1 flex-1"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="principal">Principal</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
            </TabsList>

            <TabsContent value="principal" className="mt-0 space-y-6">
              {/* ── SECTION 1: Informations générales ── */}
              <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-2 text-sm font-semibold">
              Informations générales
            </legend>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Titre français</Label>
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
                <Label htmlFor="name_en">Titre anglais</Label>
                <Input
                  id="name_en"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Ex: Embarrassing photo"
                  maxLength={200}
                />
              </div>
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
                            ? `${categoriesList.find((c) => c.slug === category)?.name}${
                                categoriesList.find((c) => c.slug === category)
                                  ?.name_en
                                  ? ` / ${
                                      categoriesList.find((c) => c.slug === category)
                                        ?.name_en
                                    }`
                                  : ""
                              }`
                            : category
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
                                (cat.name_en || "")
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
                                {cat.name_en ? ` / ${cat.name_en}` : ""}
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

          {/* ── SECTION 4: Images d'illustration ── */}
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-2 text-sm font-semibold">
              Images d'illustration
            </legend>
            <p className="text-xs text-muted-foreground">
              Image ou vidéo d&apos;exemple affichée dans la galerie.
            </p>
            <div className="max-w-[140px]">
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
                    accept={AFTER_ILLUSTRATION_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const isVideo = f.type.startsWith("video/");
                      const isImage = f.type.startsWith("image/");
                      if (!isVideo && !isImage) {
                        toast({
                          title: "Format non supporté",
                          description:
                            "Utilisez une image (JPEG, PNG, WebP) ou une vidéo (MP4, WebM, MOV).",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (isVideo && f.size > MAX_AFTER_VIDEO_BYTES) {
                        toast({
                          title: "Vidéo trop volumineuse",
                          description: "La taille maximale est de 80 Mo.",
                          variant: "destructive",
                        });
                        return;
                      }
                      handleFileSelect(f, setAfterPreview, setAfterFile);
                    }}
                  />
                  {afterPreview ? (
                    <>
                      {isAfterIllustrationVideo(afterPreview, afterFile) ? (
                        <video
                          src={afterPreview}
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          playsInline
                          autoPlay
                          loop
                        />
                      ) : (
                        <img
                          src={afterPreview}
                          alt="Après"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
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
                      <span className="text-[10px] text-muted-foreground text-center px-2">
                        Image ou vidéo après
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </fieldset>

            </TabsContent>

            <TabsContent value="workflow" className="mt-0 space-y-6">
              <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="px-2 text-sm font-semibold">Workflow</legend>

                <div className="space-y-2">
                  <Label>Type de génération</Label>
                  <Select
                    value={generationType}
                    onValueChange={(value) =>
                      setGenerationType(value as TemplateGenerationType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_GENERATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="px-2 text-sm font-semibold">
                  Images de référence
                </legend>

                <p className="text-xs text-muted-foreground">
                  Configuration principale du template : une image et ses prompts
                  sont choisis aléatoirement à chaque génération. Chaque
                  référence possède son propre prompt image
                  {generationType !== "image"
                    ? " et son propre prompt vidéo"
                    : ""}
                  .
                </p>

                <div className="space-y-3">
                  <input
                    id={REFERENCE_IMAGE_INPUT_ID}
                    ref={referenceInputRef}
                    type="file"
                    accept={REFERENCE_IMAGE_ACCEPT}
                    multiple={true}
                    className="sr-only"
                    onChange={(e) => {
                      handleReferenceFilesSelect(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                  <input
                    id={REFERENCE_FOLDER_INPUT_ID}
                    type="file"
                    accept={REFERENCE_IMAGE_ACCEPT}
                    multiple={true}
                    className="sr-only"
                    {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                    onChange={(e) => {
                      handleReferenceFilesSelect(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />

                  <div className="text-xs text-muted-foreground">
                    {referenceCount} image
                    {referenceCount > 1 ? "s" : ""} configurée
                    {referenceCount > 1 ? "s" : ""}
                    {referenceCount > 0
                      ? " — cliquez sur une vignette pour éditer son prompt."
                      : " — sélection multiple ou glisser-déposer possible."}
                  </div>

                  <div
                    className="flex flex-wrap gap-3"
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleReferenceFilesSelect(event.dataTransfer.files);
                    }}
                  >
                    <label
                      htmlFor={REFERENCE_IMAGE_INPUT_ID}
                      className={cn(
                        REFERENCE_TILE_WIDTH,
                        "relative aspect-[9/16] shrink-0 overflow-hidden rounded-lg border-2 border-dashed bg-muted/20 text-muted-foreground transition-colors hover:border-primary/60 hover:bg-muted/40 hover:text-foreground cursor-pointer",
                      )}
                    >
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
                        <ImageUp className="h-5 w-5 shrink-0" />
                        <span className="text-[10px] font-medium leading-tight">
                          Ajouter des images de référence
                        </span>
                      </span>
                    </label>

                    {existingReferences.map((ref) => {
                      const key = `existing:${ref.id}` as const;
                      const isInvalid = isReferenceImagePromptMissing(
                        ref.image_prompt,
                      );
                      const isSelected = selectedReferenceKey === key;

                      return (
                        <div key={ref.id} className={cn("relative shrink-0", REFERENCE_TILE_WIDTH)}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReferenceKey((current) =>
                                current === key ? null : key,
                              )
                            }
                            className={getReferenceTileClasses(isInvalid, isSelected)}
                            title={
                              isInvalid
                                ? "Prompt image manquant ou trop court"
                                : ref.image_prompt
                            }
                          >
                            <img
                              src={ref.url}
                              alt="Référence"
                              className="h-full w-full object-cover"
                            />
                          </button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute right-1 top-1 h-6 w-6 bg-black/65 text-white hover:bg-black/80"
                            onClick={() => removeExistingReference(ref.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}

                    {referenceFiles.map((item) => {
                      const key = `pending:${item.id}` as const;
                      const isInvalid = isReferenceImagePromptMissing(
                        item.image_prompt,
                      );
                      const isSelected = selectedReferenceKey === key;

                      return (
                        <div key={item.id} className={cn("relative shrink-0", REFERENCE_TILE_WIDTH)}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReferenceKey((current) =>
                                current === key ? null : key,
                              )
                            }
                            className={getReferenceTileClasses(isInvalid, isSelected)}
                            title={
                              isInvalid
                                ? "Prompt image manquant ou trop court"
                                : item.image_prompt
                            }
                          >
                            <img
                              src={item.previewUrl}
                              alt="Référence à uploader"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              Nouveau
                            </span>
                          </button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute right-1 top-1 h-6 w-6 bg-black/65 text-white hover:bg-black/80"
                            onClick={() => removePendingReferenceImage(item.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Astuce Windows : maintenez{" "}
                    <kbd className="rounded border bg-muted px-1">Ctrl</kbd> pour
                    en sélectionner plusieurs, ou{" "}
                    <label
                      htmlFor={REFERENCE_FOLDER_INPUT_ID}
                      className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
                    >
                      importer un dossier entier
                    </label>
                    .
                  </p>

                  {(selectedExistingReference || selectedPendingReference) && (
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Prompt associé à l&apos;image sélectionnée
                      </p>

                      {selectedExistingReference && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Prompt image</Label>
                            <Textarea
                              value={selectedExistingReference.image_prompt}
                              onChange={(e) =>
                                updateExistingReference(
                                  selectedExistingReference.id,
                                  { image_prompt: e.target.value },
                                )
                              }
                              rows={4}
                              maxLength={2000}
                              placeholder="Prompt pour cette image…"
                              className={cn(
                                isReferenceImagePromptMissing(
                                  selectedExistingReference.image_prompt,
                                ) && "border-destructive focus-visible:ring-destructive",
                              )}
                            />
                          </div>
                          {generationType !== "image" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Prompt vidéo</Label>
                              <Textarea
                                value={selectedExistingReference.video_prompt}
                                onChange={(e) =>
                                  updateExistingReference(
                                    selectedExistingReference.id,
                                    { video_prompt: e.target.value },
                                  )
                                }
                                rows={3}
                                maxLength={2000}
                                placeholder="Prompt Runway pour cette image…"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                            <div className="min-w-0">
                              <Label className="text-xs">
                                Nécessite le visage
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Envoie l&apos;asset visage à la génération
                              </p>
                            </div>
                            <Switch
                              checked={
                                selectedExistingReference.requires_face_asset
                              }
                              onCheckedChange={(checked) =>
                                updateExistingReference(
                                  selectedExistingReference.id,
                                  { requires_face_asset: checked },
                                )
                              }
                            />
                          </div>
                        </div>
                      )}

                      {selectedPendingReference && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Prompt image</Label>
                            <Textarea
                              value={selectedPendingReference.image_prompt}
                              onChange={(e) =>
                                updatePendingReference(
                                  selectedPendingReference.id,
                                  { image_prompt: e.target.value },
                                )
                              }
                              rows={4}
                              maxLength={2000}
                              placeholder="Prompt pour cette image…"
                              className={cn(
                                isReferenceImagePromptMissing(
                                  selectedPendingReference.image_prompt,
                                ) && "border-destructive focus-visible:ring-destructive",
                              )}
                            />
                          </div>
                          {generationType !== "image" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Prompt vidéo</Label>
                              <Textarea
                                value={selectedPendingReference.video_prompt}
                                onChange={(e) =>
                                  updatePendingReference(
                                    selectedPendingReference.id,
                                    { video_prompt: e.target.value },
                                  )
                                }
                                rows={3}
                                maxLength={2000}
                                placeholder="Prompt Runway pour cette image…"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                            <div className="min-w-0">
                              <Label className="text-xs">
                                Nécessite le visage
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Envoie l&apos;asset visage à la génération
                              </p>
                            </div>
                            <Switch
                              checked={
                                selectedPendingReference.requires_face_asset
                              }
                              onCheckedChange={(checked) =>
                                updatePendingReference(
                                  selectedPendingReference.id,
                                  { requires_face_asset: checked },
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-lg border p-4">
                <legend className="px-2 text-sm font-semibold">
                  Génération d&apos;image (secours)
                </legend>

                <div className="space-y-3">
                  <Label htmlFor="prompt_text">Prompt global</Label>
                  <Textarea
                    id="prompt_text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Ex: Une photo réaliste, drôle et cinématographique…"
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Utilisé uniquement lorsqu&apos;aucune image de référence
                    n&apos;est configurée. Si des références existent, leurs
                    prompts image priment.
                  </p>
                </div>
              </fieldset>

              {generationType !== "image" && (
                <fieldset className="space-y-4 rounded-lg border p-4">
                  <legend className="px-2 text-sm font-semibold">
                    Génération vidéo (secours)
                  </legend>

                  <div className="space-y-3">
                    <Label htmlFor="video_prompt_text">Prompt Runway global</Label>
                    <Textarea
                      id="video_prompt_text"
                      value={videoPromptText}
                      onChange={(e) => setVideoPromptText(e.target.value)}
                      placeholder="Ex: Animer le sujet avec un mouvement caméra fluide, lumière naturelle, rendu cinématique…"
                      required={generationType === "video"}
                      minLength={10}
                      maxLength={2000}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Secours si l&apos;image de référence sélectionnée
                      n&apos;a pas de prompt vidéo. Sinon, le prompt vidéo de
                      la référence est utilisé.
                    </p>
                  </div>
                </fieldset>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
