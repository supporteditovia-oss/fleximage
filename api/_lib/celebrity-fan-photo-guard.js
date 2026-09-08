/**
 * Fan-made celebrity companion photos — e.g. Cristiano Ronaldo beside the user
 * at a parked luxury car / hotel entrance. Keeps both faces distinct, car stationary.
 */

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const NAMED_FIGURE_RE =
  /\b(ronaldo|cristiano\s*ronaldo|cr7|messi|lionel\s*messi|mbappe|kylian|neymar|benzema|pogba|zidane|beckham|maradona|pele|haaland|bellingham|modric|lewandowski|salah|de\s*bruyne|vinicius|kane|griezmann|macron|emmanuel\s*macron|rihanna|drake|travis\s*scott|elon|musk|booba|ninho|gims|jul|pnl|ademo|n\.o\.s\.?)\b/i;

const CELEBRITY_FAN_PHOTO_GUARD =
  "CELEBRITY FAN PHOTO (mandatory — clearly fictional fan-made AI content). " +
  "Build ONE new photoreal smartphone vertical 9:16 scene. " +
  "IDENTITY LOCK: the uploaded person is EXACTLY ONE copy — preserve face, skin tone, haircut, age, body proportions and every natural feature. Never clone, never merge, never replace with the celebrity. " +
  "CELEBRITY LOCK: the named public figure must be clearly visible, recognizable, and standing/sitting BESIDE the subject — distinct face, natural height difference, believable shoulder overlap, friendly relaxed expression. Never missing, never blended into the subject, never a generic lookalike. " +
  "SCENE: luxury setting as described — real architecture, warm lighting, polished pavement, discreet staff if any. " +
  "CAR LOCK: vehicle is PARKED and STATIONARY — both men stand beside it; driver's door may be open but nobody is driving. Dashboard may be on; digital speed MUST read 0 km/h. " +
  "FORBIDDEN: driving scene, moving traffic, phone-while-driving, solo driver image, empty car interior focus, impossible dashboard, distorted faces, plastic skin, duplicate people, text overlays, watermarks. " +
  "CAMERA: realistic third-person smartphone photo — slightly imperfect framing, natural skin pores, fine hair detail, realistic shadows, subtle phone grain. " +
  "HANDS/FEET: correct five fingers, realistic footwear, natural clothing folds and reflections. " +
  "LABEL: treat as fan-made AI content — never claim a real meet.";

const CELEBRITY_FAN_PHOTO_CLARIFIER =
  " (FAN PHOTO LOCK — critical: TWO distinct men beside a PARKED car; celebrity never fused with subject; speed 0 km/h; no driving; third-person phone realism; fan-made AI.)";

function isCelebrityFanPhotoPrompt(prompt) {
  const text = normalize(prompt);
  if (!NAMED_FIGURE_RE.test(text)) return false;

  const explicitFan =
    /\b(fan.?made|fan\s+photo|fan\s+selfie|clearly\s+fictional|fictional\s+fan|fan.?made\s+ai|contenu\s+fan|photo\s+fan|celebrity\s+must|recognizable\s+beside)\b/.test(
      text,
    );
  const besideParked =
    /\b(beside|next\s+to|a\s*cote|standing|debout|both\s+men| deux\s+hommes|porte\s+conducteur|driver['']?\s*s?\s*door|hotel\s+entrance|entree\s+d['']?hotel|blue\s+hour|heure\s+bleue|valet|private\s+hotel)\b/.test(
      text,
    );
  const parkedStill =
    /\b(parked|stationary|stationnaire|stationn|arrete|arrêt|0\s*km|speed\s+display|compteur|no\s+driving|not\s+driving|car\s+is\s+stationary|voiture\s+stationn)\b/.test(
      text,
    );
  const dubaiLuxury =
    /\b(dubai|hotel|h[oô]tel|luxury\s+car|voiture\s+de\s+luxe|supercar|premium\s+car)\b/.test(
      text,
    );
  const thirdPersonCam =
    /\b(third\s+person|tierce\s+personne|taken\s+by|smartphone\s+photo|phone\s+grain|9:16|vertical)\b/.test(
      text,
    );

  if (explicitFan) return true;
  if (besideParked && parkedStill) return true;
  if (besideParked && dubaiLuxury) return true;
  if (thirdPersonCam && besideParked && NAMED_FIGURE_RE.test(text)) return true;
  return false;
}

/** Standing fan photo beside car — NOT seated driver POV. */
function isCelebrityFanBesideCarPrompt(prompt) {
  return isCelebrityFanPhotoPrompt(prompt);
}

module.exports = {
  CELEBRITY_FAN_PHOTO_GUARD,
  CELEBRITY_FAN_PHOTO_CLARIFIER,
  isCelebrityFanPhotoPrompt,
  isCelebrityFanBesideCarPrompt,
  normalizeCelebrityFanText: normalize,
};
