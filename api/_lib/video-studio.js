const VIDEO_BASE_CREDIT_5S = 20;
const VIDEO_BASE_CREDIT_10S = 35;
const VIDEO_VOICE_EXTRA_CREDIT = 5;
const VIDEO_V2V_BASE_CREDIT = 25;
const VIDEO_HIGH_QUALITY_MULTIPLIER = 1.5;

const CAMERA_PROMPTS = {
  fixed: "Caméra stable, plan fixe.",
  slow_zoom: "Zoom lent et cinématique vers le sujet.",
  dolly_in: "Travelling avant fluide, mouvement cinématique.",
  truck: "Travelling latéral lent.",
  light_pan: "Légère rotation de caméra, panoramique subtil.",
};

const INTENSITY_PROMPTS = {
  low: "Mouvement très subtil, naturel et calme.",
  natural: "Mouvement naturel et réaliste.",
  dynamic: "Mouvement dynamique mais crédible, sans effet cartoon.",
};

const STYLE_PROMPTS = {
  realistic: "Style photoréaliste, lumière naturelle.",
  cinematic: "Rendu cinématographique premium, profondeur de champ.",
  ugc: "Style smartphone vertical authentique, léger grain, UGC TikTok.",
  luxury_ad: "Publicité luxe, éclairage premium, rendu haut de gamme.",
};

function computeVideoCreditCost(options) {
  if (options.workflow === "video_to_video") {
    return options.isAdmin ? 0 : VIDEO_V2V_BASE_CREDIT;
  }
  const duration = options.durationSec === 10 ? 10 : 5;
  let cost =
    duration === 10 ? VIDEO_BASE_CREDIT_10S : VIDEO_BASE_CREDIT_5S;
  if (options.quality === "high") {
    cost = Math.round(cost * VIDEO_HIGH_QUALITY_MULTIPLIER);
  }
  if (options.voiceEnabled) {
    cost += VIDEO_VOICE_EXTRA_CREDIT;
  }
  return options.isAdmin ? 0 : cost;
}

function buildCarSwapPrompt(vehicleDescription) {
  const vehicle = String(vehicleDescription || "").trim();
  return [
    `Replace the vehicle in the video with ${vehicle}.`,
    "Keep the background, ground, reflections, camera movement, lighting and all non-vehicle elements exactly unchanged.",
    "Only swap the car body — same position, scale, angle and motion as the original vehicle.",
    "Photorealistic render, consistent shadows and reflections on pavement.",
  ].join(" ");
}

function buildRunwayPrompt(params) {
  const parts = [
    String(params.motionPrompt || "").trim(),
    CAMERA_PROMPTS[params.cameraMovement] || CAMERA_PROMPTS.fixed,
    INTENSITY_PROMPTS[params.motionIntensity] || INTENSITY_PROMPTS.natural,
    STYLE_PROMPTS[params.style] || STYLE_PROMPTS.realistic,
    "Mouvement réaliste, pas de diaporama, pas de simple zoom sur photo statique.",
    "Garder l'identité du sujet, traits stables, texture de peau naturelle.",
    "Une seule prise continue, pas de montage saccadé.",
  ];

  if (params.voiceEnabled && params.voiceText) {
    parts.push(
      "Visage visible : synchronisation labiale naturelle et subtile avec la parole implicite, bouche réaliste sans exagération.",
    );
  }

  parts.push("Contenu créé par IA — rendu vidéo réaliste.");
  return parts.filter(Boolean).join(" ");
}

function maxVoiceCharsForDuration(durationSec) {
  return durationSec === 10 ? 280 : 140;
}

function validateVoiceText(text, durationSec) {
  const max = maxVoiceCharsForDuration(durationSec);
  const len = String(text || "").trim().length;
  if (len === 0) return { ok: false, reason: "Texte vocal requis." };
  if (len > max) {
    return {
      ok: false,
      reason: `Texte trop long pour ${durationSec}s (max ${max} caractères).`,
    };
  }
  return { ok: true, max };
}

function mapStudioStage(metadata, providerState) {
  const meta = metadata && typeof metadata === "object" ? metadata : {};
  if (meta.studio_stage === "COMPLETED" || meta.studio_stage === "FAILED") {
    return meta.studio_stage;
  }
  if (meta.voice_pending) return "GENERATING_VOICE";
  if (meta.subtitles_pending) return "ADDING_SUBTITLES";
  if (providerState === "success" || providerState === "completed") {
    return meta.voice_enabled ? "GENERATING_VOICE" : "PROCESSING";
  }
  if (
    providerState === "waiting" ||
    providerState === "queueing" ||
    providerState === "generating" ||
    providerState === "processing" ||
    providerState === "pending"
  ) {
    return "GENERATING_VIDEO";
  }
  return meta.studio_stage || "GENERATING_VIDEO";
}

function studioStageLabel(stage) {
  const labels = {
    DRAFT: "Brouillon",
    VALIDATING: "Préparation de ta vidéo…",
    QUEUED: "En file d'attente…",
    GENERATING_VIDEO: "Création du mouvement…",
    GENERATING_VOICE: "Synchronisation de la voix…",
    LIP_SYNCING: "Synchronisation labiale…",
    ADDING_SUBTITLES: "Ajout des sous-titres…",
    PROCESSING: "Finalisation du rendu…",
    COMPLETED: "Terminé",
    FAILED: "Échec",
    UNKNOWN: "Vérification en cours…",
  };
  return labels[stage] || labels.GENERATING_VIDEO;
}

module.exports = {
  VIDEO_BASE_CREDIT_5S,
  VIDEO_BASE_CREDIT_10S,
  VIDEO_V2V_BASE_CREDIT,
  computeVideoCreditCost,
  buildRunwayPrompt,
  buildCarSwapPrompt,
  maxVoiceCharsForDuration,
  validateVoiceText,
  mapStudioStage,
  studioStageLabel,
};
