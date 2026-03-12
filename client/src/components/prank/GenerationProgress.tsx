import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrankStatus } from "@/hooks/use-pranks";
import { PrankResult } from "./PrankResult";

interface GenerationProgressProps {
  taskId: string;
  onRetry: () => void;
  onReset: () => void;
}

export function GenerationProgress({
  taskId,
  onRetry,
  onReset,
}: GenerationProgressProps) {
  const { data, isLoading, error } = usePrankStatus(taskId);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Connexion au serveur...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">Erreur de connexion</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Recommencer
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.status === "waiting") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-medium">Génération en cours...</p>
          <p className="text-sm text-muted-foreground">
            Votre prank est en train d'être créé par l'IA. Cela peut prendre
            quelques instants.
          </p>
        </div>
      </div>
    );
  }

  if (data.status === "fail") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <XCircle className="h-10 w-10 text-destructive" />
        <div className="text-center space-y-1">
          <p className="text-destructive font-medium">Échec de la génération</p>
          <p className="text-sm text-muted-foreground">
            {data.failMessage ||
              "Une erreur est survenue lors de la génération."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Recommencer
          </Button>
          <Button onClick={onRetry}>Réessayer</Button>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 justify-center">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <p className="font-medium text-green-600">Prank généré avec succès !</p>
      </div>
      <PrankResult resultUrls={data.resultUrls} prankId={data.prankId} />
      <div className="flex justify-center">
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Créer un autre prank
        </Button>
      </div>
    </div>
  );
}
