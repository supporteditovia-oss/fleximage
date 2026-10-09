/**
 * Anti-hallucination locks for vehicle body swap (image + V2V transform).
 */

const VEHICLE_ANTI_HALLUCINATION_NEGATIVE =
  "driver, person inside car, human arm out window, hands, passengers, learner sticker, L plate, A sticker, probationary badge, text overlays, modified background, altered environment, deformed car wash brushes, artifacts";

const VEHICLE_SYSTEM_INJECTION =
  "Strictly match the occupancy state of the original image: if the car was empty, keep the new car empty with no driver and closed windows. Do not add people or arms. Strictly preserve the original background and surroundings. Pristine supercar finish without any added stickers or badges.";

function normalizePromptText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isVehicleStickerRemovalPrompt(prompt) {
  const text = normalizePromptText(prompt);
  if (
    /\b(sans\s+sticker|sans\s+autocollant|no\s+sticker|without\s+sticker|clean\s+showroom|pristine\s+finish)\b/.test(
      text,
    )
  ) {
    return true;
  }
  return (
    /\b(enlev\w*|retir\w*|supprim\w*|ote\w*|remove|delete|strip)\b/.test(text) &&
    /\b(sticker|autocollant|macaron|apprenti|probatoire|decal|badge|learner|probationary|plaque\s*[al]\b|\ble\s+[al]\b|\b[al]\s+(?:sticker|plate|badge))\b/.test(
      text,
    )
  );
}

function userRequestsKeepVehicleDecals(prompt) {
  const text = normalizePromptText(prompt);
  return (
    /\b(gard\w*|keep|conserver|conserve|meme\s+autocollant|same\s+sticker|same\s+decal|keep\s+(?:the\s+)?(?:plate|sticker|decal|a|l))\b/.test(
      text,
    ) && !isVehicleStickerRemovalPrompt(prompt)
  );
}

function userRequestsVehicleOccupants(prompt) {
  const text = normalizePromptText(prompt);
  return /\b(conducteur|driver|passager|passenger|moi\s+(?:dans|au)|me\s+in\s+the|with\s+(?:a\s+)?person|avec\s+(?:une?\s+)?personne|bras\s+sort|arm\s+out|hand\s+out|window\s+down|vitres?\s+(?:baiss|ouverte))\b/.test(
    text,
  );
}

function buildVehicleStickerPolicyClause(userPrompt) {
  if (isVehicleStickerRemovalPrompt(userPrompt)) {
    return (
      "STICKER REMOVAL LOCK: erase every apprentice A/L sticker, probation badge, and decal from the original — " +
      "100% smooth factory paint and clean rear glass on the new body, zero markings."
    );
  }
  if (userRequestsKeepVehicleDecals(userPrompt)) {
    return (
      "DECAL COPY LOCK: copy each original sticker/plate at most ONCE onto the equivalent panel of the new body — " +
      "physically attached, correct perspective — never duplicate floating in air or on car-wash equipment."
    );
  }
  return (
    "PRISTINE FINISH LOCK (default): showroom-clean factory paint, clean rear glass, factory finish — " +
    "no learner A/L stickers, no invented decals or badges; do NOT copy apprentice stickers unless explicitly asked."
  );
}

function buildVehicleOccupancyLock(userPrompt) {
  if (userRequestsVehicleOccupants(userPrompt)) {
    return "";
  }
  return (
    "OCCUPANCY LOCK: mirror source occupancy exactly — if no human was visible inside the original vehicle, " +
    "the swapped vehicle MUST stay completely empty (closed or tinted windows, no driver, no passengers, " +
    "no hand or arm at the window). Never invent people, hands, or silhouettes inside or around the car unless explicitly requested."
  );
}

function buildVehicleBackgroundInpaintLock() {
  return (
    "BACKGROUND / INPAINT LOCK: mask and edit ONLY the vehicle volume (body panels, glass, wheels, tires). " +
    "Preserve car-wash brushes, rollers, rails, walls, floor, ceiling, and all surroundings outside the car silhouette — " +
    "pixel-stable, no deformed machinery, no rebuilt environment."
  );
}

