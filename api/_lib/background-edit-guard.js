/**
 * Background-only image edit: replace backdrop while freezing all foreground people.
 * Prevents lifestyle relocation from dropping companions (e.g. Ronaldo) or inventing cars.
 */

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const BACKGROUND_EDIT_GUARD =
  "BACKGROUND-ONLY IMAGE EDIT (mandatory — NOT a new generation). " +
  "Real inpaint on the uploaded photo: replace ONLY the background/backdrop/sky/buildings/environment behind the subjects. " +
  "SUBJECT PROTECTION MASK (critical): every visible person in the reference is locked foreground — never delete, replace, merge, duplicate, hide, recrop, or face-swap them. " +
  "PEOPLE COUNT LOCK: output must contain EXACTLY the same number of distinguishable people as the reference photo. " +
  "PRESERVE each person: face, identity, skin tone, hair, expression, outfit (unless user explicitly asked to change clothes), body pose, relative position, spacing, depth order, and contact with each other. " +
  "PRESERVE: camera angle, framing, crop, selfie composition, phone in hand if present, arm-around-shoulder pose if present. " +
  "CHANGE ONLY: walls, sky, buildings, decor, location atmosphere, background lighting — blend naturally behind the frozen subjects. " +
  "FORBIDDEN: solo portrait when reference had multiple people, removing a celebrity/companion, inventing a car/cockpit/dashboard/plane interior, driver-seat POV, wheelie scenes, rebuilding the whole image, generic new-scene paste, studio relight that changes faces.";

const BACKGROUND_EDIT_CLARIFIER =
  " (BACKGROUND EDIT LOCK — critical: same people, same faces, same poses, same crop; backdrop/decor only.)";

const MULTI_PERSON_PRESERVE_CLARIFIER =
  " (MULTI-PERSON LOCK — critical: keep EXACTLY the same number of visible people as the reference. Never remove, replace, merge, duplicate, or hide anyone. Celebrity companions stay beside the subject.)";

const NO_INVENTED_SCENE_VEHICLE_CLARIFIER =
  " (NO INVENTED VEHICLE — critical: background edit only. FORBIDDEN: car interior, steering wheel, dashboard, MMI/cluster, plane cabin, unless already visible in the reference photo.)";

const AI_MODIFIED_LABEL =
  "Image générée/modifiée par IA";

function peopleCountClarifier(count) {
  const n = Math.max(0, Number(count) || 0);
  if (n < 2) return "";
  return ` (PEOPLE COUNT LOCK — absolute: reference shows ${n} people ⇒ output MUST show exactly ${n} distinguishable people with the same faces and positions.)`;
}

function isExplicitMultiPersonPreservePrompt(prompt) {
  const text = normalize(prompt);
  return (
    /\b(garde\s+(les\s+)?(personnes|gens|tout\s+le\s+monde|nous|eux|elles)|keep\s+(all\s+)?(people|everyone|them)|ne\s+(change|modifie)\s+pas\s+(les\s+)?visages?|don['']?t\s+change\s+(the\s+)?faces?)\b/.test(
      text,
    ) ||
    /\b(mets[\s-]?les|met[\s-]?les|place[\s-]?les|mettre[\s-]?les|put\s+them|keep\s+them)\b/.test(
      text,
    ) ||
    /\b(les\s+deux|both\s+of\s+us|we\s+both|nous\s+deux|avec\s+(lui|elle|eux|cris|ronaldo|mbappe|messi|neymar))\b/.test(
      text,
    ) ||
    /\b(selfie\s+(a\s+)?deux|duo|together|ensemble)\b/.test(text)
  );
}

function isBackgroundChangeIntent(prompt) {
  const text = normalize(prompt);
  const decor =
    /\b(fond|background|decor|d[eé]cor|arriere[\s-]?plan|backdrop|wallpaper|ciel|sky|ambiance|atmosphere|eclairage|lighting|weather|meteo|météo)\b/.test(
      text,
    );
  const place =
    /\b(rooftop|terrasse|terrace|hotel|h[oô]tel|palace|palais|marina|plage|beach|restaurant|dubai|monaco|paris|london|madrid|barcelone|barcelona|capri|marrakech|yacht\s+deck|jardin|garden|balcon|balcony|piscine|pool)\b/.test(
      text,
    );
  const changeVerb =
    /\b(change|changer|remplace|replace|swap|mets|mettre|put|place|teleporte|envoie|emmene|nouveau|new|modifier|modifie|edit)\b/.test(
      text,
    );
  return (
    (decor && changeVerb) ||
    (place && changeVerb) ||
    /\b(change\s+(le\s+)?fond|nouveau\s+d[eé]cor|remplace\s+l['']?arriere[\s-]?plan|replace\s+(the\s+)?background|edit\s+(the\s+)?background|background\s+only|fond\s+seulement)\b/.test(
      text,
    )
  );
}

