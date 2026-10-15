const { sendError } = require("../user-auth");
const {
  resolveI2VAdminStudioAccess,
  assertI2VAdminStudio,
} = require("../i2v-admin-studio");
const {
  listActiveI2VLibraryEntries,
  toPublicLibraryDto,
  listUserVoiceClonesForI2V,
  resolveDefaultI2VLibraryVoiceId,
} = require("../i2v-voice-library");
const { I2V_VOICE_PREVIEW_PHRASE_FR } = require("../../../shared/i2v-voice-test-phrase.cjs");

module.exports = async function i2vVoicesHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const { supabase, userId, isAdmin } = await resolveI2VAdminStudioAccess(req);
    assertI2VAdminStudio(isAdmin);
    const library = listActiveI2VLibraryEntries()
      .map(toPublicLibraryDto)
      .filter(Boolean);
    const clones = await listUserVoiceClonesForI2V(supabase, userId);

    res.status(200).json({
      library,
      clones,
      defaultVoiceId: resolveDefaultI2VLibraryVoiceId(),
      previewPhrase: I2V_VOICE_PREVIEW_PHRASE_FR,
    });
  } catch (error) {
    console.error("[i2v-voices]", error);
    sendError(res, error);
  }
};
