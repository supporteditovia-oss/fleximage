/**
 * Génération à partir d'un modèle prêt à l'emploi.
 *
 * Un modèle porte plusieurs images de référence, chacune avec son prompt.
 * On en tire une au hasard : deux personnes qui lancent le même modèle
 * n'obtiennent pas la même scène.
 *
 * `requires_face_asset` dit si la référence a besoin d'une photo de
 * l'utilisateur pour y placer son visage. Sans photo fournie, seules les
 * références qui n'en demandent pas sont éligibles.
 */

async function loadActiveTemplate(supabase, templateId) {
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, prompt_text, is_active")
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function pickReferenceImage(supabase, templateId, { hasUserPhoto }) {
  const { data, error } = await supabase
    .from("template_reference_images")
    .select("id, url, image_prompt, video_prompt, requires_face_asset")
    .eq("template_id", templateId);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const pool = hasUserPhoto
    ? data
    : data.filter((row) => row.requires_face_asset === false);

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Résout tout ce qu'il faut pour lancer une génération depuis un modèle.
 *
 * @returns {Promise<{ ok: true, prompt: string, referenceUrl: string,
 *                     referenceId: string, templateName: string }
 *                 | { ok: false, code: string, message: string }>}
 */
async function resolveTemplateGeneration(supabase, templateId, { hasUserPhoto }) {
  const template = await loadActiveTemplate(supabase, templateId);
  if (!template) {
    return {
      ok: false,
      code: "TEMPLATE_NOT_FOUND",
      message: "Ce modèle n'est plus disponible.",
    };
  }

  const reference = await pickReferenceImage(supabase, templateId, {
    hasUserPhoto,
  });

  if (!reference) {
    // Soit le modèle n'a aucune référence, soit toutes réclament une photo.
    return {
      ok: false,
      code: hasUserPhoto ? "TEMPLATE_NOT_READY" : "USER_PHOTO_REQUIRED",
      message: hasUserPhoto
        ? "Ce modèle n'est pas encore configuré."
        : "Ajoute une photo de toi pour utiliser ce modèle.",
    };
  }

  const prompt =
    (reference.image_prompt || "").trim() ||
    (template.prompt_text || "").trim();

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
    referenceUrl: reference.url,
    referenceId: reference.id,
    templateName: template.name,
  };
}

module.exports = {
  loadActiveTemplate,
  pickReferenceImage,
  resolveTemplateGeneration,
};
