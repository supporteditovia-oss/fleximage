const { getOneshotApiConfig } = require("./oneshot");
const { isDeepInfraConfigured } = require("./deepinfra");
const { isKieConfigured } = require("./kie");
const { isRunwayConfigured } = require("./kie-runway");

function envPresent(name) {
  const raw = process.env[name];
  return Boolean(raw != null && String(raw).trim() !== "");
}

function isR2Configured() {
  return (
    envPresent("R2_ACCOUNT_ID") &&
    envPresent("R2_ACCESS_KEY_ID") &&
    envPresent("R2_SECRET_ACCESS_KEY") &&
    envPresent("R2_BUCKET_NAME") &&
    envPresent("R2_PUBLIC_URL")
  );
}

/**
 * État des variables d'environnement côté runtime Vercel (sans exposer les secrets).
 */
async function getProviderEnvStatus() {
  const oneshot = getOneshotApiConfig();
  const oneshotConfigured = Boolean(oneshot.url && oneshot.key);

  const deepinfra = isDeepInfraConfigured();
  const kie = isKieConfigured();

  const imageReady = oneshotConfigured;
  const imageWithRefsReady = oneshotConfigured;

  const videoReady = isRunwayConfigured();

  const warnings = [];
  if (!oneshotConfigured) {
    warnings.push("OneShot non configuré — génération d'images indisponible.");
  }
  if (!deepinfra) {
    warnings.push("DEEPINFRA_API_KEY manquant — détourage Bria indisponible.");
  }
  if (!kie) {
    warnings.push("KIE_AI_API_KEY manquant — pas de vidéo IA / Kling Motion.");
  }
  if (deepinfra && !isR2Configured()) {
    warnings.push("R2 incomplet — le détourage Bria ne pourra pas enregistrer les images.");
  }
  if (!videoReady) {
    warnings.push("Vidéo IA / Kling : KIE_AI_API_KEY requis.");
  }

  return {
    checkedAt: new Date().toISOString(),
    runtime: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    vercelRegion: process.env.VERCEL_REGION || null,
    oneshot: {
      configured: oneshotConfigured,
      hasUrl: Boolean(oneshot.url),
      hasKey: Boolean(oneshot.key),
    },
    deepinfra: {
      configured: deepinfra,
    },
    kie: {
      configured: kie,
      klingMotionModel: "kling-3.0/motion-control",
      runwayVideo: videoReady,
    },
    r2: { configured: isR2Configured() },
    readiness: {
      image: imageReady,
      imageWithReferencePhotos: imageWithRefsReady,
      video: videoReady,
      briaBackgroundRemoval: deepinfra && isR2Configured(),
      klingMotion: kie && videoReady,
    },
    warnings,
  };
}

module.exports = {
  getProviderEnvStatus,
  isR2Configured,
};
