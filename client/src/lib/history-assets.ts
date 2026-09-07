import type { LarpHistoryItem } from "@/hooks/use-larps";
import { findBuiltinTemplate } from "@/lib/builtin-image-templates";

export function getAssetUrls(
  assets: string[] | string | null | undefined,
): string[] {
  if (!assets) return [];
  if (Array.isArray(assets)) {
    return assets.filter((url): url is string => typeof url === "string" && url.length > 0);
  }
  if (typeof assets === "string") {
    try {
      const parsed = JSON.parse(assets);
      return Array.isArray(parsed)
        ? parsed.filter((url): url is string => typeof url === "string" && url.length > 0)
        : assets.startsWith("http")
          ? [assets]
          : [];
    } catch {
      return assets.startsWith("http") ? [assets] : [];
    }
  }
  return [];
}

/** URLs affichables pour une entrée d'historique (output puis watermark). */
export function getHistoryMediaUrls(item: Pick<LarpHistoryItem, "outputAssets" | "watermarkedAssets">): string[] {
  const output = getAssetUrls(item.outputAssets);
  const watermarked = getAssetUrls(item.watermarkedAssets);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const url of [...output, ...watermarked]) {
    if (seen.has(url)) continue;
    seen.add(url);
    merged.push(url);
  }
  return merged;
}

export function historyItemHasMedia(item: Pick<LarpHistoryItem, "outputAssets" | "watermarkedAssets" | "status">): boolean {
  if (getHistoryMediaUrls(item).length > 0) return true;
  return item.status === "success";
}

export function getHistoryItemLabel(
  item: Pick<LarpHistoryItem, "template" | "templateId" | "finalPrompt">,
): string {
  const templateName = item.template?.name?.trim();
  if (templateName) return templateName;

  const fromBuiltin = item.templateId
    ? findBuiltinTemplate(item.templateId)?.name
    : undefined;
  if (fromBuiltin) return fromBuiltin;

  const prompt = item.finalPrompt?.trim();
  if (prompt && prompt.length > 0 && prompt !== " ") {
    return prompt.length > 48 ? `${prompt.slice(0, 45)}…` : prompt;
  }

  return "Création IA";
}
