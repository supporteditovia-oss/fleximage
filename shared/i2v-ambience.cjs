const VALID_AMBIENCE = new Set(["none", "street", "crowd_protest"]);

function normalizeI2VAmbience(raw) {
  const v = String(raw || "none")
    .trim()
    .toLowerCase();
  return VALID_AMBIENCE.has(v) ? v : "none";
}

module.exports = { VALID_AMBIENCE, normalizeI2VAmbience };
