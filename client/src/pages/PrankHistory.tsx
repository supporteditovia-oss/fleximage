import { usePrankHistory } from "@/hooks/use-pranks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock, CheckCircle2, XCircle, ImageOff } from "lucide-react";

const STATUS_CONFIG = {
  waiting: {
    label: "En cours",
    variant: "secondary" as const,
    icon: Clock,
  },
  success: {
    label: "Terminé",
    variant: "default" as const,
    icon: CheckCircle2,
  },
  fail: {
    label: "Échoué",
    variant: "destructive" as const,
    icon: XCircle,
  },
};

export default function PrankHistory() {
  const { data: pranks, isLoading } = usePrankHistory();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  function getResultUrls(resultUrlsStr: string | null): string[] {
    if (!resultUrlsStr) return [];
    try {
      return JSON.parse(resultUrlsStr);
    } catch {
      return [];
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Historique des Pranks</h1>
        <p className="text-muted-foreground mt-1">
          Retrouvez tous vos pranks générés.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !pranks?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Aucun prank généré pour le moment.</p>
            <p className="text-sm mt-1">Rendez-vous dans "Générer" pour créer votre premier prank.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pranks.map((prank) => {
            const urls = getResultUrls(prank.result_urls);
            const statusConfig = STATUS_CONFIG[prank.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={prank.id} className="overflow-hidden">
                {/* Thumbnail */}
                {urls.length > 0 ? (
                  <div
                    className="aspect-video bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(urls[0])}
                  >
                    <img
                      src={urls[0]}
                      alt="Prank généré"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {prank.status === "waiting" ? (
                      <Clock className="h-8 w-8 text-muted-foreground/50 animate-pulse" />
                    ) : (
                      <ImageOff className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                )}

                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">
                      {prank.prompt_templates?.name || "Template supprimé"}
                    </p>
                    <Badge variant={statusConfig.variant} className="shrink-0">
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {prank.prompt_templates?.category && (
                    <Badge variant="outline" className="text-xs">
                      {prank.prompt_templates.category}
                    </Badge>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {format(new Date(prank.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>

                  {prank.fail_message && (
                    <p className="text-xs text-destructive">{prank.fail_message}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Image viewer dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Prank généré</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Prank généré"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
