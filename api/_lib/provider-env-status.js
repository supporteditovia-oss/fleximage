const { getOneshotApiConfig } = require("./oneshot");
const { isDeepInfraConfigured, getDeepInfraModel } = require("./deepinfra");
const { isKieConfigured } = require("./kie");
const { isRunwayConfigured } = require("./kie-runway");
const { getOneshotRemainingCredits } = require("./model-router");

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
async function getProviderEnvStatus(supabase) {
  const oneshot = getOneshotApiConfig();
  const oneshotConfigured = Boolean(oneshot.url && oneshot.key);
  let oneshotRemainingCredits = null;
  try {
    oneshotRemainingCredits = await getOneshotRemainingCredits(supabase);
  } catch {
    oneshotRemainingCredits = null;
  }

  const deepinfra = isDeepInfraConfigured();
  const kie = isKieConfigured();

  const imageReady =
    oneshotConfigured ||
    deepinfra ||
    kie;

  const imageWithRefsReady = oneshotConfigured || kie;

  const videoReady = isRunwayConfigured();

  const warnings = [];
  if (!deepinfra) {
    warnings.push("DEEPINFRA_API_KEY manquant — pas de Nano Banana 2 (texte sans refs).");
  }
  if (!kie) {
    warnings.push("KIE_AI_API_KEY manquant — pas de Kie image ni vidéo/Kling.");
  }
  if (deepinfra && !isR2Configured()) {
    warnings.push("R2 incomplet — DeepInfra ne pourra pas enregistrer les images.");
  }
  if (!oneshotConfigured && !deepinfra && !kie) {
    warnings.push("Aucun moteur image configuré.");
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
      remainingCredits: oneshotRemainingCredits,
      remainingCreditsEnvSet: envPresent("ONESHOT_REMAINING_CREDITS"),
    },
    deepinfra: {
      configured: deepinfra,
      model: getDeepInfraModel(),
    },
    kie: {
      configured: kie,
      imageModel: "nano-banana-2",
      klingMotionModel: "kling-3.0/motion-control",
      runwayVideo: videoReady,
    },
    r2: { configured: isR2Configured() },
    readiness: {
      image: imageReady,
      imageWithReferencePhotos: imageWithRefsReady,
      video: videoReady,
      deepinfraPipeline: deepinfra && isR2Configured(),
      klingMotion: kie && videoReady,
    },
    warnings,
  };
}

module.exports = {
  getProviderEnvStatus,
  isR2Configured,
};
