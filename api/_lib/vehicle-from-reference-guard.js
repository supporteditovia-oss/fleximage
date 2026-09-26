/**
 * Replace the vehicle in image 1 using the vehicle appearance from image 2.
 * Image 2 is DONOR ONLY — never relocate the scene/person to image 2's background.
 */

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const VEHICLE_FROM_REFERENCE_GUARD =
  "VEHICLE FROM REFERENCE IMAGE (mandatory — highest priority). " +
  "Image 1 = SCENE LOCK: the uploaded photo to preserve EXACTLY. " +
  "Image 2 = VEHICLE DONOR ONLY: copy the machine body/design from image 2 — NEVER import image 2's street, trees, buildings, sky, lighting, or crop. " +
  "FREEZE image 1 completely except the vehicle being replaced: same person, face, skin, hair, clothes, pose, phone/props, hands, feet, pavement/cobblestones, walls, shops, parked context, shadows, grain, camera angle, and framing. " +
  "Replace ONLY the existing car/bike/scooter in image 1 with the exact vehicle from image 2 — same parking pose, kickstand/stand, tire contact points, scale, and angle as the original vehicle. " +
  "If a rider sits on the bike in image 1, they stay on the new machine in the SAME pose and location — never teleport to another city or scene. " +
  "FORBIDDEN: using image 2 as the new background, inventing police cars/vans/patrol vehicles, wheelie-on-police-car scenes unless ALREADY visible in image 1, lifestyle relocation, rebuilding the street, inventing new cars/people, invented dashboard/cluster inset, door-open UI overlays, generic wrong model, studio lighting mismatch.";

const VEHICLE_FROM_REFERENCE_CLARIFIER =
  " (REFERENCE SWAP LOCK — critical: image 1 background/person UNCHANGED; image 2 donates ONLY the vehicle body; never move the user to image 2's location; NEVER invent police or patrol cars.)";

const VEHICLE_SCENE_FREEZE_CLARIFIER =
  " (SCENE FREEZE LOCK — absolute: keep image 1 street/buildings/pavement/lighting/crop EXACTLY. Swap vehicle body only. " +
  "FORBIDDEN: police car, patrol car, Battenburg markings, wheelie on hood, extra vehicles, dashboard inset, door-open cluster graphic, MMI screen collage, invented UI at bottom of frame.)";

const LUXURY_VEHICLE_SYNONYM_CLARIFIER =
  " (LUXURY CAR LOCK: when user says luxury/supercar without an exact model, render a real current ultra-luxury vehicle — Lamborghini Urus, Ferrari Purosangue, Bentley Bentayga, Rolls-Royce Cullinan, Mercedes-Maybach GLS, etc. — never a generic sedan, never the wrong brand, never a cheap car.)";

const URUS_IDENTITY_CLARIFIER =
  " (URUS LOCK — critical: Lamborghini Urus ONLY — wide luxury SUV, sharp Lambo nose, hexagonal grille, Y-shaped DRLs, muscular fenders, factory Urus wheels/badges. " +
  "Same parking pose/angle as the original car in image 1. NEVER a Clio/hatchback with Lambo badges, never Mercedes/BMW, never a generic SUV.)";

const ANTI_POLICE_INVENTION_CLARIFIER =
  " (NO POLICE LOCK — critical: if image 1 has NO police car, NEVER add police car, patrol vehicle, Battenburg chevrons, POLICE text, blue lights, or wheelie-on-police-hood composition.)";

const NO_EXTERIOR_DASHBOARD_UI_CLARIFIER =
  " (NO DASHBOARD INSET: exterior street photo ⇒ NO invented cluster/MMI screen, NO white car-outline graphic, NO 'door open' warning, NO dashboard collage at bottom — unless the original photo already shows a real dashboard.)";

function isVehicleReferenceImageMention(prompt) {
  const text = normalize(prompt);
  return (
    /\b(image\s*2|photo\s*2|2e\s+image|2eme\s+image|deuxieme\s+image|seconde\s+image|second\s+(picture|photo|image)|l['']?image\s*2|la\s+2e|la\s+2eme|avec\s+l['']?image\s*2|par\s+l['']?image\s*2|from\s+image\s*2|reference\s*2)\b/i.test(
      text,
    ) ||
    /\b(2e\s+photo|2eme\s+photo|deuxieme\s+photo|seconde\s+photo|second\s+photo|la\s+2e\s+photo|la\s+2eme\s+photo|la\s+deuxieme\s+photo|par\s+la\s+(2e|2eme|deuxieme|seconde)\s+photo|avec\s+la\s+(2e|2eme|deuxieme|seconde)\s+photo)\b/i.test(
      text,
    ) ||
    /\b(remplac\w*|replace\w*|swap\w*|echange\w*|change\w*|mets|mettre|put)\w*[\s\S]{0,60}\b(par|with|avec)\b[\s\S]{0,40}\b(l['']?)?(image|photo)\s*2\b/i.test(
      text,
    ) ||
    /\b(remplac\w*|replace\w*)\w*[\s\S]{0,40}\b(par|with|avec)\b[\s\S]{0,30}\b(la\s+)?(deuxieme|deuxième|2e|2eme|seconde|second)\s+(photo|image)\b/i.test(
      text,
    )
  );
}

