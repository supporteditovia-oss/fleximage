/** Catalogue effets sonores I2V (noms de fichiers = id). */
const I2V_SFX_IDS = [
  "explosion",
  "fuite_eau",
  "coup_sourd",
  "verre_brise",
  "sirene_police",
  "foule_applaudit",
  "tonnerre",
  "klaxon",
  "porte_claque",
  "alarme",
];

const I2V_SFX_MOMENTS = ["start", "middle", "end"];

function normalizeI2VSfx(raw) {
  const v = String(raw || "none")
    .trim()
    .toLowerCase();
  if (v === "none" || v === "") return "none";
  return I2V_SFX_IDS.includes(v) ? v : "none";
}

function normalizeI2VSfxMoment(raw) {
  const v = String(raw || "middle")
    .trim()
    .toLowerCase();
  return I2V_SFX_MOMENTS.includes(v) ? v : "middle";
}

module.exports = {
  I2V_SFX_IDS,
  I2V_SFX_MOMENTS,
  normalizeI2VSfx,
  normalizeI2VSfxMoment,
};
