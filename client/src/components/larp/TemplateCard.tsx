import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PromptTemplate } from "@shared/schema";
import { useTranslation } from "react-i18next";
import {
  getLocalizedTemplateCategoryName,
  getLocalizedTemplateName,
} from "@/lib/template-utils";

interface TemplateCardProps {
  template: PromptTemplate;
  isSelected: boolean;
  onClick: () => void;
}

export function TemplateCard({
  template,
  isSelected,
  onClick,
}: TemplateCardProps) {
  const { i18n } = useTranslation();
  const templateName = getLocalizedTemplateName(template, i18n.language);
  const categoryName = getLocalizedTemplateCategoryName(template, i18n.language);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "ring-2 ring-primary border-primary"
          : "hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">
            {templateName}
          </h3>
          {categoryName && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {categoryName}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70 line-clamp-1 font-mono">
          {template.prompt_text}
        </p>
      </CardContent>
    </Card>
  );
}
