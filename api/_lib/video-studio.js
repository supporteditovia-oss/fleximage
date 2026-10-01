const {
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_I2V_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
  VIDEO_VOICE_EXTRA_CREDIT,
} = require("./credit-costs");
const { computeImageToVideoCreditCost } = require("../../shared/video-i2v-pricing.cjs");
const { computeV2VStudioCreditCost } = require("../../shared/video-ultra-pricing.cjs");

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

function isVehicleDrivingPrompt(text) {
  return VEHICLE_CONTEXT_PATTERN.test(String(text || ""));
}

const V2V_PROMPT_TRANSFORM_PATTERN =
  /\b(int[ée]rieur|interior|habitacle|cockpit|dashboard|d[ée]cor|background|dubai|yacht|marina|jet|luxe|remplace|remplacer|swap|change|transforme|transformer|mets|mettre|habille|habiller|style|look|tenue|outfit|objet|vehicle|voiture|v[ée]hicule|marque|oem|badge|logo)\b/i;

/** Danse, meme, nouveau corps sur les mêmes mouvements → Motion Control uniquement. */
const V2V_MOTION_BODY_PATTERN =
  /\b(danse|danser|danseur|danseuse|chor[eé]graph|tiktok|challenge|meme|m[eê]me mouvement|same move|body swap|swap body|corps|fais danser|fait danser|remplace.*personne|remplace.*moi|new person|another person|hip hop|breakdance|groove|vibe dance)\b/i;

function isV2VMotionBodyPrompt(text) {
  return V2V_MOTION_BODY_PATTERN.test(String(text || ""));
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

function v2vEngineFamilyForProvider(provider) {
  return provider === "kling_motion" ? "motion" : "transform";
}

/** Prompt court pour Aleph (jobs API) — évite les locks énormes qui provoquent des 500. */
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
  const exteriorHint =
    vehicle?.exterior && !isVehicleInteriorPrompt(prompt)
      ? ` Exterior: ${vehicle.exterior}`
      : "";
  const vehicleHint = vehicle
    ? isVehicleInteriorPrompt(prompt)
      ? ` Apply ${vehicle.model} OEM interior, steering wheel, keys and badges. ${vehicle.interior}`
      : ` Replace visible car with ${vehicle.model}. ${exteriorHint || vehicle.interior}`
    : "";
  const base =
    prompt.length >= 5
      ? prompt
      : "Transform the video as described while keeping camera motion identical.";
  const combined = `${base}.${vehicleHint} Photorealistic, same framing and motion. Never substitute a generic car.`;
  return combined.length <= 1900 ? combined : combined.slice(0, 1900);
}

function extractMentionedSpeedKmh(text) {
  const match = String(text || "").match(/\b(\d{2,3})\s*(?:km\/h|kmh|km\/h)\b/i);
  if (match) return match[1];
  const loose = String(text || "").match(/\b(?:à|a|at)\s+(\d{2,3})\b/i);
  return loose ? loose[1] : null;
}

function normalizeVehicleSearchText(text) {
  return String(text || "")
    .replace(/\bmontesori\b/gi, "Mansory")
    .replace(/\bmansori\b/gi, "Mansory")
    .replace(/\bmontessori\b/gi, "Mansory")
    .replace(/\broll\s*royce\b/gi, "Rolls-Royce")
    .replace(/\brolls\s+royce\b/gi, "Rolls-Royce")
    .replace(/\brose\s+noir(e)?\b/gi, "Rose Noire")
    .replace(/\bla\s+rose\s+noire\b/gi, "La Rose Noire")
    .replace(/\bdrop\s*tail\b/gi, "Droptail")
    .replace(/\bblack\s+badge\b/gi, "Black Badge")
    .replace(/\bmercedes\s+benz\b/gi, "Mercedes-Benz")
    .replace(/\bgt\s*3\b/gi, "GT3")
    .replace(/\bgt\s*4\b/gi, "GT4");
}

