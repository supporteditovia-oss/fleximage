import { Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api";

interface PrankResultProps {
  resultUrls: string[];
  prankId: string;
}

export function PrankResult({ resultUrls, prankId }: PrankResultProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [shareGuide, setShareGuide] = useState<{
    platform: string;
    imageIndex: number;
  } | null>(null);

  if (!resultUrls.length) {
    return (
      <p className="text-center text-muted-foreground">Aucune image générée.</p>
    );
  }

  async function handleDownload(imageIndex: number) {
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
        // Fall through to guide
      }
    }
    const names = {
      whatsapp: "WhatsApp",
      snapchat: "Snapchat",
      instagram: "Instagram",
    };
    // Small delay to ensure dropdown closes properly before opening dialog
    setTimeout(() => {
      setShareGuide({ platform: names[platform], imageIndex });
    }, 0);
  }

  return (
    <>
      <div className="flex flex-wrap justify-center gap-4">
        {resultUrls.map((url, index) => (
          <div
            key={index}
            className="relative rounded-lg overflow-hidden border max-w-[240px]"
          >
            <img
              src={url}
              alt={`Prank généré ${index + 1}`}
              className="w-full max-h-[50vh] object-contain"
              loading="lazy"
            />
            <div className="flex flex-col gap-2 p-2">
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => handleDownload(index)}
              >
                <Download className="mr-1 h-3 w-3" />
                Télécharger
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="w-full">
                    <Send className="mr-1 h-3 w-3" />
                    Envoyer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem
                    onClick={() => handleShare(index, "whatsapp")}
                  >
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShare(index, "snapchat")}
                  >
                    Snapchat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleShare(index, "instagram")}
                  >
                    Instagram
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Share tutorial — Conditional rendering based on screen size */}
      {!isMobile ? (
        <Dialog
          open={!!shareGuide}
          onOpenChange={(open) => !open && setShareGuide(null)}
        >
          <DialogContent>
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
                className="w-full rounded-full"
                onClick={async () => {
                  if (shareGuide) {
                    await handleDownload(shareGuide.imageIndex);
                    toast({ title: "Image téléchargée !" });
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger l'image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer
          open={!!shareGuide}
          onOpenChange={(open) => !open && setShareGuide(null)}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Envoyer sur {shareGuide?.platform}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-4 px-4 pb-6">
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
                className="w-full rounded-full"
                onClick={async () => {
                  if (shareGuide) {
                    await handleDownload(shareGuide.imageIndex);
                    toast({ title: "Image téléchargée !" });
                    setShareGuide(null);
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger l'image
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
