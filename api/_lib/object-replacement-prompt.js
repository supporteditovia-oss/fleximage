/**
 * Structured IMAGE EDIT / OBJECT REPLACEMENT pipeline for uploaded photos.
 * Detects swap intents (car → supercar, bike → motocross, etc.) and builds
 * a provider-ready prompt with inpaint-style preservation locks.
 */

const {
  sanitizeUserPrompt,
  parseVehicleSpec,
  isPersonSwapPrompt,
  isFacialHairPrompt,
  isAddVehiclesToScenePrompt,
  isLifestyleRelocatePrompt,
  isVehicleDriverPrompt,
  isVehicleCockpitRefinePrompt,
  isVehicleReplacePrompt,
  isMotorcycleReplacePrompt,
  isMotorcycleSeatedUserPrompt,
  isMotorcycleWheelOnVehiclePrompt,
  VEHICLE_REPLACE_SCENE_GUARD,
  VEHICLE_PRODUCT_CLARIFIER,
  VEHICLE_REPLACE_CLARIFIER,
  VEHICLE_SCENE_MATCH_CLARIFIER,
  MOTORCYCLE_REPLACE_CLARIFIER,
  MOTORCYCLE_WHEEL_CONTACT_CLARIFIER,
  REALISM_QUALITY_GUARD,
  NEGATIVE_PROMPT_CLAUSE,
  MAX_FINAL_PROMPT,
} = require("./prompt-guard");

const REPLACE_VERB_RE =
  /\b(remplac\w*|replace\w*|swap\w*|echange\w*|a\s+la\s+place|instead\s+of|change\w*|transforme\w*|mets\s+a\s+la\s+place|mettre\s+a\s+la\s+place)\b/;

const SOURCE_OBJECT_RE =
  /\b(voiture|voitures|car|cars|auto|autos|vehicule|vehicules|vehicle|vehicles|moto|motos|scooter|scooters|velo|bike|bicycle|bicycles|vtt|citadine|citadines|twingo|clio|megane|208|308|c3|c4|polo|fiesta|focus|corsa|yaris|sandero|dacia|berline|berlines|suv|coupe|camion|camions|truck|trucks|van|vans|quad|atv|cycl\b)/;

const TARGET_VEHICLE_RE =
  /\b(lamborghini|lambo|svj|aventador|huracan|revuelto|urus|ferrari|purosangue|sf90|812|296|488|f8|roma|portofino|porsche|911|cayenne|macan|taycan|gt3|bmw|mercedes|amg|g[\-\s]?wagen|g63|audi|rs[3567]|r8|bentley|bugatti|mclaren|maserati|rolls[\s\-]?royce|cullinan|mustang|corvette|challenger|range\s*rover|motocross|enduro|tmax|tmag|ktm|ducati|yamaha|s1000|gsxr|nmax|xmax|forza|pcx|supercar|hypercar|sportive|sport\b)/;

const GENERIC_TARGET_RE =
  /\b(supercar|hypercar|luxe|luxury|sportive|sport\b|moto\s+sportive|motocross|enduro|scooter|maxi[\s-]?scooter)\b/;