function isVehicleReplaceIntent(prompt) {
  const text = normalize(prompt);
  return (
    (/\b(remplac\w*|replace\w*|swap\w*|echange\w*|change\w*|transforme\w*)\b/.test(text) &&
      /\b(moto|motos|scooter|bike|motorcycle|moto|voiture|car|auto|vehicule|vehicle|quad|atv|x[\s-]?adv|tmax|moto)\b/.test(
        text,
      )) ||
    /\b(remplac\w*|replace\w*)\w*[\s\S]{0,40}\b(ma|my|mon|ma\s+)?(moto|scooter|voiture|car|auto|bike)\b/i.test(text)
  );
}

function isUrusReplacePrompt(prompt) {
  const text = normalize(prompt);
  return /\b(urus|lamborghini\s*urus)\b/.test(text);
}

/** Image 1 = scene, image 2 = vehicle donor. Requires 2+ uploaded images unless explicit single-image named swap. */
function isVehicleFromReferencePrompt(prompt, referenceImageCount = 0) {
  const refs = Math.max(0, Number(referenceImageCount) || 0);
  if (refs < 2) return false;
  if (isVehicleReferenceImageMention(prompt)) {
    return isVehicleReplaceIntent(prompt);
  }
  // 2 images + replace vehicle (not outfit) ⇒ image 2 is the vehicle donor by default.
  return isVehicleReplaceIntent(prompt);
}

function isLuxuryVehicleSynonymPrompt(prompt) {
  const text = normalize(prompt);
  if (
    !/\b(voiture\s+de\s+luxe|voiture\s+luxe|luxury\s+car|supercar|super\s+car|voiture\s+premium|premium\s+car|hypercar)\b/.test(
      text,
    )
  ) {
    return false;
  }
  return !/\b(urus|lamborghini|ferrari|porsche|bentley|rolls|cullinan|maybach|mclaren|bugatti|purosangue|aventador|huracan)\b/.test(
    text,
  );
}

/** Exterior body swap — never apply in-cabin door/cluster locks. */
function isExteriorVehicleBodySwapPrompt(prompt, referenceImageCount = 0) {
  const text = normalize(prompt);
  if (isVehicleFromReferencePrompt(prompt, referenceImageCount)) return true;
  if (/\b(habitacle|interieur|interior|cockpit|volant|dashboard|au\s+volant|behind\s+the\s+wheel)\b/.test(text)) {
    return false;
  }
  if (!isVehicleReplaceIntent(prompt)) return false;
  // Wheelie/stoppie on a car hood keeps the ride path — not a plain exterior park swap.
  if (
    /\b(stoppie|wheelie|cabriole|endo|wheelieing)\b/.test(text) ||
    /\b(roue|wheel|pneu|tire|front\s*wheel)\s+(sur|on|against|dans)\s+(le\s+)?(capot|hood|bonnet|toit|roof|voiture|car|police)\b/.test(
      text,
    )
  ) {
    return false;
  }
  return true;
}

module.exports = {
  VEHICLE_FROM_REFERENCE_GUARD,
  VEHICLE_FROM_REFERENCE_CLARIFIER,
  VEHICLE_SCENE_FREEZE_CLARIFIER,
  LUXURY_VEHICLE_SYNONYM_CLARIFIER,
  URUS_IDENTITY_CLARIFIER,
  ANTI_POLICE_INVENTION_CLARIFIER,
  NO_EXTERIOR_DASHBOARD_UI_CLARIFIER,
  isVehicleFromReferencePrompt,
  isVehicleReferenceImageMention,
  isVehicleReplaceIntent,
  isLuxuryVehicleSynonymPrompt,
  isUrusReplacePrompt,
  isExteriorVehicleBodySwapPrompt,
  normalizeVehicleRefText: normalize,
};
