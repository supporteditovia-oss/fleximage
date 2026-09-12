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

const VEHICLE_CONTEXT_PATTERN =
  /\b(voiture|voitures|car|cars|auto|autos|v[ée]hicule|v[ée]hicules|vehicle|vehicles|moto|scooter|cl[ée]|clef|key\s*fob|keyfob|telecommande|remote|badge|volant|steering|wheel|habitacle|cockpit|interieur|interior|dashboard|compteur|speedometer|tachometer|condui|driv|au volant|behind the wheel|acc[ée]l|rpm|km\/h|kmh|remplace|remplacer|swap|change|transforme|twingo|clio|renault|peugeot|citro[eë]n|urus|lambo|lamborghini|ferrari|porsche|bmw|mercedes|amg|audi|bentley|rolls|maserati|tesla|mustang|supercar|suv|berline|4x4)\b/i;

function isVehicleDrivingPrompt(text) {
  return VEHICLE_CONTEXT_PATTERN.test(String(text || ""));
}

function extractMentionedSpeedKmh(text) {
  const match = String(text || "").match(/\b(\d{2,3})\s*(?:km\/h|kmh|km\/h)\b/i);
  if (match) return match[1];
  const loose = String(text || "").match(/\b(?:à|a|at)\s+(\d{2,3})\b/i);
  return loose ? loose[1] : null;
}

const VEHICLE_MODEL_CATALOG = [
  {
    pattern: /\b(urus)\b/i,
    model: "Lamborghini Urus",
    interior:
      "authentic Lamborghini Urus OEM cabin: Urus steering wheel with Lamborghini badge, dual digital screens with Urus UI, Urus center console and air vents — not a generic SUV.",
    key: "Lamborghini hexagonal key fob with bull logo and Urus-appropriate remote design",
  },
  {
    pattern: /\b(purosangue|puro[\s-]?sangue)\b/i,
    model: "Ferrari Purosangue",
    interior:
      "authentic Ferrari Purosangue OEM cabin: Ferrari dashboard design, Purosangue-specific steering wheel, dual screens with Ferrari UI — not a generic SUV.",
    key: "Ferrari red rectangular key with prancing horse emblem — Purosangue OEM remote",
  },
  {
    pattern: /\b(cullinan)\b/i,
    model: "Rolls-Royce Cullinan",
    interior:
      "authentic Rolls-Royce Cullinan OEM cabin: Spirit of Ecstasy details, Rolls-Royce infotainment, luxury rear/front layout.",
    key: "Rolls-Royce heavy rectangular key fob with Spirit of Ecstasy badge",
  },
  {
    pattern: /\b(g[\s-]?wagon|g[\s-]?class|g63)\b/i,
    model: "Mercedes-AMG G-Class",
    interior:
      "authentic Mercedes G-Class OEM cabin: G-Class dashboard, physical buttons, Mercedes MBUX screens.",
    key: "Mercedes-Benz key fob with three-pointed star — G-Class OEM remote",
  },
  {
    pattern: /\b(cayenne|turbo\s*gt)\b/i,
    model: "Porsche Cayenne",
    interior:
      "authentic Porsche Cayenne OEM cabin: Porsche PCM screens, Porsche steering wheel, center tachometer layout if visible.",
    key: "Porsche crest key fob — Cayenne OEM remote shape and finish",
  },
  {
    pattern: /\b(911|gt3|turbo\s*s)\b/i,
    model: "Porsche 911",
    interior:
      "authentic Porsche 911 OEM cabin: classic Porsche dashboard, sport steering wheel, Porsche PCM.",
    key: "Porsche crest key fob — 911 OEM remote shape and finish",
  },
  {
    pattern: /\b(bmw|m[23458]\b|x[567m]\b|i[478]\b)/i,
    model: "BMW",
    interior:
      "authentic BMW OEM cabin matching the requested BMW model — iDrive screens, BMW steering wheel with roundel.",
    key: "BMW blade-style key fob with BMW roundel — exact OEM for the requested model",
  },
  {
    pattern: /\b(audi|rs[3567]|r8|q[3788]|e[\s-]?tron)\b/i,
    model: "Audi",
    interior:
      "authentic Audi OEM cabin matching the requested Audi model — Virtual Cockpit, Audi MMI.",
    key: "Audi flip key or smart fob with four-ring logo — exact OEM for the requested model",
  },
  {
    pattern: /\b(mercedes|amg|classe\s*[cs]|eqs|eqe|maybach)\b/i,
    model: "Mercedes-Benz",
    interior:
      "authentic Mercedes-Benz OEM cabin — MBUX screens, Mercedes steering wheel with star badge.",
    key: "Mercedes-Benz key fob with three-pointed star — exact OEM for the requested model",
  },
  {
    pattern: /\b(bentley|continental|bentayga|flying\s*spur)\b/i,
    model: "Bentley",
    interior: "authentic Bentley OEM cabin — Bentley rotating display, winged B details.",
    key: "Bentley winged-B key fob — exact OEM remote for the requested model",
  },
  {
    pattern: /\b(ferrari|sf90|296|812|f8|roma)\b/i,
    model: "Ferrari",
    interior:
      "authentic Ferrari OEM cabin matching the requested Ferrari model — Ferrari steering wheel, dual screens, Ferrari UI.",
    key: "Ferrari red rectangular key with prancing horse — exact OEM for the requested Ferrari model",
  },
  {
    pattern: /\b(lamborghini|lambo|aventador|hurac[aá]n|revuelto)\b/i,
    model: "Lamborghini",
    interior:
      "authentic Lamborghini OEM cabin matching the requested model — Lamborghini hexagonal details, digital cluster.",
    key: "Lamborghini hexagonal key fob with bull logo — exact OEM for the requested Lamborghini model",
  },
  {
    pattern: /\b(tesla|model\s*[3sxy])\b/i,
    model: "Tesla",
    interior: "authentic Tesla OEM cabin — central touchscreen, minimalist Tesla UI.",
    key: "Tesla card key or minimalist Tesla key fob — exact OEM for the requested model",
  },
  {
    pattern: /\b(maserati|levante|mc20|ghibli)\b/i,
    model: "Maserati",
    interior: "authentic Maserati OEM cabin — Maserati trident steering wheel and infotainment.",
    key: "Maserati trident key fob — exact OEM for the requested model",
  },
];

