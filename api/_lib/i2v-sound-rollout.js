/**
 * Rollout I2V son (ambiance + SFX + auto).
 * I2V_SOUND_STUDIO=0 → coupé pour tous
 * I2V_SOUND_STUDIO=1 → ouvert à tous (feu vert prod futur)
 * défaut → admin uniquement
 */
const { isI2VAdminStudioEnabled } = require("./i2v-admin-studio");

function isI2VSoundStudioEnabledForUser(context = {}) {
  const flag = String(process.env.I2V_SOUND_STUDIO || "").trim();
  if (flag === "0") return false;
  if (flag === "1") return true;
  return isI2VAdminStudioEnabled(context);
}

module.exports = { isI2VSoundStudioEnabledForUser };
