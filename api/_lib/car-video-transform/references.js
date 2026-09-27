const path = require("path");
const fs = require("fs");

const VEHICLE_REFERENCE_FILES = {
  luxury_black_suv: "luxury-black-suv.jpg",
  premium_black_sedan: "premium-black-sedan.jpg",
  red_sports: "red-sports-car.jpg",
  premium_white_suv: "premium-white-suv.jpg",
};

function getPublicReferencesDir() {
  return path.join(process.cwd(), "client", "public", "references");
}

/**
 * URL absolue publique pour PoYo (pas de choix utilisateur).
 * Si le fichier local n'existe pas → null (génération sans référence).
 */
function resolveVehicleReferenceImageUrl(selectedVehicle, siteOrigin) {
  const file = VEHICLE_REFERENCE_FILES[selectedVehicle];
  if (!file) return null;
  const localPath = path.join(getPublicReferencesDir(), file);
  if (!fs.existsSync(localPath)) {
    return null;
  }
  const base = String(siteOrigin || process.env.PUBLIC_SITE_URL || "")
    .replace(/\/$/, "");
  if (!base.startsWith("http")) {
    return null;
  }
  return `${base}/references/${file}`;
}

module.exports = {
  VEHICLE_REFERENCE_FILES,
  resolveVehicleReferenceImageUrl,
};