function extractRequestedVehicleModel(text) {
  const source = String(text || "");
  for (const entry of VEHICLE_MODEL_CATALOG) {
    if (entry.pattern.test(source)) return entry;
  }
  return null;
}

function buildKeySwapInstruction(vehicle) {
  const targetModel =
    vehicle?.model || "the exact target vehicle model named in the prompt";
  const keyDesc =
    vehicle?.key ||
    `authentic OEM key fob, remote and brand badges exactly matching real ${targetModel} factory design — never a generic or wrong-brand key`;

  return [
    " KEY & ACCESSORY SWAP (mandatory for every vehicle model — not Urus-only):",
    ` Any source car keys, key fobs, remotes or badges visible on camera must be replaced with ${keyDesc}.`,
    ` The replacement key must belong to ${targetModel} only — same hand motion and timing as the source clip, zero trace of the original brand.`,
  ].join("");
}

function extractCustomInteriorFeatures(text) {
  const source = String(text || "");
  const features = [];

  if (/\b([ée]toil[ée]|starlight|plafond\s+[ée]toil|star\s+headliner|fiber\s*optic\s*stars?)\b/i.test(source)) {
    features.push(
      "luxury starlight headliner (fiber-optic stars on ceiling) integrated naturally and photorealistically",
    );
  }
  if (/\b(cuir\s+(?:blanc|beige|rouge|noir)|white\s+leather|red\s+interior|alcantara)\b/i.test(source)) {
    features.push("requested upholstery color and material applied consistently");
  }
  if (/\b(carbon|carbone|carbon\s+fiber)\b/i.test(source)) {
    features.push("carbon fiber trim where appropriate for the model");
  }

  return features;
}

