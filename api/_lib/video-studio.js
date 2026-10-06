const {
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
} = require("./credit-costs");
const { computeImageToVideoCreditCost } = require("../../shared/video-i2v-pricing.cjs");
const {
  computeV2VStudioCreditCost,
  normalizeVideoUltraResolution,
} = require("../../shared/video-ultra-pricing.cjs");

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

/** V2V = prix fixe ; I2V = durée (3/5 s) + qualité (720p/1080p) + voix optionnelle. */
function computeVideoCreditCost(options) {
  if (options.isAdmin) return 0;

  if (options.workflow === "video_to_video") {
    return computeV2VStudioCreditCost({
      sourceVideoDurationSec: options.sourceVideoDurationSec,
      resolution: options.v2vResolution,
      preserveSourceAudio: options.preserveSourceAudio,
      voiceExtraCredit: VIDEO_VOICE_EXTRA_CREDIT,
      v2vProvider: options.v2vProvider ?? null,
      engineFamily: options.v2vEngineFamily ?? null,
    });
  }

  return computeImageToVideoCreditCost({
    durationSec: options.durationSec,
    quality: options.quality,
    voiceEnabled: options.voiceEnabled,
    billingGrid: "prod",
  });
}

const V2V_SILENT_OUTPUT_LOCK =
  " Output must be completely silent: no voice, no speech, no dialogue, no narration, no lip sync audio, no background talking. Mute video only.";

