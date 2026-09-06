const catalog = require("../../shared/builtin-outfit-templates.json");
const { resolveReferenceUrl } = require("./builtin-image-templates");

function isBuiltinOutfitId(outfitId) {
  return (
    typeof outfitId === "string" &&
    catalog.some((item) => item.id === outfitId || item.slug === outfitId)
  );
}

function getBuiltinOutfit(outfitId) {
  return (
    catalog.find((item) => item.id === outfitId || item.slug === outfitId) ||
    null
  );
}

function listBuiltinOutfitsForApi() {
  return catalog.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    previewUrl: resolveReferenceUrl(item.imagePath),
    category: item.category,
    categoryName: item.categoryName,
  }));
}

function resolveBuiltinOutfitReferenceUrl(outfitId) {
  const outfit = getBuiltinOutfit(outfitId);
  if (!outfit) return null;
  return resolveReferenceUrl(outfit.imagePath);
}

module.exports = {
  isBuiltinOutfitId,
  getBuiltinOutfit,
  listBuiltinOutfitsForApi,
  resolveBuiltinOutfitReferenceUrl,
};