function buildV2VCockpitIntelligenceLock(userPrompt) {
  const source = String(userPrompt || "");
  const vehicle = extractRequestedVehicleModel(source);
  const speed = extractMentionedSpeedKmh(source);
  const customFeatures = extractCustomInteriorFeatures(source);

  const targetModel = vehicle?.model || "the exact target vehicle model named in the prompt";

  const parts = [
    " CRITICAL vehicle realism lock (applies to ALL car brands and models — every swap must behave like real automotive footage):",
  ];

  parts.push(
    ` Complete vehicle swap: replace EVERY visible trace of the source car (body, interior, steering wheel badge, keys, remotes, badges) with the authentic OEM ${targetModel} — exterior AND interior. Never leave source-brand keys or parts visible.`,
  );

  if (vehicle) {
    parts.push(
      ` ${vehicle.interior} Never substitute another brand or a generic car.`,
    );
  } else {
    parts.push(
      " Match authentic OEM interior layout, steering wheel badge, screen UI, keys and materials for the specific brand and model requested — valid for any car from city hatchback swap to supercar.",
    );
  }

  parts.push(buildKeySwapInstruction(vehicle));

  parts.push(
    " INTELLIGENT STATE (all vehicles) — mirror source video logic frame-by-frame:",
  );
  parts.push(
    " • Parked with doors closed: screens off or dim, gear in Park (P), engine realistically idle/off, cabin static.",
  );
  parts.push(
    " • Door opening in source: screen wake-up must happen WHEN the door opens — not before; natural startup animation.",
  );
  parts.push(
    " • Driving in source: doors closed, appropriate gear (D/R), screens on, seatbelt if visible, speedometer matches source speed.",
  );
  parts.push(
    " • Never incoherent: no bright driving UI while parked, no open doors while driving fast, no Drive gear in a parked scene, no wrong model interior.",
  );

  if (speed) {
    parts.push(
      ` When moving, speedometer must read exactly ${speed} km/h at every frame.`,
    );
  } else {
    parts.push(
      " When moving, preserve exact speedometer/tachometer digits and needle positions from the source video.",
    );
  }

  if (customFeatures.length > 0) {
    parts.push(
      ` Integrate custom options photorealistically: ${customFeatures.join("; ")}.`,
    );
  }

  parts.push(
    " Premium photorealistic materials, correct glass reflections, luxury finish — must look indistinguishable from real footage.",
  );

  return parts.join("");
}

/** @deprecated alias */
function buildV2VDashboardLockSuffix(userPrompt) {
  return buildV2VCockpitIntelligenceLock(userPrompt);
}

function appendV2VRealismLocks(prompt, { preserveSourceAudio = false, userPrompt = "" } = {}) {
  let result = String(prompt || "").trim();
  const source = userPrompt || result;

  if (
    isVehicleDrivingPrompt(source) &&
    !/KEY & ACCESSORY SWAP|INTELLIGENT STATE|vehicle realism lock|CRITICAL vehicle/i.test(
      result,
    )
  ) {
    result += buildV2VCockpitIntelligenceLock(source);
  }

  return preserveSourceAudio ? result : `${result}${V2V_SILENT_OUTPUT_LOCK}`;
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
    return appendV2VRealismLocks(locked, { preserveSourceAudio, userPrompt: prompt });
  }

  const fallback = buildV2VTransformPrompt(
    prompt || "Transform the scene while keeping camera motion identical.",
  );
  return appendV2VRealismLocks(fallback, { preserveSourceAudio, userPrompt: prompt });
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
  isVehicleDrivingPrompt,
  extractRequestedVehicleModel,
  buildKeySwapInstruction,
  buildV2VCockpitIntelligenceLock,
  buildV2VDashboardLockSuffix,
  maxVoiceCharsForDuration,
  validateVoiceText,
  mapStudioStage,
  studioStageLabel,
};
