const { requireAdmin, sendError } = require("../admin-auth");
const {
  listAllI2VLibraryEntries,
  toPublicLibraryDto,
} = require("../i2v-voice-library");
const { libraryVersion } = require("../../../shared/i2v-voice-library.cjs");
const { I2V_VOICE_TEST_PHRASE_FR } = require("../../../shared/i2v-voice-test-phrase.cjs");

module.exports = async function adminI2VVoiceLibraryHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    await requireAdmin(req);
    const raw = listAllI2VLibraryEntries();
    const entries = raw.map((entry) => ({
      ...toPublicLibraryDto(entry),
      fishId: entry.fishId,
      fishTitle: String(entry.fishTitle || "").trim() || null,
      ttsSpeed: entry.ttsSpeed,
      curationStatus: entry.curationStatus || "candidate",
      active: entry.active === true,
      commercialUseOk: entry.commercialUseOk !== false,
    }));

    const fishIds = entries.map((e) => String(e.fishId || "").toLowerCase());
    const active = entries.filter((e) => e.active);
    const candidates = entries.filter((e) => e.curationStatus === "candidate");
    const hommes = entries.filter((e) => e.gender === "homme");
    const femmes = entries.filter((e) => e.gender === "femme");
    const matureHommes = hommes.filter((e) => e.ageBand === "35-50");
    const matureFemmes = femmes.filter((e) => e.ageBand === "35-50");

    res.status(200).json({
      version: libraryVersion,
      testPhrase: I2V_VOICE_TEST_PHRASE_FR,
      entries,
      stats: {
        total: entries.length,
        activeCount: active.length,
        targetActive: 12,
        candidateCount: candidates.length,
        distinctFishIds: new Set(fishIds.filter(Boolean)).size,
        hommes: hommes.length,
        femmes: femmes.length,
        matureHommes: matureHommes.length,
        matureFemmes: matureFemmes.length,
      },
    });
  } catch (error) {
    console.error("[admin-i2v-voice-library]", error);
    sendError(res, error);
  }
};
