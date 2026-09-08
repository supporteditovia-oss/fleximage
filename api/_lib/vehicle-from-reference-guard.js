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
  "FORBIDDEN: using image 2 as the new background, police-car wheelie scenes unless already in image 1, lifestyle relocation, rebuilding the street, inventing new cars/people, generic wrong model, studio lighting mismatch.";

const VEHICLE_FROM_REFERENCE_CLARIFIER =
  " (REFERENCE SWAP LOCK — critical: image 1 background/person UNCHANGED; image 2 donates ONLY the vehicle body; never move the user to image 2's location.)";

const LUXURY_VEHICLE_SYNONYM_CLARIFIER =
  " (LUXURY CAR LOCK: when user says luxury/supercar without a exact model, render a real current ultra-luxury vehicle — Lamborghini Urus, Ferrari Purosangue, Bentley Bentayga, Rolls-Royce Cullinan, Mercedes-Maybach GLS, etc. — never a generic sedan, never the wrong brand, never a cheap car.)";

function isVehicleReferenceImageMention(prompt) {
  const text = normalize(prompt);
  return (
    /\b(image\s*2|photo\s*2|2e\s+image|2eme\s+image|deuxieme\s+image|seconde\s+image|second\s+(picture|photo|image)|l['']?image\s*2|la\s+2e|la\s+2eme|avec\s+l['']?image\s*2|par\s+l['']?image\s*2|from\s+image\s*2|reference\s*2)\b/i.test(
      text,
    ) ||
    /\b(remplac\w*|replace\w*|swap\w*|echange\w*|change\w*|mets|mettre|put)\w*[\s\S]{0,50}\b(par|with|avec)\b[\s\S]{0,30}\b(l['']?)?image\s*2\b/i.test(
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
    /\b(remplac\w*|replace\w*)\w*[\s\S]{0,30}\b(ma|my|ma\s+)?(moto|scooter|voiture|car|bike)\b/i.test(text)
  );
}

/** Image 1 = scene, image 2 = vehicle donor only. Requires 2+ uploaded images. */
function isVehicleFromReferencePrompt(prompt, referenceImageCount = 0) {
  const refs = Math.max(0, Number(referenceImageCount) || 0);
  if (refs < 2) return false;
  if (!isVehicleReferenceImageMention(prompt)) return false;
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

module.exports = {
  VEHICLE_FROM_REFERENCE_GUARD,
  VEHICLE_FROM_REFERENCE_CLARIFIER,
  LUXURY_VEHICLE_SYNONYM_CLARIFIER,
  isVehicleFromReferencePrompt,
  isVehicleReferenceImageMention,
  isVehicleReplaceIntent,
  isLuxuryVehicleSynonymPrompt,
  normalizeVehicleRefText: normalize,
};
