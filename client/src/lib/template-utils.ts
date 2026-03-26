import type { PromptTemplate, ImageSlot, TextFieldSlot } from "@shared/schema";

export function parseImageSlots(template: PromptTemplate | null): ImageSlot[] {
  if (!template?.image_slots) return [];
  try {
    return JSON.parse(template.image_slots) as ImageSlot[];
  } catch {
    return [];
  }
}

export function parseTextFields(template: PromptTemplate | null): TextFieldSlot[] {
  if (!template?.text_fields) return [];
  try {
    return JSON.parse(template.text_fields) as TextFieldSlot[];
  } catch {
    return [];
  }
}
