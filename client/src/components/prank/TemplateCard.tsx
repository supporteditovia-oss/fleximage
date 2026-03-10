import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PromptTemplate } from "@shared/schema";

interface TemplateCardProps {
  template: PromptTemplate;
  isSelected: boolean;
  onClick: () => void;
}

export function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{template.name}</h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {template.category}
          </Badge>
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 line-clamp-1 font-mono">
          {template.prompt_text}
        </p>
      </CardContent>
    </Card>
  );
}