const VOICE_INSTRUCTION_PATTERNS = [
  /\b(mets?|mettre|ajoute|ajouter|garde|garder|conserve|conserver|int[èe]gre|int[èe]grer|with|add|keep|preserve|include)\s+(?:ma|mon|mes|ta|ton|tes|sa|son|ses|my|the|une?|la|le|les)?\s*(?:voix|voice|audio|son|sound|parole|paroles|speech|dialogue|narration)\b/gi,
  /\b(fais?|faire|g[ée]n[èe]re|g[ée]n[èe]rer|make|create|generate)\s+(?:une?|un|la|le|my|a)?\s*(?:voix|voice|audio|parole|speech)\b/gi,
  /\bvoix\s+(?:de|d['’]|of)\s+(?:femme|homme|meuf|mec|woman|man|girl|boy|celebrity|celebrit[ée])\b/gi,
  /\b(female|male|woman|man)\s+voice\b/gi,
  /\b(parle|parler|speak|speaks?|speaking|talking|talk|dis\s+(?:que|qu['’]|«|"))\b/gi,
  /\b(crie|crier|hurle|hurler|shouts?|screams?|exclaim|murmure|chuchote|whispers?)\b/gi,
  /\b(dit|dire|disent|say|says|said|tell|telling)\s+(?:que|qu['’]|«|"| loudly|aloud)\b/gi,
  /\bet\s+(?:qui\s+)?(?:dit|crie|parle|hurle|lance|fait\s+un\s+son)\b/gi,
  /\b(avec\s+(?:de\s+la\s+)?(?:voix|parole|dialogue|narration|son\s+de\s+voix))\b/gi,
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

const V2V_PROMPT_TRANSFORM_PATTERN =
  /\b(int[ée]rieur|interior|habitacle|cockpit|dashboard|d[ée]cor|background|dubai|yacht|marina|jet|luxe|remplace|remplacer|swap|change|transforme|transformer|mets|mettre|habille|habiller|style|look|tenue|outfit|objet|vehicle|voiture|v[ée]hicule|marque|oem|badge|logo)\b/i;

/** Danse, meme, nouveau corps sur les mêmes mouvements → Motion Control uniquement. */
const V2V_MOTION_BODY_PATTERN =
  /\b(danse|danser|danseur|danseuse|chor[eé]graph|tiktok|challenge|meme|m[eê]me mouvement|same move|body swap|swap body|corps|fais danser|fait danser|remplace.*personne|remplace.*moi|new person|another person|hip hop|breakdance|groove|vibe dance)\b/i;

function isV2VMotionBodyPrompt(text) {
  return V2V_MOTION_BODY_PATTERN.test(String(text || ""));
}

const VEHICLE_STRONG_CONTEXT_PATTERN =
  /\b(voiture|voitures|car|cars|auto|autos|v[ée]hicule|v[ée]hicules|vehicle|vehicles|moto|scooter|cl[ée]|clef|key\s*fob|keyfob|volant|steering|wheel|habitacle|cockpit|interieur|interior|dashboard|compteur|speedometer|tachometer|condui|driv|au volant|behind the wheel|acc[ée]l|rpm|km\/h|kmh|twingo|clio|renault|peugeot|citro[eë]n|urus|lambo|lamborghini|ferrari|porsche|bmw|mercedes|amg|audi|bentley|rolls|maserati|tesla|mustang|supercar|suv|berline|4x4)\b/i;

function isVehicleDrivingPrompt(text) {
  const s = String(text || "");
  if (!VEHICLE_CONTEXT_PATTERN.test(s)) return false;
  if (isV2VMotionBodyPrompt(s) && !VEHICLE_STRONG_CONTEXT_PATTERN.test(s)) {
    return false;
  }
  return true;
}

/** Job studio V2V onglet Mouvement (Kling Motion Control uniquement). */
function isV2VMotionStudioJob(meta) {
  if (!meta || typeof meta !== "object") return false;
  if (meta.v2v_intent === "motion") return true;
  if (meta.v2v_provider === "kling_motion") return true;
  if (meta.v2v_engine_family === "motion") return true;
  return false;
}

/**
 * Vidéo → Vidéo : le studio choisit le moteur (2 IA) selon le prompt — le client ne voit qu’un seul bouton.
 * - Motion : danse / meme / autre personnage, mêmes gestes.
 * - Transform : décor, luxe, habitacle, marque véhicule, scène…
 */
function resolveV2VProviderForStudio(userPrompt) {
  const prompt = String(userPrompt || "").trim();
  if (!prompt) return "kling_motion";
  const motion = isV2VMotionBodyPrompt(prompt);
  const transform =
    isVehicleDrivingPrompt(prompt) || V2V_PROMPT_TRANSFORM_PATTERN.test(prompt);
  if (motion && !transform) return "kling_motion";
  if (transform && !motion) return "runway_aleph";
  if (motion && transform) {
    if (/\b(danse|danser|chor[eé]|tiktok|meme|m[eê]me mouvement)\b/i.test(prompt)) {
      return "kling_motion";
    }
    return "runway_aleph";
  }
  return "kling_motion";
}

/**
 * Onglet choisi par le client (Mouvement / Scène & luxe) — prioritaire sur la détection du prompt,
 * sinon un prompt Scène traduit ou vague part sur le moteur Mouvement et échoue (« no valid characters »).
 */
function resolveV2VProviderFromIntent(intent, userPrompt) {
  if (intent === "motion") return "kling_motion";
  if (intent === "scene") return "runway_aleph";
  return resolveV2VProviderForStudio(userPrompt);
}

function v2vEngineFamilyForProvider(provider) {
  return provider === "kling_motion" ? "motion" : "transform";
}

/**
 * Scène & luxe (Transform) : Runway Aleph via Kie — moteur par défaut.
 * Désactiver uniquement si besoin : V2V_ALEPH_DISABLED=1
 */
function isAlephTransformEnabled() {
  return String(process.env.V2V_ALEPH_DISABLED || "").trim() !== "1";
}

/** Legacy opt-in — Kling 3.0 Omni transformation (désactivé par défaut). */
function isOmniTransformEnabled() {
  return String(process.env.V2V_OMNI_TRANSFORM_ENABLED || "").trim() === "1";
}

/** @deprecated rollout admin Omni — ignoré si Omni désactivé */
function isV2VOmniTransformRolloutEnabled(meta) {
  if (!isOmniTransformEnabled()) return false;
  if (meta && meta.v2v_omni_transform_rollout === true) return true;
  return String(process.env.V2V_OMNI_TRANSFORM_PUBLIC || "").trim() === "1";
}

function shouldUseOmniTransformForV2V(meta, v2vResolution, v2vProvider) {
  if (shouldUseSeedanceTransformForV2V(meta, v2vResolution, v2vProvider)) {
    return false;
  }
  if (!isOmniTransformEnabled()) return false;
  if (v2vProvider !== "runway_aleph") return false;
  if (!isAlephTransformEnabled()) {
    const res = normalizeVideoUltraResolution(v2vResolution || "720p");
    if (isV2VOmniTransformRolloutEnabled(meta)) return true;
    return res === "1080p" || res === "4k";
  }
  return false;
}

/** Seedance 2.0/2.5 remplace Omni (Scène & luxe transform). */
function isSeedanceTransformEnabled() {
  return String(process.env.V2V_SEEDANCE_TRANSFORM_ENABLED || "").trim() === "1";
}

function isAdminSeedanceRollout(meta) {
  return Boolean(meta && meta.v2v_seedance_transform_rollout === true);
}

function isV2VSeedanceTransformRolloutEnabled(meta) {
  if (isAdminSeedanceRollout(meta)) return true;
  if (!isSeedanceTransformEnabled()) return false;
  return String(process.env.V2V_SEEDANCE_TRANSFORM_PUBLIC || "").trim() === "1";
}

function shouldUseSeedanceTransformForV2V(meta, v2vResolution, v2vProvider) {
  if (v2vProvider !== "runway_aleph") return false;
  if (!isAdminSeedanceRollout(meta) && !isSeedanceTransformEnabled()) return false;
  const res = normalizeVideoUltraResolution(v2vResolution || "720p");
  if (isV2VSeedanceTransformRolloutEnabled(meta)) return true;
  if (!isAlephTransformEnabled()) return true;
  return res === "1080p" || res === "4k";
}

const SEEDANCE_PROMPT_MAX_CHARS = 8000;
const OMNI_PROMPT_MAX_CHARS = 2500;

function buildSeedanceTransformPrompt(userPrompt, { preserveSourceAudio = false } = {}) {
  let prompt = String(userPrompt || "").trim();
  if (!preserveSourceAudio) {
    prompt = stripVoiceInstructionsFromPrompt(prompt);
  }
  const base =
    prompt.length >= 5
      ? prompt
      : "Transform the scene with premium cinematic realism";
  const vehicle = extractRequestedVehicleModel(prompt);
  const target = vehicle?.model || "the exact vehicle model named in the request";
  const speed = extractMentionedSpeedKmh(prompt);
  const parts = [
    `Edit the reference video: ${base.replace(/[.\s]+$/, "")}.`,
    "Object-level / reference-to-video: replace subjects and cabin as described while preserving the original camera recording.",
  ];

  if (isVehicleDrivingPrompt(prompt)) {
    parts.push(
      `MUST CHANGE (full re-brand — not a UI reskin): replace EVERY visible interior and exterior vehicle surface with authentic OEM ${target} — steering wheel shape and center cap logo, instrument cluster hardware and graphics, center stack screen shape and UI layout, buttons, vents, console, trim, keys or remotes in frame.`,
      vehicle?.interior
        ? `Target cabin OEM reference: ${vehicle.interior}`
        : `Match real-world ${target} geometry, badges, dashboard and controls — no generic SUV interpretation.`,
      "Real model fidelity: reproduce exact center-screen aspect ratio, button positions, and constructor badge — not an approximate lookalike.",
      "Door mechanisms: if doors or hands interact, use the target vehicle's real mechanism (e.g. Lamborghini scissor/dihedral vs conventional SUV pull) — do NOT copy the source car's door motion if the target brand differs; adapt the hand gesture to the correct handle/latch motion.",
    );
    parts.push(buildKeySwapInstruction(vehicle));
    parts.push(buildV2VCockpitIntelligenceLock(prompt));
  } else {
    parts.push(
      "MUST CHANGE: all elements described in the user request with photoreal OEM/detail accuracy.",
    );
  }

  parts.push(
    "MUST KEEP EXACT: camera trajectory, framing, clip timing, hand positions and paths on the wheel/controls, body motion rhythm — motion lock is mandatory.",
    "Instrument coherence: speedometer/tachometer digits and needles must track visible acceleration/deceleration and road motion in the source clip — never frozen or contradicting movement.",
    "Gear/shift state: if the vehicle is clearly driving, show consistent Drive (D) / engaged gear — never Park (P) or Neutral while moving.",
    speed
      ? `When moving, speedometer must read approximately ${speed} km/h whenever the cluster is visible.`
      : "Preserve speedometer/tachometer dynamics consistent with source motion frame-by-frame.",
    "Lighting coherence: if the source is night driving with headlights or reflections, keep night exposure and target-model headlight shape, color temperature, and intensity realistic.",
    "Reflections: keep driver face in mirror and windshield reflections, adapted to the new cabin materials — do not erase reflections.",
    "Photorealistic smartphone footage, natural motion blur, no CGI paste look.",
  );

  return parts.join(" ").slice(0, SEEDANCE_PROMPT_MAX_CHARS);
}

function buildOmniTransformPrompt(userPrompt, { preserveSourceAudio = false } = {}) {
  let prompt = String(userPrompt || "").trim();
  if (!preserveSourceAudio) {
    prompt = stripVoiceInstructionsFromPrompt(prompt);
  }
  const base =
    prompt.length >= 5
      ? prompt
      : "Transform the scene with premium cinematic realism";
  const parts = [`Transform @Video1: ${base.replace(/[.\s]+$/, "")}.`];

  if (isVehicleDrivingPrompt(prompt)) {
    const vehicle = extractRequestedVehicleModel(prompt);
    const target = vehicle?.model || "the exact vehicle named above";
    parts.push(
      `MUST CHANGE (full cabin re-brand — not a cosmetic UI tweak): replace EVERY visible interior surface and OEM detail with authentic ${target} — steering wheel shape and center cap logo, instrument cluster hardware and graphics, center stack screens, dashboard, vents, console, trim, keys or remotes in frame.`,
    );
    if (vehicle?.interior) parts.push(`Target cabin reference: ${vehicle.interior}`);
    parts.push(
      `Remove all original-make badges and logos (e.g. BMW roundel) — only ${target} branding may appear.`,
      "MUST KEEP UNCHANGED (motion lock only): camera trajectory, clip duration, timing, hand motion on the wheel, road and sky through the windshield — do NOT treat motion lock as permission to leave the old cabin or old logos.",
    );
  } else {
    parts.push(
      "Keep the same camera motion, framing, people, gestures and timing as @Video1.",
    );
  }
  parts.push("Photorealistic smartphone footage, natural light, no CGI look.");
  return parts.join(" ").slice(0, OMNI_PROMPT_MAX_CHARS);
}

function promptHasTimelineBeats(text) {
  return /\b\d+\s*(?:s|sec|secondes?)\b/i.test(String(text || ""));
}

function promptRequestsObjectInsert(text) {
  const s = String(text || "");
  return (
    /\b(ajoute|ajouter|add|place|insère|insert|met[s]?\s+(?:moi|une?))\b/i.test(
      s,
    ) &&
    /\b(voiture|car|vehicle|lambo|lamborghini|urus|sac|bag|objet|object|personne|person)\b/i.test(
      s,
    )
  );
}

/** Prompt Aleph (jobs API, max ~2000 car.) — priorité au texte utilisateur + locks compacts. */
function buildAlephSubmitPrompt(
  userPrompt,
  { preserveSourceAudio = false, minimal = false } = {},
) {
  let prompt = String(userPrompt || "").trim();
  if (!preserveSourceAudio) {
    prompt = stripVoiceInstructionsFromPrompt(prompt);
  }
  const vehicle = extractRequestedVehicleModel(prompt);
  if (minimal) {
    const label = vehicle?.model || "the exact vehicle named by the user";
    return (
      `Photorealistic edit: replace the visible car interior with authentic ${label} OEM cabin, ` +
      "steering wheel and badges only. Keep identical camera path, hand motion and timing. " +
      "No wrong-brand logos."
    ).slice(0, 900);
  }

  const base =
    prompt.length >= 5
      ? prompt
      : "Transform the video as described while keeping camera motion identical.";

  const parts = [];
  if (promptHasTimelineBeats(prompt)) {
    parts.push(
      "Multi-beat edit on this clip: honor each timestamp in the user instructions — apply each change only when that moment appears in the source video; leave other segments unchanged until their beat.",
    );
  }
  parts.push(base);

  if (vehicle) {
    parts.push(
      `Vehicle/cabin target: authentic OEM ${vehicle.model} — full swap (body, interior, badges, keys) where visible. ${vehicle.interior}`,
    );
  }

  if (promptRequestsObjectInsert(prompt)) {
    parts.push(
      "Inserted objects and vehicles must match camera perspective, ground contact, scale, shadows and motion blur — photoreal, never floating or pasted.",
    );
  }

  parts.push(
    "Photorealistic smartphone footage. Keep the same camera path, gestures and real-time speed as the source (no slow motion unless explicitly requested).",
    "Change backgrounds, architecture, people, props and vehicles exactly as described — not cosmetic UI-only tweaks.",
  );

  const combined = parts.join(" ");
  return combined.length <= 1980 ? combined : combined.slice(0, 1980);
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
  const source = String(text || "")
    .replace(/\bmontesori\b/gi, "Mansory")
    .replace(/\bmansori\b/gi, "Mansory")
    .replace(/\bmontessori\b/gi, "Mansory");
  if (/\b(mansory)\b/i.test(source) && /\b(urus)\b/i.test(source)) {
    return {
      pattern: /\b(urus)\b/i,
      model: "Lamborghini Urus Mansory",
      interior:
        "authentic Lamborghini Urus cabin with Mansory tuning: Mansory carbon fiber dash and console trim, Mansory steering wheel accents, Urus dual digital screens with Lamborghini UI, alcantara/carbon luxury finish — never BMW roundel, never generic SUV.",
      key: "Lamborghini hexagonal key fob with bull logo — Urus OEM remote",
    };
  }
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
  if (/\b(mansory|mansori|montesori)\b/i.test(source)) {
    features.push(
      "Mansory widebody/carbon interior accents and Mansory branding where visible — on Urus base",
    );
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

/** Mouvement (Kling Motion Control) — identité image, scène + chorégraphie vidéo. */
function buildKlingMotionStudioPrompt(userPrompt, { preserveSourceAudio = false } = {}) {
  let prompt = String(userPrompt || "").trim();
  if (!preserveSourceAudio) {
    prompt = stripVoiceInstructionsFromPrompt(prompt);
  }
  const userPart =
    prompt.length >= 5
      ? prompt
      : "Replace the dancer with the person from the reference photo.";
  const lock =
    " Keep the original video background, camera, lighting and timing unchanged. " +
    "Copy dance moves and body motion exactly from the source video. " +
    "The reference photo supplies identity only — not the environment.";
  let result = `${userPart}.${lock}`;
  if (!preserveSourceAudio) {
    result += V2V_SILENT_OUTPUT_LOCK;
  }
  return result.slice(0, 2000);
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

const I2V_ACTION_MOTION_PATTERN =
  /\b(courir|cours|court|sprinter|sprint(?:er|e|ing)?|se battre|combat(?:er|te)?|bagarre|boxe(?:r|ur)?|football|frappe|kick(?:ing)?|run(?:ning|s)?|fight(?:ing|s)?|punch(?:ing|es)?|marathon|athl[eè]te|chase|poursuiv(?:re|e)?|saut(?:er|e)?|jump(?:ing|s)?|danse(?:r|use)? rapide|parkour)\b/i;

const I2V_ACTION_MOTION_LOCK =
  "Fast dynamic motion, real-time speed, no slow motion, no bullet-time, athletic full-speed movement.";

function isActionMotionPrompt(text) {
  return I2V_ACTION_MOTION_PATTERN.test(String(text || ""));
}

/**
 * Prompt Kie Avatar Pro (I2V) : réutilise buildRunwayPrompt (caméra / intensité / style UI).
 */
function buildI2VAvatarPrompt(params) {
  const motionPrompt = String(params.motionPrompt || "").trim();
  const action = isActionMotionPrompt(motionPrompt);
  const motionIntensity =
    action && params.motionIntensity !== "dynamic"
      ? "dynamic"
      : params.motionIntensity || "natural";

  let prompt = buildRunwayPrompt({
    motionPrompt,
    cameraMovement: params.cameraMovement || "fixed",
    motionIntensity,
    style: params.style || "realistic",
    voiceEnabled: Boolean(params.voiceEnabled),
    voiceText: params.voiceText,
  });

  if (action) {
    prompt = `${prompt} ${I2V_ACTION_MOTION_LOCK}`;
  }

  return prompt.trim();
}

function buildRunwayPrompt(params) {
  let motion = String(params.motionPrompt || "").trim();
  if (!params.voiceEnabled) {
    motion = stripVoiceInstructionsFromPrompt(motion);
  }

  const parts = [
    motion,
    CAMERA_PROMPTS[params.cameraMovement] || CAMERA_PROMPTS.fixed,
    INTENSITY_PROMPTS[params.motionIntensity] || INTENSITY_PROMPTS.natural,
    STYLE_PROMPTS[params.style] || STYLE_PROMPTS.realistic,
    "Mouvement réaliste, pas de diaporama, pas de simple zoom sur photo statique.",
    "Garder l'identité du sujet, traits stables, texture de peau naturelle.",
    "Une seule prise continue, pas de montage saccadé.",
  ];

  if (params.voiceEnabled && params.voiceText) {
    const spoken = String(params.voiceText || "")
      .trim()
      .replace(/["«»]/g, "'")
      .slice(0, 280);
    parts.push(
      "Visage visible : synchronisation labiale précise, mot pour mot, timing naturel comme une vraie vidéo tournée (pas une photo animée).",
      `Le personnage dit exactement à voix haute : '${spoken}'. Mouvements de bouche et expressions alignés sur chaque syllabe.`,
    );
  } else {
    parts.push(V2V_SILENT_OUTPUT_LOCK.trim());
  }

  parts.push("Contenu créé par IA — rendu vidéo réaliste.");
  return parts.filter(Boolean).join(" ");
}

function maxVoiceCharsForDuration(durationSec) {
  const d = Number(durationSec) || 5;
  if (d >= 10) return 280;
  if (d >= 8) return 200;
  if (d <= 3) return 100;
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
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
  V2V_SILENT_OUTPUT_LOCK,
  computeVideoCreditCost,
  buildRunwayPrompt,
  buildI2VAvatarPrompt,
  isActionMotionPrompt,
  buildCarSwapPrompt,
  buildV2VTransformPrompt,
  buildV2VProviderPrompt,
  buildKlingMotionStudioPrompt,
  stripVoiceInstructionsFromPrompt,
  isVehicleDrivingPrompt,
  isV2VMotionStudioJob,
  isV2VMotionBodyPrompt,
  v2vEngineFamilyForProvider,
  resolveV2VProviderForStudio,
  resolveV2VProviderFromIntent,
  isAlephTransformEnabled,
  isOmniTransformEnabled,
  isV2VOmniTransformRolloutEnabled,
  shouldUseOmniTransformForV2V,
  isSeedanceTransformEnabled,
  isV2VSeedanceTransformRolloutEnabled,
  shouldUseSeedanceTransformForV2V,
  buildSeedanceTransformPrompt,
  buildOmniTransformPrompt,
  promptHasTimelineBeats,
  buildAlephSubmitPrompt,
  extractRequestedVehicleModel,
  buildKeySwapInstruction,
  buildV2VCockpitIntelligenceLock,
  buildV2VDashboardLockSuffix,
  maxVoiceCharsForDuration,
  validateVoiceText,
  mapStudioStage,
  studioStageLabel,
};
