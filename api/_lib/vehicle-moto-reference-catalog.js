const catalog = require("../../shared/vehicle-moto-reference-catalog.json");
const {
  isMotorcycleReplacePrompt,
  isMotorcycleRidePrompt,
  isOutfitFromReferencePrompt,
  isMotorcycleBikeMention,
} = require("./prompt-guard");

function normalizePromptText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectCatalogModel(prompt) {
  const text = normalizePromptText(prompt);
  for (const entry of catalog) {
    const hit = (entry.match || []).some((token) => {
      const t = normalizePromptText(token);
      return t && text.includes(t);
    });
    if (hit) return entry;
  }
  return null;
}

function shouldAttachCatalogRefs(prompt) {
  const entry = detectCatalogModel(prompt);
  if (!entry) return false;
  if (isOutfitFromReferencePrompt(prompt) && !isMotorcycleReplacePrompt(prompt)) {
    return false;
  }
  return (
    isMotorcycleReplacePrompt(prompt) ||
    isMotorcycleRidePrompt(prompt) ||
    isMotorcycleBikeMention(prompt)
  );
}

/**
 * Append static multi-angle factory refs when user names a catalogued model.
 * User-uploaded images stay first (scene + optional ref); catalog fills geometry gaps.
 */
function enrichImageUrlsWithVehicleCatalog(prompt, imageUrls, resolveUrl) {
  const urls = Array.isArray(imageUrls) ? [...imageUrls] : [];
  if (!shouldAttachCatalogRefs(prompt) || typeof resolveUrl !== "function") {
    return { urls, promptInject: "", catalogId: null, addedCount: 0 };
  }
  const entry = detectCatalogModel(prompt);
  if (!entry) {
    return { urls, promptInject: "", catalogId: null, addedCount: 0 };
  }

  const existing = new Set(urls.map((u) => String(u || "").trim()).filter(Boolean));
  const maxAdd = Math.max(0, 4 - urls.length);
  let addedCount = 0;
  for (const angle of entry.angles || []) {
    if (addedCount >= maxAdd) break;
    const path = String(angle.path || "").trim();
    if (!path) continue;
    const url = resolveUrl(path);
    if (!url || existing.has(url)) continue;
    urls.push(url);
    existing.add(url);
    addedCount += 1;
  }

  const promptInject =
    addedCount > 0 && entry.promptBlock ? String(entry.promptBlock).trim() : "";

  return {
    urls,
    promptInject,
    catalogId: addedCount > 0 ? entry.id : null,
    addedCount,
  };
}

module.exports = {
  detectCatalogModel,
  shouldAttachCatalogRefs,
  enrichImageUrlsWithVehicleCatalog,
};
