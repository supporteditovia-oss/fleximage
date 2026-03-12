import { usePrankHistory, useDeletePrank } from "@/hooks/use-pranks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Clock,
  XCircle,
  ImageOff,
  Trash2,
  Loader2,
  Download,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api";

const STATUS_CONFIG = {
  waiting: {
    label: "En cours",
    icon: Clock,
  },
  fail: {
    label: "Échoué",
    icon: XCircle,
  },
};

export default function PrankHistory() {
  const { data: pranks, isLoading } = usePrankHistory();
  const deletePrank = useDeletePrank();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareGuide, setShareGuide] = useState<{
    platform: string;
    prankId: string;
    imageIndex: number;
  } | null>(null);

  function getResultUrls(resultUrlsStr: string | null): string[] {
    if (!resultUrlsStr) return [];
    try {
      return JSON.parse(resultUrlsStr);
    } catch {
      return [];
    }
  }

  function getInputUrls(inputUrlsStr: string | null): string[] {
    if (!inputUrlsStr) return [];
    try {
      return JSON.parse(inputUrlsStr);
    } catch {
      return [];
    }
  }

  async function handleDownload(prankId: string, imageIndex: number = 0) {
    try {
      const res = await authFetch(
        `/api/pranks/${encodeURIComponent(prankId)}/download/${imageIndex}`,
      );
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const ext = blob.type.includes("png")
        ? "png"
        : blob.type.includes("webp")
          ? "webp"
          : "jpg";
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `prank-${randomSuffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Erreur lors du téléchargement", variant: "destructive" });
    }
  }

  async function handleShare(
    prankId: string,
    imageIndex: number,
    platform: "whatsapp" | "snapchat" | "instagram",
  ) {
    if (navigator.share && navigator.canShare) {
      try {
        const res = await authFetch(
          `/api/pranks/${encodeURIComponent(prankId)}/download/${imageIndex}`,
        );
        const blob = await res.blob();
        const file = new File([blob], "prank.jpg", {
          type: blob.type || "image/jpeg",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch {
        // User cancelled or error — fall through to guide
      }
    }
    const names = {
      whatsapp: "WhatsApp",
      snapchat: "Snapchat",
      instagram: "Instagram",
    };
    setShareGuide({ platform: names[platform], prankId, imageIndex });
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deletePrank.mutateAsync(deletingId);
      toast({ title: "Prank supprimé" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-16 pt-10">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-center w-full">
        <span className="relative inline-block">
          Historique des Pranks
          <svg className="pointer-events-none absolute left-0 right-0 mx-auto bottom-[-0.25em] md:bottom-[-0.35em] w-full h-[0.3em] md:h-[0.34em] text-primary/50" viewBox="0 0 100 12" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 Q 50 2 98 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round"></path></svg>
        </span>
      </h1>

      {isLoading ? (
        <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto">
          {[...Array(4)].map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-[9/16] rounded-xl"
            />
          ))}
        </div>
      ) : !pranks?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Aucun prank généré pour le moment.</p>
            <p className="text-sm mt-1">
              Rendez-vous dans "Générer" pour créer votre premier prank.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto">
          {pranks.map((prank) => {
            const urls = getResultUrls(prank.result_urls);
            const inputUrls = getInputUrls(prank.input_urls);
            const isSuccess = prank.status === "success" && urls.length > 0;
            const hasInputImage = inputUrls.length > 0;
            const statusInfo =
              prank.status !== "success"
                ? STATUS_CONFIG[prank.status as keyof typeof STATUS_CONFIG]
                : null;

            return (
              <div
                key={prank.id}
                className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted cursor-pointer"
                onClick={() => isSuccess && setSelectedImage(urls[0])}
              >
                {isSuccess ? (
                  <>
                    {/* Result image (après) — always visible, with hover zoom */}
                    <img
                      src={urls[0]}
                      alt="Prank généré"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      loading="lazy"
                    />

                    {/* Before/after — desktop only: hover clip-path reveal */}
                    {hasInputImage && (
                      <div className="hidden md:block absolute inset-0">
                        <div className="absolute inset-0 w-full h-full overflow-hidden [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0_0_0)] transition-[clip-path] duration-700 ease-in-out">
                          <img
                            src={inputUrls[0]}
                            alt="Image d'origine"
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        {/* Divider line */}
                        <div className="absolute inset-y-0 left-0 group-hover:left-full w-[2px] bg-white/80 shadow-sm transition-all duration-700 ease-in-out pointer-events-none opacity-0 group-hover:opacity-100" />
                        {/* Labels */}
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                          <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            Avant
                          </span>
                        </div>
                        <div className="absolute top-2 left-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300 z-10">
                          <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            Après
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    {statusInfo && (
                      <>
                        <statusInfo.icon className="h-10 w-10 text-muted-foreground/50 animate-pulse" />
                        <span className="text-xs text-muted-foreground">
                          {statusInfo.label}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Delete button — top-right, visible on hover/tap only */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(prank.id);
                  }}
                  className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Bottom gradient overlay with name + action buttons */}
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-12 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {prank.prompt_templates?.name && (
                      <p className="text-white text-sm font-semibold truncate">
                        {prank.prompt_templates.name}
                      </p>
                    )}
                    {prank.fail_message && (
                      <p className="text-xs text-red-300 mt-0.5 line-clamp-1">
                        {prank.fail_message}
                      </p>
                    )}
                  </div>

                  {isSuccess && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(prank.id);
                        }}
                        className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
                        title="Télécharger"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
                            title="Envoyer"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleShare(prank.id, 0, "whatsapp")
                            }
                          >
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleShare(prank.id, 0, "snapchat")
                            }
                          >
                            Snapchat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleShare(prank.id, 0, "instagram")
                            }
                          >
                            Instagram
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image viewer dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-3xl max-h-[90vh] p-2 sm:p-4 flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Prank généré</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Prank généré"
                className="max-w-full max-h-[calc(90vh-3rem)] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prank ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le prank sera définitivement
              supprimé de votre historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePrank.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share tutorial dialog */}
      <Dialog
        open={!!shareGuide}
        onOpenChange={(open) => !open && setShareGuide(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer sur {shareGuide?.platform}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pour partager l'image directement :
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Télécharge l'image avec le bouton ci-dessous</li>
              <li>
                Ouvre{" "}
                <span className="font-semibold">{shareGuide?.platform}</span>
              </li>
              <li>
                Choisis une conversation et envoie l'image depuis ta galerie
              </li>
            </ol>
            <Button
              className="w-full"
              onClick={async () => {
                if (shareGuide) {
                  await handleDownload(
                    shareGuide.prankId,
                    shareGuide.imageIndex,
                  );
                  toast({ title: "Image téléchargée !" });
                }
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Télécharger l'image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
