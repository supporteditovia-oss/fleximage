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

function resolveGenerationMode(template) {
  if (template.readyImagePath) return "face-swap";
  if (template.generationMode === "vehicle-swap") return "vehicle-swap";
  if (template.generationMode === "face-swap") return "face-swap";
  if (template.vehicleReferencePath && template.requiresUserPhoto === false) {
    return "vehicle-swap";
  }
  return "face-swap";
}

/** Modèles visibles côté API publique `/api/templates`. */
function listBuiltinTemplatesForApi() {
  return catalog.map((item) => {
    const demoAfterPath =
      item.demoAfterPath ||
      (item.readyImagePath && item.readyImagePath !== item.imagePath
        ? item.readyImagePath
        : null);
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      previewUrl: resolveReferenceUrl(
        item.readyImagePath || item.imagePath,
      ),
      demoBeforeUrl: resolveReferenceUrl(item.imagePath),
      demoAfterUrl: demoAfterPath ? resolveReferenceUrl(demoAfterPath) : null,
      icon: null,
      keywords: [],
      isFeatured: true,
      generationType: "image",
      category: item.category,
      categoryName: item.categoryName,
      referenceImageCount: item.readyImagePath
        ? 1
        : item.vehicleReferencePath
          ? 2
          : 1,
      requiresUserPhoto:
        item.requiresUserPhoto !== false &&
        resolveGenerationMode(item) !== "vehicle-swap",
      generationMode: resolveGenerationMode(item),
      isBuiltin: true,
    };
  });
}

/**
 * Résout une génération depuis un modèle intégré au site.
 *
 * Deux modes :
 * - vehicle-swap : remplace le quad dans la scène (sans photo utilisateur)
 * - face-swap : remplace la personne (photo utilisateur requise)
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

  const mode = resolveGenerationMode(template);

  if (mode === "vehicle-swap") {
    if (!template.vehicleReferencePath) {
      return {
        ok: false,
        code: "TEMPLATE_NOT_READY",
        message: "Ce modèle n'est pas encore configuré.",
      };
    }

    const prompt = String(
      template.vehicleSwapPrompt || template.prompt || "",
    ).trim();
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
      extraReferenceUrls: [resolveReferenceUrl(template.vehicleReferencePath)],
      referenceId: template.id,
      templateName: template.name,
      isBuiltin: true,
      generationMode: "vehicle-swap",
    };
  }

  if (!hasUserPhoto) {
    return {
      ok: false,
      code: "USER_PHOTO_REQUIRED",
      message: "Ajoute une photo de toi pour utiliser ce modèle.",
    };
  }

  const prompt = String(
    template.faceSwapPrompt || template.prompt || "",
  ).trim();
  if (!prompt) {
    return {
      ok: false,
      code: "TEMPLATE_NOT_READY",
      message: "Ce modèle n'est pas encore configuré.",
    };
  }

  const scenePath = template.readyImagePath || template.imagePath;

  return {
    ok: true,
    prompt,
    referenceUrl: resolveReferenceUrl(scenePath),
    extraReferenceUrls: [],
    referenceId: template.id,
    templateName: template.name,
    isBuiltin: true,
    generationMode: "face-swap",
  };
}

module.exports = {
  isBuiltinTemplateId,
  getBuiltinTemplate,
  listBuiltinTemplatesForApi,
  resolveBuiltinTemplateGeneration,
  resolveReferenceUrl,
  resolveGenerationMode,
};
