const { isUserAdmin } = require("./admin-access");

const VOICE_CLONING_PREVIEW_MESSAGE =
  "Clonage IA est en preview fondateur. Réservé aux admins pour l’instant.";

/**
 * Clonage IA (génération + création de clone) — admin uniquement jusqu’à GA.
 * @throws {{ status: number, code: string, message: string }}
 */
async function assertVoiceCloningAdminPreview(supabase, userId) {
  const allowed = await isUserAdmin(supabase, userId);
  if (!allowed) {
    throw Object.assign(new Error(VOICE_CLONING_PREVIEW_MESSAGE), {
      status: 403,
      code: "voice_cloning_admin_preview",
    });
  }
}

module.exports = {
  assertVoiceCloningAdminPreview,
  VOICE_CLONING_PREVIEW_MESSAGE,
};