function buildVehiclePaintNegativeExtension(userPrompt) {
  let { parseVehiclePaintColor } = require("./prompt-guard");
  const paint = parseVehiclePaintColor(userPrompt);
  if (!paint || !/black|noir|jet/i.test(paint.label)) return "";
  return (
    ", blue car body paint, green car body paint, metallic blue body, turquoise body, " +
    "Miami Blue, Portimao Blue, grey-blue body, BMW hero blue, navy body color"
  );
}

function buildVehicleAntiHallucinationNegative(userPrompt) {
  return (
    VEHICLE_ANTI_HALLUCINATION_NEGATIVE +
    buildVehiclePaintNegativeExtension(userPrompt)
  );
}

function buildVehicleFidelityPromptBlock(userPrompt) {
  const parts = [
    VEHICLE_SYSTEM_INJECTION,
    buildVehicleBackgroundInpaintLock(),
    buildVehicleOccupancyLock(userPrompt),
    buildVehicleStickerPolicyClause(userPrompt),
    `Negative prompt: ${buildVehicleAntiHallucinationNegative(userPrompt)}.`,
  ].filter(Boolean);
  return parts.join(" ");
}

/** Compact suffix for V2V transform prompts (Aleph / Seedance / provider). */
function buildV2VVehicleFidelityBlock(userPrompt) {
  return ` ${buildVehicleFidelityPromptBlock(userPrompt)}`.replace(/\s+/g, " ").trim();
}

function isVehicleExteriorBodySwapPrompt(prompt) {
  const text = normalizePromptText(prompt);
  if (
    !/\b(voiture|car|auto|vehicule|vehicle|supercar|urus|lambo|ferrari|porsche|bmw|mercedes|audi|moto)\b/.test(
      text,
    )
  ) {
    return false;
  }
  if (/\b(interieur|interior|cockpit|habitacle|dashboard|tableau\s*de\s*bord)\b/.test(text)) {
    return false;
  }
  if (
    /\b(chang\w*|transform\w*|met\s+.*\s+a)\b/.test(text) &&
    /\b(d[ée]cor|background|decor|marina|dubai|yacht|plage|beach|montagne|cityscape)\b/.test(
      text,
    ) &&
    !/\b(remplac\w*|swap\w*)\b/.test(text)
  ) {
    return false;
  }
  return true;
}

const IMAGE_PROMPT_MAX_CHARS = 2900;

/** DeepInfra (Nano Banana 2) + OneShot partagent buildIdentityPreservingPrompt — ce garde-fou prepends si tronqué. */
function ensureVehicleReplacePromptForImageProvider(finalPrompt, userPrompt) {
  const text = String(finalPrompt || "");
  const raw = String(userPrompt || "").trim();
  if (!raw) return text;

  const { isVehicleReplacePrompt } = require("./prompt-guard");
  if (!isVehicleReplacePrompt(raw)) return text;

  if (
    /Strictly match the occupancy state|OCCUPANCY LOCK|BACKGROUND \/ INPAINT LOCK|PRISTINE FINISH LOCK/i.test(
      text,
    )
  ) {
    return text;
  }

  const block = buildVehicleFidelityPromptBlock(raw);
  const combined = `${block} ${text}`.replace(/\s+/g, " ").trim();
  return combined.slice(0, IMAGE_PROMPT_MAX_CHARS);
}

module.exports = {
  VEHICLE_ANTI_HALLUCINATION_NEGATIVE,
  VEHICLE_SYSTEM_INJECTION,
  IMAGE_PROMPT_MAX_CHARS,
  isVehicleStickerRemovalPrompt,
  userRequestsKeepVehicleDecals,
  userRequestsVehicleOccupants,
  buildVehicleStickerPolicyClause,
  buildVehicleOccupancyLock,
  buildVehicleBackgroundInpaintLock,
  buildVehicleFidelityPromptBlock,
  buildV2VVehicleFidelityBlock,
  isVehicleExteriorBodySwapPrompt,
  ensureVehicleReplacePromptForImageProvider,
};
