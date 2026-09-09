/**
 * Private jet tarmac boarding — outdoor apron only.
 * Prevents interior stairwell / cabin misroutes when "escalier" appears in boarding prompts.
 */

const MAX_FINAL_PROMPT = 2900;

function normalizePromptText(prompt) {
  return String(prompt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Private jet / business aircraft — never jet-ski. */
function isPrivateJetPrompt(prompt) {
  const text = normalizePromptText(prompt);
  if (/\b(jet\s*skis?|jetskis?|wave\s*runners?|seadoo|sea\s*doo)\b/i.test(text)) {
    return false;
  }
  return (
    /\b(jet[\s-]?priv[eé]?|private\s*jet|jet[\s-]?prive|jet_prive|jet-prive)\b/i.test(text) ||
    (/\b(embarquement|boarding|airstair|escalier\s+d['']?embarquement)\b/i.test(text) &&
      /\b(jet|avion|aircraft|plane|gulfstream|falcon|citation|learjet)\b/i.test(text))
  );
}

/** Explicit in-cabin VIP selfie — not default tarmac boarding. */
function isPrivateJetCabinPrompt(prompt) {
  const text = normalizePromptText(prompt);
  if (!isPrivateJetPrompt(text)) return false;
  const cabinAsk =
    /\b(cabine|cabin|interieur|interior|selfie\s+(cabine|cabin|jet)|assis\s+(dans|sur)\s+(le\s+)?(jet|avion|si[eè]ge)|seated\s+inside|inside\s+the\s+(jet|plane|cabin)|dans\s+la\s+cabine|photo\s+cabine|champagne\s+(dans|in)|si[eè]ge\s+(vip|cuir|leather)|fenetre\s+de\s+cabine|hublot\s+(de\s+)?cabine)\b/i.test(
      text,
    );
  const tarmacAsk =
    /\b(tarmac|piste|runway|apron|terminal\s+prive|embarquement|boarding|airstair|escalier\s+d['']?embarquement|monter\s+(dans|sur|a)|marcher\s+vers|walk(?:ing)?\s+toward|climb(?:ing)?\s+(the\s+)?stairs)\b/i.test(
      text,
    );
  return cabinAsk && !tarmacAsk;
}

/** Default jet privé → outdoor tarmac boarding (unless explicit cabin). */
function isPrivateJetBoardingPrompt(prompt) {
  if (isPrivateJetCabinPrompt(prompt)) return false;
  return isPrivateJetPrompt(prompt);
}

const PRIVATE_JET_TARMAC_GUARD =
  "PRIVATE JET TARMAC BOARDING (mandatory). " +
  "OUTDOOR ONLY: real airport tarmac OR private terminal apron — open sky, clear horizon, natural daylight or golden hour. " +
  "A REAL private jet MUST be clearly visible in the SAME frame: fuselage body, wings, tail, passenger windows/portholes. " +
  "Mobile airstair / boarding stairs pressed against the aircraft door — NOT an interior building staircase. " +
  "Subject walks toward the jet OR climbs the boarding stairs with natural travel pose. " +
  "MANDATORY scene elements: visible sky, asphalt/concrete tarmac ground, runway/apron markings, orange safety cones, distant ground-service vehicle. " +
  "FORBIDDEN: building interior, room, corridor, hallway, gym, concrete interior stairwell, cage d'escalier, apartment, hotel room, studio, " +
  "stairs without any aircraft, abstract decor, scene with no airport runway/tarmac. " +
  "If no aircraft is clearly visible, the image is invalid — regenerate. " +
  "IDENTITY LOCK: same face/skin/hair/body from the reference. NEW natural boarding pose — never paste the reference selfie hand-on-cheek. " +
  "Photoreal smartphone travel photo, vertical 9:16 when possible.";

const PRIVATE_JET_TARMAC_CLARIFIER =
  " (JET TARMAC LOCK: OUTDOOR airport tarmac/apron ONLY — sky + horizon visible, real private jet in frame (fuselage, wings, windows), " +
  "mobile boarding stairs against the aircraft door. Subject walks toward the plane or climbs those stairs. " +
  "Include tarmac markings, safety cones, distant service vehicle. " +
  "FORBIDDEN: interior room, interior concrete staircase, stairwell without aircraft, cabin-only shot without jet exterior.)";

const PRIVATE_JET_TARMAC_PLACEMENT_HINT =
  " (JET TARMAC PLACE: subject on outdoor tarmac walking toward a visible private jet OR mid-step on mobile boarding stairs against the aircraft door. " +
  "Real contact shadows on asphalt. Jet fuselage, wings, and windows readable in the same photo. NOT seated inside cabin. NOT indoor building stairs.)";

function buildPrivateJetTarmacPrompt(userPrompt, options = {}) {
  const raw = String(userPrompt || "").trim();
  const subjectPoseBlock = String(options.subjectPoseBlock || "").trim();
  const poseSuffix = subjectPoseBlock ? ` ${subjectPoseBlock}` : "";
  return (
    `${PRIVATE_JET_TARMAC_GUARD}${PRIVATE_JET_TARMAC_CLARIFIER}${PRIVATE_JET_TARMAC_PLACEMENT_HINT}${poseSuffix} ` +
    `User request: ${raw}. ` +
    "Negative: interior staircase, stairwell, concrete indoor stairs, corridor, room without aircraft, missing jet, no sky, no tarmac."
  ).slice(0, MAX_FINAL_PROMPT);
}

function privateJetTarmacVisionQaBlock() {
  return (
    "PRIVATE JET TARMAC QA (critical when requested):\n" +
    "- MUST show: outdoor airport tarmac/apron, visible sky, clearly identifiable private jet (fuselage+wings+windows), mobile boarding stairs at aircraft door.\n" +
    "- Subject should walk toward the jet or climb boarding stairs — not sit in a cabin unless explicitly requested.\n" +
    "- CRITICAL codes if violated: missing_aircraft (no clear jet in frame), interior_staircase (indoor building stairs / stairwell), " +
    "no_tarmac (no airport ground/runway markings), no_sky (no outdoor sky/horizon), no_boarding_stairs (no airstair at aircraft door).\n" +
    "- NEVER pass an image with only an interior staircase and no aircraft.\n"
  );
}

function isPrivateJetTarmacQaContext(userPrompt, finalPrompt) {
  const text = `${userPrompt || ""} ${finalPrompt || ""}`;
  return (
    /\b(PRIVATE JET TARMAC|JET TARMAC LOCK|JET TARMAC PLACE)\b/i.test(text) ||
    isPrivateJetBoardingPrompt(text)
  );
}

function buildPrivateJetTarmacRetryPrefix(issues) {
  const list = Array.isArray(issues)
    ? issues
        .map((item) => {
          if (!item) return "";
          if (typeof item === "string") return item.trim();
          return [item.code, item.detail].filter(Boolean).join(": ");
        })
        .filter(Boolean)
        .slice(0, 6)
        .join("; ")
    : "";
  return (
    "JET TARMAC QA FIX (mandatory): regenerate OUTDOOR airport tarmac scene with a clearly visible private jet (fuselage, wings, windows), " +
    "mobile boarding stairs against the aircraft door, visible sky, tarmac markings, safety cones. " +
    "Subject walks toward the jet or climbs the boarding stairs. " +
    "FORBIDDEN: interior building staircase, stairwell, corridor, room without aircraft. " +
    (list ? `Fix: ${list}. ` : "")
  );
}

module.exports = {
  isPrivateJetPrompt,
  isPrivateJetCabinPrompt,
  isPrivateJetBoardingPrompt,
  PRIVATE_JET_TARMAC_GUARD,
  PRIVATE_JET_TARMAC_CLARIFIER,
  PRIVATE_JET_TARMAC_PLACEMENT_HINT,
  buildPrivateJetTarmacPrompt,
  privateJetTarmacVisionQaBlock,
  isPrivateJetTarmacQaContext,
  buildPrivateJetTarmacRetryPrefix,
};