function isDriverOrVehicleInteriorIntent(prompt) {
  const text = normalize(prompt);
  if (
    /\b(au volant|behind the wheel|driver\s+seat|conducteur|habitacle|cockpit|interieur|interior|dashboard|tableau\s*de\s*bord|volant|steering)\b/.test(
      text,
    )
  ) {
    return true;
  }
  if (
    /\b(moi|me|je)\b/.test(text) &&
    /\b(urus|lambo|lamborghini|ferrari|porsche|bmw|mercedes|voiture|car|moto|scooter|volant|guidon)\b/.test(
      text,
    ) &&
    /\b(mets|mettre|put|place|assis|assieds|conduire|drive)\b/.test(text)
  ) {
    return true;
  }
  return false;
}

function isSubjectOrVehicleSwapIntent(prompt) {
  const text = normalize(prompt);
  return (
    /\b(remplac\w*|swap|echange\w*)\w*[\s\S]{0,50}\b(la\s+)?(personne|femme|homme|moto|scooter|voiture|car|vehicule|vehicle|moi\s+par)\b/.test(
      text,
    ) ||
    /\b(face[\s-]?swap|changer\s+(de\s+)?visage)\b/.test(text)
  );
}

/**
 * True when the user wants backdrop/decor change while keeping existing people.
 * editMode: 'auto' | 'edit' | 'create'
 */
function isBackgroundEditPrompt(prompt, options = {}) {
  const text = normalize(prompt);
  const editMode = String(options.editMode || "auto").toLowerCase();
  const refCount = Math.max(0, Number(options.referenceImageCount) || 0);
  const hasRef =
    options.hasReferenceImage !== false && (refCount >= 1 || options.hasReferenceImage === true);

  if (editMode === "create") return false;
  if (!hasRef && editMode !== "edit") return false;

  if (isSubjectOrVehicleSwapIntent(prompt)) return false;
  if (isDriverOrVehicleInteriorIntent(prompt)) return false;

  if (editMode === "edit") return true;

  if (isExplicitMultiPersonPreservePrompt(prompt)) {
    return isBackgroundChangeIntent(prompt) || Boolean(detectPlateLocation(text));
  }

  if (!isBackgroundChangeIntent(prompt)) return false;

  // Solo lifestyle relocate ("mets-moi à Dubaï dans un Urus") — not background edit.
  if (
    /\b(moi|me|je)\b/.test(text) &&
    !/\b(mets[\s-]?les|les\s+deux|ensemble|together|garde\s+les)\b/.test(text) &&
    /\b(dubai|monaco|paris|hotel|rooftop|marina|yacht|voiture|car|urus|lambo)\b/.test(text)
  ) {
    return false;
  }

  return true;
}

/** Minimal location detector for background-edit (avoid pulling full prompt-guard). */
function detectPlateLocation(text) {
  const t = normalize(text);
  if (/\b(dubai|uae|emirats?|emirates|abou\s*dhabi|abu\s*dhabi)\b/.test(t)) return "dubai";
  if (/\b(monaco|monte\s*carlo)\b/.test(t)) return "monaco";
  if (/\b(paris|france)\b/.test(t)) return "paris";
  if (/\b(madrid|barcelone|barcelona|espagne|spain)\b/.test(t)) return "spain";
  if (/\b(london|uk|angleterre)\b/.test(t)) return "uk";
  return null;
}

function resolveImageEditMode(prompt, options = {}) {
  const forced = String(options.editMode || "auto").toLowerCase();
  if (forced === "edit" || forced === "create") return forced;
  if (isBackgroundEditPrompt(prompt, options)) return "edit";
  return "create";
}

function buildBackgroundEditPromptHead(options = {}) {
  const count = Math.max(0, Number(options.visiblePeopleCount) || 0);
  return (
    `${BACKGROUND_EDIT_GUARD}${BACKGROUND_EDIT_CLARIFIER}${MULTI_PERSON_PRESERVE_CLARIFIER}` +
    `${peopleCountClarifier(count)}${NO_INVENTED_SCENE_VEHICLE_CLARIFIER}`
  );
}

module.exports = {
  BACKGROUND_EDIT_GUARD,
  BACKGROUND_EDIT_CLARIFIER,
  MULTI_PERSON_PRESERVE_CLARIFIER,
  NO_INVENTED_SCENE_VEHICLE_CLARIFIER,
  AI_MODIFIED_LABEL,
  isBackgroundEditPrompt,
  isBackgroundChangeIntent,
  isExplicitMultiPersonPreservePrompt,
  resolveImageEditMode,
  buildBackgroundEditPromptHead,
  peopleCountClarifier,
  normalizeBackgroundEditText: normalize,
};
