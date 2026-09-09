/**
 * Règle globale de réalisme LuxeFlexIA — obligatoire par défaut sur toutes
 * les générations Nano Banana 2 (tous modèles, destinations, sujets, tenues).
 * Le résultat doit ressembler à une vraie photo smartphone prise spontanément
 * par un proche — jamais à une image IA, pub, mannequin, campagne mode ou 3D.
 */

const GLOBAL_REALISM_GUARD =
  "GLOBAL REALISM LOCK (mandatory default — every generation): " +
  "MUST look like a spontaneous personal photo by a friend on a premium smartphone — NEVER AI art, advertisement, mannequin catalog, fashion campaign, 3D render, or overly perfect image. " +
  "IDENTITY: keep EXACT reference identity — face shape, skin tone, eyes, nose, lips, jaw, hair, apparent age, silhouette, proportions; no smoothing, excessive beautify, symmetrize, face morph, plastic/waxy skin, beauty filter, doll-perfect eyes, fake lips. " +
  "SKIN/BODY/HAIR: visible pores, fine texture, natural micro-imperfections, facial micro-asymmetry, lip texture, light realistic under-eye circles, irregular hair strands; real anatomy — natural hands with five fingers, nails, wrists, arms, shoulders, legs, feet, coherent shoes; no deformed, duplicated, extra, too-long/thin, or impossible limbs. " +
  "POSE/ATTITUDE: pose from outfit + furniture + activity + location + moment — never random; every arm, hand and gaze has a realistic function; standing = weight on one leg, relaxed shoulders, natural imbalance; seated = comfortable stable hips/legs on seat, hands on cushion/table/glass/bag; elegant dress/gown = refined natural posture, legs together or ankles crossed, never wide-spread mannequin stance; streetwear = walk, pocket, phone, light lean; sport = credible action or rest with equipment; FORBIDDEN: mannequin pose, rigid frontal torso, unnaturally spread limbs, purposeless arms, stiff seated pose, impossible balance, exaggerated body language. " +
  "CLOTHING/OBJECTS: real fabric with folds, seams, tension, shadow zones, gravity; bags, watches, jewelry, phones, shoes, cars, yachts, tables, seats — correct scale, perspective, shadows, reflections, geometry; no invented foreground logos or unreadable text. " +
  "DECOR/LIGHT: geographically coherent realistic place; architecture, street, water, furniture, weather, sun and shadows match location; avoid too-clean/symmetric/perfect sets; signage distant, small, blurred or partially hidden; credible light — slightly imperfect exposure, natural shadows, logical reflections — no HDR, oversaturation, artificially blue sky/sea. " +
  "PHOTO STYLE: vertical 9:16 smartphone, friend/candid camera height, realistic perspective, slightly imperfect framing, subtle phone grain, natural depth of field — never studio/catalog look unless user explicitly requests it.";

/** Compact checklist injected into vision QA system prompt. */
const GLOBAL_REALISM_QA_CHECKLIST =
  "GLOBAL REALISM QA (mandatory before delivery):\n" +
  "1 IDENTITY: same face as reference — no morph, beauty filter, plastic/waxy skin, doll eyes, fake lips.\n" +
  "2 SKIN/BODY: pores, texture, micro-asymmetry; hands 5 fingers each; no deformed/duplicate/extra limbs.\n" +
  "3 POSE: outfit+furniture+activity+location coherent; comfortable, stable, occupied; no mannequin/catalog stance.\n" +
  "4 CLOTHING/OBJECTS: real fabric folds/gravity; props correct scale/perspective/shadows; no gibberish foreground text/logos.\n" +
  "5 DECOR/LIGHT: geographically coherent place; natural imperfect exposure/shadows; no HDR, oversaturation, fake blue sky/sea.\n" +
  "6 PHOTO STYLE: candid premium smartphone 9:16 — not studio, not catalog, not 3D, not ad campaign.\n" +
  "If ANY element looks artificial, deformed, too perfect, incoherent or AI-generated → critical=true, pass=false.\n";

const GLOBAL_REALISM_NEGATIVE_EXTRA =
  "image IA, rendu IA, look IA, publicité, pub, mannequin, campagne mode, catalogue mode, photo studio, rendu 3D, CGI, trop parfait, peau plastique, filtre beauté, visage cireux, symétrie parfaite, HDR excessif, saturation excessive, ciel artificiel, mer artificielle, pose mannequin, torse rigide, jambes écartées, bras sans fonction, équilibre impossible, logo inventé, texte illisible premier plan";

const GLOBAL_REALISM_QA_RETRY_PREFIX =
  "GLOBAL REALISM CORRECTION (mandatory): fix ONLY the listed defects. " +
  "Target: spontaneous premium smartphone photo by a friend — NOT AI, ad, mannequin, catalog, 3D, or overly perfect. " +
  "Restore exact reference identity, natural pores/skin, correct anatomy (5 fingers), believable pose for outfit+scene, real fabric folds, coherent decor/light, candid 9:16 framing. ";

function hasGlobalRealismGuard(text) {
  return /GLOBAL REALISM LOCK/i.test(String(text || ""));
}

function prependGlobalRealismGuard(text) {
  const base = String(text || "").trim();
  if (!base || hasGlobalRealismGuard(base)) return base;
  return `${GLOBAL_REALISM_GUARD} ${base}`;
}

/** Tronque à maxLen (défaut 2900 — limite OneShot). */
function finalizeProviderPrompt(prompt, maxLen = 2900) {
  let text = prependGlobalRealismGuard(String(prompt || "").trim());
  if (text.length > maxLen) text = text.slice(0, maxLen);
  return text;
}

module.exports = {
  GLOBAL_REALISM_GUARD,
  GLOBAL_REALISM_QA_CHECKLIST,
  GLOBAL_REALISM_NEGATIVE_EXTRA,
  GLOBAL_REALISM_QA_RETRY_PREFIX,
  hasGlobalRealismGuard,
  prependGlobalRealismGuard,
  finalizeProviderPrompt,
};
