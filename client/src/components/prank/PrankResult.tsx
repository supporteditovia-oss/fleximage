import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrankResultProps {
  resultUrls: string[];
}

export function PrankResult({ resultUrls }: PrankResultProps) {
  if (!resultUrls.length) {
    return (
      <p className="text-center text-muted-foreground">Aucune image générée.</p>
    );
  }

  function handleDownload(url: string, index: number) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `prank-${index + 1}.jpg`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {resultUrls.map((url, index) => (
        <div
          key={index}
          className="relative group rounded-lg overflow-hidden border max-w-[240px]"
        >
          <img
            src={url}
            alt={`Prank généré ${index + 1}`}
            className="w-full max-h-[50vh] object-contain"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-2">
            <Button
              size="sm"
              variant="secondary"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDownload(url, index)}
            >
              <Download className="mr-1 h-3 w-3" />
              Télécharger
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
