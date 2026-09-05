const catalog = require("../../shared/builtin-image-templates.json");

function siteBaseUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    process.env.VITE_SITE_URL ||
    "https://www.luxeflexia.com"
  ).replace(/\/$/, "");
}

function resolveReferenceUrl(imagePath) {
  return `${siteBaseUrl()}${imagePath}`;
}

function isBuiltinTemplateId(templateId) {
  return (
    typeof templateId === "string" &&
    templateId.startsWith("builtin-") &&
    catalog.some((item) => item.id === templateId)
  );
}

function getBuiltinTemplate(templateId) {
  return catalog.find((item) => item.id === templateId) || null;
}

/** Modèles visibles côté API publique `/api/templates`. */
function listBuiltinTemplatesForApi() {
  return catalog.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    previewUrl: resolveReferenceUrl(item.imagePath),
    icon: null,
    keywords: [],
    isFeatured: true,
    generationType: "image",
    category: item.category,
    categoryName: item.categoryName,
    referenceImageCount: 1,
    requiresUserPhoto: true,
    isBuiltin: true,
  }));
}

/**
 * Résout une génération depuis un modèle intégré au site.
 * Ces modèles ne passent pas par Supabase : ils fonctionnent même si l'admin
 * n'a encore rien configuré.
 */
function resolveBuiltinTemplateGeneration(templateId, { hasUserPhoto }) {
  const template = getBuiltinTemplate(templateId);
  if (!template) {
    return {
      ok: false,
      code: "TEMPLATE_NOT_FOUND",
      message: "Ce modèle n'est plus disponible.",
    };
  }

  if (!hasUserPhoto) {
    return {
      ok: false,
      code: "USER_PHOTO_REQUIRED",
      message: "Ajoute une photo de toi pour utiliser ce modèle.",
    };
  }

  const prompt = String(template.prompt || "").trim();
  if (!prompt) {
    return {
      ok: false,
      code: "TEMPLATE_NOT_READY",
      message: "Ce modèle n'est pas encore configuré.",
    };
  }

  return {
    ok: true,
    prompt,
    referenceUrl: resolveReferenceUrl(template.imagePath),
    referenceId: template.id,
    templateName: template.name,
    isBuiltin: true,
  };
}

module.exports = {
  isBuiltinTemplateId,
  getBuiltinTemplate,
  listBuiltinTemplatesForApi,
  resolveBuiltinTemplateGeneration,
  resolveReferenceUrl,
};
