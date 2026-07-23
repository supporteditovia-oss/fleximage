import type { Category, PromptTemplate } from "@shared/schema";

function shouldUseEnglish(language?: string) {
  return language?.toLowerCase().startsWith("en") ?? false;
}

export function getLocalizedTemplateName(
  template: Pick<PromptTemplate, "name" | "name_en">,
  language?: string,
) {
  if (shouldUseEnglish(language) && template.name_en?.trim()) {
    return template.name_en;
  }
  return template.name;
}

export function getLocalizedCategoryName(
  category: Pick<Category, "name" | "name_en">,
  language?: string,
) {
  if (shouldUseEnglish(language) && category.name_en?.trim()) {
    return category.name_en;
  }
  return category.name;
}

export function getLocalizedTemplateCategoryName(
  template: Pick<PromptTemplate, "category" | "categoryName" | "categoryNameEn">,
  language?: string,
) {
  if (shouldUseEnglish(language) && template.categoryNameEn?.trim()) {
    return template.categoryNameEn;
  }
  return template.categoryName || template.category;
}

export function getLocalizedHistoryTemplateName(
  template: { name: string; nameEn?: string | null },
  language?: string,
) {
  if (shouldUseEnglish(language) && template.nameEn?.trim()) {
    return template.nameEn;
  }
  return template.name;
}

/** Whether a template can be generated in the given output mode. */
export function templateSupportsGenerationMode(
  template: Pick<PromptTemplate, "generation_type">,
  mode: "image" | "video",
): boolean {
  const generationType = template.generation_type ?? "image";
  if (generationType === "both") return true;
  if (generationType === "video") return mode === "video";
  return mode === "image";
}

/** Preferred mode when the user picks a template without a compatible toggle selection. */
export function getTemplateDefaultGenerationMode(
  template: Pick<PromptTemplate, "generation_type">,
): "image" | "video" {
  return template.generation_type === "video" ? "video" : "image";
}