function normalizePromptText(prompt) {
  return String(prompt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mentionsMotorcycleTarget(prompt) {
  const text = normalizePromptText(prompt);
  if (
    /\b(jet\s*skis?|jetskis?|scooter\s+des\s+mers|wave\s*runners?|seadoo|sea\s*doo)\b/.test(
      text,
    )
  ) {
    return false;
  }
  return (
    /\b(motocross|enduro|tmax|t\s*max|tmag|scooter|moto|motos|motorcycle|quad|atv|cross|dirt\s*bike|ktm|yamaha|ducati|s1000|gsxr|vespa|nmax|xmax|forza|pcx)\b/i.test(
      text,
    )
  );
}

function hasReplaceVerb(text) {
  if (REPLACE_VERB_RE.test(text)) return true;
  if (/\b(mets|mettre|put)\b/.test(text) && /\b(par|with|with a|by|for)\b/.test(text)) {
    return true;
  }
  if (/\b(mets|mettre|put)\b/.test(text) && TARGET_VEHICLE_RE.test(text) && !/\b(moi|me|je)\b/.test(text)) {
    return true;
  }
  return false;
}

function extractSourceObjectLabel(prompt, text) {
  const colorMatch = text.match(
    /\b(blanc(?:he|s)?|noir(?:e|s)?|rouge?s?|bleu(?:e|s)?|gris(?:e|s)?|grise?s?|vert(?:e|s)?|jaune?s?|silver|grey|gray|white|black|red|blue|green|yellow)\b[\s,]*(?:la\s+|le\s+|ma\s+|mon\s+|my\s+)?(?:voiture|car|auto|vehicule|vehicle|velo|bike|bicycle|moto|scooter|twingo|clio|citadine)/,
  );
  if (colorMatch) {
    return colorMatch[0].replace(/\b(la|le|ma|mon|my)\s+/g, "the ").trim();
  }

  const possessiveMatch = text.match(
    /\b(?:ma|mon|mes|my|the|la|le|l')\s+(voiture|car|auto|vehicule|vehicle|velo|bike|bicycle|moto|scooter|twingo|clio|citadine|berline|suv|camion|truck|van)\b/,
  );
  if (possessiveMatch) {
    return `the ${possessiveMatch[1]}`;
  }

  if (/\b(velo|bike|bicycle|vtt)\b/.test(text)) return "the bicycle/bike in the photo";
  if (/\b(voiture|car|auto|vehicule|vehicle|citadine|berline|suv)\b/.test(text)) {
    return "the existing car/vehicle in the uploaded reference photo";
  }
  if (/\b(moto|scooter|motorcycle)\b/.test(text)) {
    return "the existing motorcycle/scooter in the uploaded reference photo";
  }
  return "the existing vehicle or object already visible in the uploaded reference photo";
}

function extractReplacementLabel(prompt, text) {
  const spec = parseVehicleSpec(prompt);
  if (spec?.label) return `a ${spec.label}`;

  const targetMatch = text.match(
    /\b(?:par|with|into|for|en)\s+(?:un(?:e)?|a|an|la|le|l')?\s*([a-z0-9][\w\s\-]{2,40})/,
  );
  if (targetMatch) {
    const candidate = targetMatch[1].trim();
    if (candidate && !/^(moi|me|je|photo|image)$/i.test(candidate)) {
      return `a ${candidate}`;
    }
  }

  if (GENERIC_TARGET_RE.test(text)) {
    const generic = text.match(GENERIC_TARGET_RE);
    if (generic) return `a luxury ${generic[0]}`;
  }

  return "the exact replacement vehicle/object named in the user request";
}

function classifyObjectReplacementKind(prompt, text) {
  if (isMotorcycleReplacePrompt(prompt) && !isMotorcycleSeatedUserPrompt(prompt)) {
    if (/\b(velo|bike|bicycle|vtt)\b/.test(text)) return "bicycle_to_motorcycle";
    return "motorcycle";
  }
  if (isVehicleReplacePrompt(prompt)) return "vehicle";
  if (/\b(velo|bike|bicycle|vtt)\b/.test(text) && mentionsMotorcycleTarget(prompt)) {
    return "bicycle_to_motorcycle";
  }
  if (SOURCE_OBJECT_RE.test(text) && (TARGET_VEHICLE_RE.test(text) || parseVehicleSpec(prompt))) {
    return "vehicle";
  }
  return "generic";
}

/**
 * @returns {null | { kind: string, hasReplaceVerb: boolean }}
 */
function detectObjectReplacement(prompt, options = {}) {
  const referenceImageCount = Math.max(0, Number(options.referenceImageCount) || 0);
  if (referenceImageCount < 1) return null;

  if (
    isPersonSwapPrompt(prompt) ||
    isFacialHairPrompt(prompt) ||
    isAddVehiclesToScenePrompt(prompt) ||
    isLifestyleRelocatePrompt(prompt) ||
    isVehicleDriverPrompt(prompt) ||
    isVehicleCockpitRefinePrompt(prompt) ||
    isMotorcycleSeatedUserPrompt(prompt)
  ) {
    return null;
  }

  const text = normalizePromptText(prompt);
  const replaceVerb = hasReplaceVerb(text);
  const hasSource = SOURCE_OBJECT_RE.test(text);
  const hasTarget = TARGET_VEHICLE_RE.test(text) || GENERIC_TARGET_RE.test(text) || Boolean(parseVehicleSpec(prompt));

  if (isVehicleReplacePrompt(prompt) || isMotorcycleReplacePrompt(prompt)) {
    return {
      kind: classifyObjectReplacementKind(prompt, text),
      hasReplaceVerb: replaceVerb,
    };
  }

  if (replaceVerb && hasSource && hasTarget) {
    return {
      kind: classifyObjectReplacementKind(prompt, text),
      hasReplaceVerb: true,
    };
  }

  if (replaceVerb && hasTarget && parseVehicleSpec(prompt)) {
    return {
      kind: classifyObjectReplacementKind(prompt, text),
      hasReplaceVerb: true,
    };
  }

  return null;
}

const IMAGE_TO_IMAGE_STRENGTH_GUARD =
  "IMAGE-TO-IMAGE EDIT MODE (mandatory): treat the uploaded photo as the locked base canvas. " +
  "Use semantic inpainting / object replacement strength equivalent to denoising_strength 0.78 (range 0.70–0.85): " +
  "transform the target object fully into the replacement, but preserve global scene geometry, background pixels, camera pose, and lighting. " +
  "Never full scene regeneration, never a new location, never a studio reshoot.";

function buildStructuredReplacementBlock(sourceLabel, replacementLabel, userPrompt) {
  return (
    "IMAGE EDIT / OBJECT REPLACEMENT INSTRUCTION: " +
    `1. TARGET TO REPLACE: Identify and isolate ${sourceLabel} in the uploaded reference photo. ` +
    `2. REPLACEMENT: Replace ONLY that specific object with ${replacementLabel}. ` +
    "3. STRICT PRESERVATION: Keep the EXACT same environment, street pavement, background buildings, trees, lighting, shadows, and weather from the original photo. " +
    "Keep the EXACT same camera angle, perspective, lens focal length, distance, and framing. " +
    "If a person or hands are visible near or in front of the object, preserve the person's identity, clothes, position, and limbs 100% intact. " +
    "4. INTEGRATION: The new replacement vehicle must sit realistically on the ground with accurate contact tire shadows and environmental reflections matching the existing scene. " +
    `Original user request: ${String(userPrompt || "").trim()}`
  );
}

function domainGuardForKind(kind, prompt) {
  if (kind === "vehicle" || kind === "generic") {
    return `${VEHICLE_REPLACE_SCENE_GUARD}${VEHICLE_REPLACE_CLARIFIER}${VEHICLE_SCENE_MATCH_CLARIFIER}${VEHICLE_PRODUCT_CLARIFIER}`;
  }
  if (kind === "bicycle_to_motorcycle" || kind === "motorcycle") {
    let guard = `${MOTORCYCLE_REPLACE_CLARIFIER}${VEHICLE_PRODUCT_CLARIFIER}`;
    if (isMotorcycleWheelOnVehiclePrompt(prompt)) {
      guard = `${MOTORCYCLE_WHEEL_CONTACT_CLARIFIER}${guard}`;
    }
    return guard;
  }
  return VEHICLE_REPLACE_SCENE_GUARD;
}

function buildObjectReplacementPrompt(userPrompt, options = {}) {
  const cleaned = sanitizeUserPrompt(String(userPrompt || "").trim());
  const text = normalizePromptText(cleaned || userPrompt);
  const intent = options.intent || detectObjectReplacement(userPrompt, options);
  const kind = intent?.kind || "generic";

  const sourceLabel = extractSourceObjectLabel(userPrompt, text);
  const replacementLabel = extractReplacementLabel(userPrompt, text);
  const structured = buildStructuredReplacementBlock(sourceLabel, replacementLabel, cleaned || userPrompt);
  const domainGuard = domainGuardForKind(kind, userPrompt);
  const subjectPoseBlock = String(options.subjectPoseBlock || "").trim();

  const parts = [
    IMAGE_TO_IMAGE_STRENGTH_GUARD,
    structured,
    domainGuard,
    subjectPoseBlock,
    REALISM_QUALITY_GUARD,
    NEGATIVE_PROMPT_CLAUSE,
  ].filter(Boolean);

  let combined = parts.join(" ");
  if (combined.length > MAX_FINAL_PROMPT) {
    combined = combined.slice(0, MAX_FINAL_PROMPT);
  }
  return combined;
}

module.exports = {
  detectObjectReplacement,
  buildObjectReplacementPrompt,
  extractSourceObjectLabel,
  extractReplacementLabel,
};
