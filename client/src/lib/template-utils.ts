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

/** Whether the user must complete face capture before generating with this template. */
export function templateRequiresFaceCapture(
  template: Pick<
    PromptTemplate,
    | "requires_face_capture"
    | "reference_image_count"
    | "has_face_optional_reference_image"
  >,
): boolean {
  if (typeof template.requires_face_capture === "boolean") {
    return template.requires_face_capture;
  }
  return (
    template.reference_image_count === 0 ||
    !template.has_face_optional_reference_image
  );
}
