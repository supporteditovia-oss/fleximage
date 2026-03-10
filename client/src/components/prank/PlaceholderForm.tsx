import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlaceholderFormProps {
  promptText: string;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function extractPlaceholders(promptText: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  while ((match = regex.exec(promptText)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }
  return placeholders;
}

export function PlaceholderForm({ promptText, values, onChange }: PlaceholderFormProps) {
  const placeholders = useMemo(() => extractPlaceholders(promptText), [promptText]);

  if (placeholders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ce template ne contient pas de champs personnalisables.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {placeholders.map((placeholder) => (
        <div key={placeholder} className="space-y-1">
          <Label htmlFor={`ph-${placeholder}`} className="capitalize">
            {placeholder.replace(/_/g, " ")}
          </Label>
          <Input
            id={`ph-${placeholder}`}
            value={values[placeholder] || ""}
            onChange={(e) =>
              onChange({ ...values, [placeholder]: e.target.value })
            }
            placeholder={`Entrez ${placeholder.replace(/_/g, " ")}...`}
          />
        </div>
      ))}
    </div>
  );
}
