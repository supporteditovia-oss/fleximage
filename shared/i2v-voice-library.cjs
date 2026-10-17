const library = require("./i2v-voice-library.json");

const FISH_HOMME = "1ebcb0f617c245e1a93aec52f318880b";
const FISH_FEMME = "690813f2df56491b82ee02a22d1c67fd";

function normalizeGender(value) {
  const g = String(value || "").trim().toLowerCase();
  if (g === "homme" || g === "male" || g === "m") return "homme";
  if (g === "femme" || g === "female" || g === "f") return "femme";
  return null;
}

function listAllI2VLibraryEntries() {
  return Array.isArray(library.entries) ? library.entries : [];
}

function listActiveI2VLibraryEntries() {
  return listAllI2VLibraryEntries().filter((e) => e.active === true);
}

function findI2VLibraryEntryById(id) {
  const key = String(id || "").trim();
  if (!key) return null;
  return listAllI2VLibraryEntries().find((e) => e.id === key) ?? null;
}

function resolveDefaultI2VLibraryVoiceId() {
  const active = listActiveI2VLibraryEntries();
  const preferred =
    active.find((e) => e.id === "i2v-fr-homme-chaleureux") ||
    active.find((e) => e.gender === "homme") ||
    active[0];
  return preferred?.id || null;
}

function resolveI2VLibraryFishId(entry) {
  if (!entry) return null;
  const fish = String(entry.fishId || "").trim();
  return /^[a-f0-9]{32}$/i.test(fish) ? fish : null;
}

module.exports = {
  FISH_HOMME,
  FISH_FEMME,
  libraryVersion: library.version ?? 1,
  normalizeGender,
  listAllI2VLibraryEntries,
  listActiveI2VLibraryEntries,
  findI2VLibraryEntryById,
  resolveDefaultI2VLibraryVoiceId,
  resolveI2VLibraryFishId,
};