function isVehicleInteriorPrompt(text) {
  return /\b(int[ée]rieur|interior|habitacle|cockpit|volant|steering|dashboard|tableau\s+de\s+bord|compteur|speedometer|tachometer|cl[ée]|clef|key\s*fob|keyfob|t[ée]l[ée]commande|remote|badge|si[eè]ge|plafond|headliner|console\s*centrale)\b/i.test(
    String(text || ""),
  );
}

/** @typedef {{ pattern: RegExp, model: string, interior: string, key: string, exterior?: string }} VehicleCatalogEntry */

/** @type {VehicleCatalogEntry[]} — ordre = du plus spécifique au plus générique */
const VEHICLE_MODEL_CATALOG = [
  {
    pattern:
      /\b(la\s+rose\s+noire|rose\s+noire)\b[\s\S]{0,40}\b(droptail)\b|\b(droptail)\b[\s\S]{0,40}\b(la\s+rose\s+noire|rose\s+noire)\b/i,
    model: "Rolls-Royce Coachbuild Droptail La Rose Noire",
    exterior:
      "Authentic Rolls-Royce Coachbuild Droptail La Rose Noire: bespoke ultra-limited TWO-SEAT roadster with dramatic tapered boat-tail rear (NOT a four-door sedan, NOT Phantom/Ghost). Pantheon grille, coachbuilt droptail silhouette, La Rose Noire dark cherry and magnolia bespoke livery when visible.",
    interior:
      "authentic Rolls-Royce Droptail La Rose Noire OEM cabin: two-seat coachbuild layout, Rolls-Royce starlight optional, Spirit of Ecstasy rotary controls, bespoke Rose Noire materials — never a generic luxury sedan interior.",
    key: "Rolls-Royce heavy rectangular key fob with Spirit of Ecstasy badge — Droptail OEM",
  },
  {
    pattern: /\b(droptail)\b/i,
    model: "Rolls-Royce Coachbuild Droptail",
    exterior:
      "Authentic Rolls-Royce Coachbuild Droptail: ultra-exclusive two-seat roadster, tapered boat-tail rear, open-top droptail body — never substitute a four-door Rolls-Royce sedan or generic black car.",
    interior:
      "authentic Rolls-Royce Droptail coachbuild cabin — two seats, Rolls-Royce infotainment, bespoke coachbuild trim.",
    key: "Rolls-Royce Spirit of Ecstasy key fob — Droptail OEM",
  },
  {
    pattern: /\b(black\s+badge)\b[\s\S]{0,30}\b(ghost|phantom|wraith|dawn|cullinan|spectre)\b/i,
    model: "Rolls-Royce Black Badge (named model)",
    exterior:
      "Rolls-Royce Black Badge edition of the exact sub-model named by the user — dark chrome, Black Badge wheels and trim, correct body style (sedan/coupe/SUV) for that model.",
    interior:
      "Rolls-Royce Black Badge OEM cabin with darkened chrome and Black Badge instrumentation.",
    key: "Rolls-Royce Black Badge key fob with Spirit of Ecstasy",
  },
  {
    pattern: /\b(phantom)\b/i,
    model: "Rolls-Royce Phantom",
    exterior:
      "Rolls-Royce Phantom VIII extended luxury sedan: tall Pantheon grille, rectangular headlamps, upright stately proportions — not a Droptail roadster.",
    interior:
      "authentic Rolls-Royce Phantom OEM rear/front cabin, gallery fascia, Spirit of Ecstasy details.",
    key: "Rolls-Royce rectangular key with Spirit of Ecstasy",
  },
  {
    pattern: /\b(ghost)\b/i,
    model: "Rolls-Royce Ghost",
    exterior:
      "Rolls-Royce Ghost luxury sedan: subtle illuminated grille, clean modern Rolls proportions — not SUV, not Droptail.",
    interior: "authentic Rolls-Royce Ghost OEM cabin, Planar dashboard, Ghost infotainment.",
    key: "Rolls-Royce Ghost key fob — OEM",
  },
  {
    pattern: /\b(spectre)\b/i,
    model: "Rolls-Royce Spectre",
    exterior:
      "Rolls-Royce Spectre electric luxury coupe: fastback coupe silhouette, split headlamps, EV Rolls-Royce body — not a sedan Droptail.",
    interior: "Rolls-Royce Spectre EV OEM interior, Starlight doors, Spectre UI.",
    key: "Rolls-Royce Spectre key — OEM",
  },
  {
    pattern: /\b(wraith|dawn)\b/i,
    model: "Rolls-Royce Wraith or Dawn",
    exterior:
      "Rolls-Royce Wraith coupe or Dawn convertible as named — correct two-door Rolls body, suicide coach doors, never a random four-door sedan.",
    interior: "authentic Rolls-Royce Wraith/Dawn OEM cabin.",
    key: "Rolls-Royce key fob with Spirit of Ecstasy",
  },
  {
    pattern: /\b(urus)\b/i,
    model: "Lamborghini Urus",
    exterior:
      "Lamborghini Urus performance luxury SUV: angular Lambo body, hexagonal wheel arches, Urus front fascia — not a sedan, not BMW, not generic SUV.",
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
  {
    pattern: /\b(bugatti|chiron|mistral|veyron)\b/i,
    model: "Bugatti (named model)",
    exterior:
      "Authentic Bugatti hypercar body (Chiron/Mistral/Veyron as named): horseshoe grille, C-line, correct Bugatti silhouette — never a generic coupe.",
    interior: "Bugatti OEM cabin with horseshoe wheel and Bugatti cluster.",
    key: "Bugatti oval key — OEM",
  },
  {
    pattern: /\b(mclaren|720s|765|p1|artura)\b/i,
    model: "McLaren (named model)",
    exterior: "McLaren supercar body with dihedral doors and McLaren proportions as named.",
    interior: "McLaren OEM cockpit, vertical central screen.",
    key: "McLaren shaped key — OEM",
  },
  {
    pattern: /\b(aston\s*martin|db11|db12|vantage|dbx)\b/i,
    model: "Aston Martin (named model)",
    exterior: "Aston Martin grille and British GT proportions for the named model.",
    interior: "Aston Martin OEM interior, bridge console.",
    key: "Aston Martin key — OEM",
  },
  {
    pattern: /\b(range\s*rover|defender|rr\s*sport)\b/i,
    model: "Range Rover (named variant)",
    exterior: "Land Rover Range Rover or Defender body as named — correct SUV silhouette.",
    interior: "Range Rover OEM cabin, Pivi Pro.",
    key: "Range Rover smart key — OEM",
  },
];

const LOCATION_SCENE_CATALOG = [
  {
    pattern: /\b(dubai|dubaï|burj\s*khalifa|marina\s*dubai|palm\s*jumeirah|jumeirah)\b/i,
    label: "Dubai, UAE",
    scene:
      "Photorealistic Dubai UAE: Burj Khalifa skyline, Marina towers, desert luxury light, or Palm Jumeirah as context — iconic Dubai architecture, never a generic European city.",
  },
  {
    pattern: /\b(jet\s*priv[ée]|private\s*jet|bizjet|g650|g700|global\s*7500|falcon\s*8x|tarmac|piste\s*d['’]?avion)\b/i,
    label: "Private jet / tarmac",
    scene:
      "Private aviation: FBO tarmac, luxury business jet fuselage and stairs, premium airport apron lighting — never a car wash or random garage.",
  },
  {
    pattern: /\b(yacht|superyacht|bateau|ponton|deck\s*yacht|mediterran[ée]e)\b/i,
    label: "Yacht",
    scene: "Luxury superyacht deck or marina berth, teak deck, azure water, premium nautical lifestyle.",
  },
  {
    pattern: /\b(maldives|bora\s*bora|st\s*tropez|monaco|marrakech|mykonos)\b/i,
    label: "Luxury destination",
    scene: "Ultra-luxury travel destination as named — photorealistic iconic scenery for that location.",
  },
];

function extractRollsRoyceModelPhrase(source) {
  const normalized = normalizeVehicleSearchText(source);
  const match = normalized.match(
    /\bRolls-Royce\b(?:\s+(?:Coachbuild\s+)?(?:Droptail|La Rose Noire|Black Badge|Phantom|Ghost|Spectre|Cullinan|Wraith|Dawn|[A-Za-z0-9][\w\s-]{0,40}))?/i,
  );
  if (match) return match[0].replace(/\s+/g, " ").trim();
  return "Rolls-Royce (exact model named by the user)";
}

function extractRequestedVehicleModel(text) {
  const source = normalizeVehicleSearchText(text);
  if (/\b(mansory)\b/i.test(source) && /\b(urus)\b/i.test(source)) {
    return {
      pattern: /\b(urus)\b/i,
      model: "Lamborghini Urus Mansory",
      exterior:
        "Lamborghini Urus with Mansory widebody kit, Mansory carbon aero and wheels — still unmistakably Urus-based, not a sedan.",
      interior:
        "authentic Lamborghini Urus cabin with Mansory tuning: Mansory carbon fiber dash and console trim, Mansory steering wheel accents, Urus dual digital screens with Lamborghini UI, alcantara/carbon luxury finish — never BMW roundel, never generic SUV.",
      key: "Lamborghini hexagonal key fob with bull logo — Urus OEM remote",
    };
  }
  for (const entry of VEHICLE_MODEL_CATALOG) {
    if (entry.pattern.test(source)) {
      if (entry.model === "Rolls-Royce Black Badge (named model)") {
        return {
          ...entry,
          model: extractRollsRoyceModelPhrase(source).includes("Black Badge")
            ? extractRollsRoyceModelPhrase(source)
            : `Rolls-Royce Black Badge ${source.match(/\b(ghost|phantom|wraith|dawn|cullinan|spectre)\b/i)?.[1] || ""}`.trim(),
        };
      }
      if (entry.model === "Bugatti (named model)") {
        const sub = source.match(/\b(chiron|mistral|veyron|bolide)\b/i)?.[1];
        return { ...entry, model: sub ? `Bugatti ${sub}` : "Bugatti (exact model named)" };
      }
      return entry;
    }
  }
  if (/\bRolls-Royce\b/i.test(source)) {
    return {
      pattern: /\bRolls-Royce\b/i,
      model: extractRollsRoyceModelPhrase(source),
      exterior:
        "Authentic Rolls-Royce OEM exterior for the exact model phrase above — correct body style (sedan, SUV, coupe, Droptail roadster). NEVER replace with a generic black luxury sedan or wrong Rolls model.",
      interior:
        "authentic Rolls-Royce OEM cabin matching that exact model — Spirit of Ecstasy, Rolls infotainment, correct seat count and layout.",
      key: "Rolls-Royce Spirit of Ecstasy key fob — OEM for that model",
    };
  }
  return null;
}

function isSceneRelocationPrompt(text) {
  const source = String(text || "");
  if (!LOCATION_SCENE_CATALOG.some((e) => e.pattern.test(source))) return false;
  return /\b(mets?(\s|-)?moi|met(?:tre|s)?(\s|-)?moi|transporte|teleport|place(\s|-)?moi|arri(?:v|ère)|fond|d[ée]cor|background|sc[eè]ne|scene|environment|setting|locatio|à\s+|a\s+dubai|in\s+dubai|sur\s+un)\b/i.test(
    source,
  );
}

function extractRequestedLocationScene(text) {
  const source = String(text || "");
  for (const entry of LOCATION_SCENE_CATALOG) {
    if (entry.pattern.test(source)) return entry;
  }
  return null;
}

function buildV2VLocationLock(userPrompt) {
  if (!isSceneRelocationPrompt(userPrompt)) return "";
  const loc = extractRequestedLocationScene(userPrompt);
  if (!loc) return "";
  return [
    " SCENE RELOCATION (mandatory — user asked to change place):",
    ` Replace the environment with ${loc.scene}`,
    ` Must read unmistakably as ${loc.label}.`,
    " Keep the same person/vehicle subject, camera path and timing unless the user asked otherwise.",
  ].join("");
}

function buildV2VExteriorVehicleLock(userPrompt) {
  const source = String(userPrompt || "");
  const vehicle = extractRequestedVehicleModel(source);
  const targetModel =
    vehicle?.model || "the exact vehicle brand and model named in the user prompt";
  const exterior =
    vehicle?.exterior ||
    "Match authentic OEM exterior design, grille, badges, proportions and body style for the requested model — never a generic sedan or wrong brand.";
  return [
    " CRITICAL EXTERIOR VEHICLE SWAP (user is replacing the visible car in the clip):",
    ` Replace the entire source vehicle with ${targetModel}.`,
    ` ${exterior}`,
    " Same position, scale, angle, wheel placement and motion as the original car in each frame.",
    " Never output a random luxury sedan when a specific model was requested (e.g. Droptail must stay a two-seat droptail, Urus must stay an Urus SUV).",
    buildKeySwapInstruction(vehicle),
  ].join("");
}

function prependVehicleTargetDirective(prompt) {
  const source = String(prompt || "").trim();
  if (!source || !isVehicleDrivingPrompt(source)) return source;
  const vehicle = extractRequestedVehicleModel(source);
  if (!vehicle) return source;
  const exterior = vehicle.exterior ? ` Exterior lock: ${vehicle.exterior}` : "";
  return `TARGET VEHICLE (non-negotiable): ${vehicle.model}.${exterior} User instruction: ${source}`;
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

  const locationLock = buildV2VLocationLock(source);
  if (locationLock && !/SCENE RELOCATION \(mandatory/i.test(result)) {
    result += locationLock;
  }

  if (
    isVehicleDrivingPrompt(source) &&
    !/KEY & ACCESSORY SWAP|INTELLIGENT STATE|vehicle realism lock|CRITICAL vehicle|CRITICAL EXTERIOR VEHICLE/i.test(
      result,
    )
  ) {
    result += isVehicleInteriorPrompt(source)
      ? buildV2VCockpitIntelligenceLock(source)
      : buildV2VExteriorVehicleLock(source);
  }

  return preserveSourceAudio ? result : `${result}${V2V_SILENT_OUTPUT_LOCK}`;
}

function buildV2VProviderPrompt(userPrompt, { preserveSourceAudio = false } = {}) {
  let prompt = String(userPrompt || "").trim();

  if (!preserveSourceAudio) {
    prompt = stripVoiceInstructionsFromPrompt(prompt);
  }

  prompt = prependVehicleTargetDirective(prompt);

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
  buildCarSwapPrompt,
  buildV2VTransformPrompt,
  buildV2VProviderPrompt,
  stripVoiceInstructionsFromPrompt,
  isVehicleDrivingPrompt,
  isV2VMotionBodyPrompt,
  v2vEngineFamilyForProvider,
  resolveV2VProviderForStudio,
  buildAlephSubmitPrompt,
  extractRequestedVehicleModel,
  extractRequestedLocationScene,
  isVehicleInteriorPrompt,
  buildV2VExteriorVehicleLock,
  buildV2VLocationLock,
  prependVehicleTargetDirective,
  buildKeySwapInstruction,
  buildV2VCockpitIntelligenceLock,
  buildV2VDashboardLockSuffix,
  maxVoiceCharsForDuration,
  validateVoiceText,
  mapStudioStage,
  studioStageLabel,
};
