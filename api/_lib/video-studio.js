const {
  VIDEO_FLAT_CREDIT_COST,
  computeV2VCreditCost,
} = require("./video-limits");
const VIDEO_VOICE_EXTRA_CREDIT = 5;

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

/** 1 vidéo Kling (max 8s, 720p) = prix fixe ; voix IA (I2V) ou voix filmée (V2V) en supplément. */
function computeVideoCreditCost(options) {
  if (options.isAdmin) return 0;

  let cost =
    options.workflow === "video_to_video"
      ? computeV2VCreditCost(options.sourceVideoDurationSec, false)
      : VIDEO_FLAT_CREDIT_COST;

  if (options.workflow === "video_to_video") {
    if (options.preserveSourceAudio) {
      cost += VIDEO_VOICE_EXTRA_CREDIT;
    }
  } else if (options.voiceEnabled) {
    cost += VIDEO_VOICE_EXTRA_CREDIT;
  }

  return cost;
}

const V2V_SILENT_OUTPUT_LOCK =
  " Output must be completely silent: no voice, no speech, no dialogue, no narration, no lip sync audio, no background talking. Mute video only.";

const VOICE_INSTRUCTION_PATTERNS = [
  /\b(mets?|mettre|ajoute|ajouter|garde|garder|conserve|conserver|int[èe]gre|int[èe]grer|with|add|keep|preserve|include)\s+(?:ma|mon|mes|ta|ton|tes|sa|son|ses|my|the|une?|la|le|les)?\s*(?:voix|voice|audio|son|sound|parole|paroles|speech|dialogue|narration)\b/gi,
  /\b(fais?|faire|g[ée]n[èe]re|g[ée]n[èe]rer|make|create|generate)\s+(?:une?|un|la|le|my|a)?\s*(?:voix|voice|audio|parole|speech)\b/gi,
  /\bvoix\s+(?:de|d['’]|of)\s+(?:femme|homme|meuf|mec|woman|man|girl|boy|celebrity|celebrit[ée])\b/gi,
  /\b(female|male|woman|man)\s+voice\b/gi,
  /\b(parle|parler|speak|talking|talk|dis\s+(?:que|qu['’]))\b/gi,
  /\b(lip[\s-]?sync|synchronis(?:e|ation)\s+(?:labiale|des\s+l[eè]vres))\b/gi,
  /\b(musique|music|bande\s+son|soundtrack|bgm)\b/gi,
];

function stripVoiceInstructionsFromPrompt(text) {
  let cleaned = String(text || "").trim();
  if (!cleaned) return cleaned;

  for (const pattern of VOICE_INSTRUCTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  cleaned = cleaned
    .replace(/\s*[,;.\-–—]\s*[,;.\-–—]+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/(?:^|\s)[,.;:\-–—]+/g, " ")
    .trim();

  return cleaned.replace(/[,.;:\-–—\s]+$/g, "").trim();
}

function buildV2VSceneLockSuffix() {
  return " Garde le décor, le sol, les reflets et les mouvements de caméra identiques.";
}

function buildV2VProviderPrompt(userPrompt, { preserveSourceAudio = false } = {}) {
  let prompt = String(userPrompt || "").trim();

  if (!preserveSourceAudio) {
    prompt = stripVoiceInstructionsFromPrompt(prompt);
  }

  if (prompt.length >= 10) {
    const hasSceneLock =
      /d[ée]cor|cam[ée]ra|reflet|background|ground|reflection|unchanged|identique/i.test(
        prompt,
      );
    const locked = hasSceneLock ? prompt : `${prompt}${buildV2VSceneLockSuffix()}`;
    return preserveSourceAudio ? locked : `${locked}${V2V_SILENT_OUTPUT_LOCK}`;
  }

  const fallback = buildV2VTransformPrompt(
    prompt || "Transform the scene while keeping camera motion identical.",
  );
  return preserveSourceAudio ? fallback : `${fallback}${V2V_SILENT_OUTPUT_LOCK}`;
}

function buildV2VTransformPrompt(description) {
  const subject = String(description || "").trim();
  return [
    subject ||
      "Transform the subject, object or environment in the video as described.",
    "Keep the background, ground, reflections, camera movement, lighting and framing exactly unchanged.",
    "Photorealistic render, consistent shadows and natural motion.",
  ].join(" ");
}

/** @deprecated use buildV2VTransformPrompt */
function buildCarSwapPrompt(vehicleDescription) {
  return buildV2VTransformPrompt(
    `Replace the vehicle in the video with ${String(vehicleDescription || "").trim()}. Only swap the car body — same position, scale, angle and motion as the original.`,
  );
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
  const d = Number(durationSec) || 5;
  if (d >= 10) return 280;
  if (d >= 8) return 200;
  return 140;
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
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
  V2V_SILENT_OUTPUT_LOCK,
  computeVideoCreditCost,
  buildRunwayPrompt,
  buildCarSwapPrompt,
  buildV2VTransformPrompt,
  buildV2VProviderPrompt,
  stripVoiceInstructionsFromPrompt,
  maxVoiceCharsForDuration,
  validateVoiceText,
  mapStudioStage,
  studioStageLabel,
};
