/**
 * Catalogue véhicules partagé (image + vidéo) — modèles OEM explicites.
 */

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
    .replace(/\bblack\s+badge\b/gi, "Black Badge");
}

const VEHICLE_MODEL_CATALOG = [
  {
    pattern:
      /\b(la\s+rose\s+noire|rose\s+noire)\b[\s\S]{0,40}\b(droptail)\b|\b(droptail)\b[\s\S]{0,40}\b(la\s+rose\s+noire|rose\s+noire)\b/i,
    model: "Rolls-Royce Coachbuild Droptail La Rose Noire",
    exterior:
      "two-seat Rolls-Royce Coachbuild Droptail La Rose Noire roadster with tapered boat-tail rear — NOT a four-door sedan, NOT Phantom/Ghost",
  },
  {
    pattern: /\b(droptail)\b/i,
    model: "Rolls-Royce Coachbuild Droptail",
    exterior: "Rolls-Royce Coachbuild Droptail two-seat roadster, boat-tail rear — never a generic black sedan",
  },
  {
    pattern: /\b(phantom)\b/i,
    model: "Rolls-Royce Phantom",
    exterior: "Rolls-Royce Phantom VIII luxury sedan — upright stately sedan, NOT Droptail roadster",
  },
  {
    pattern: /\b(ghost)\b/i,
    model: "Rolls-Royce Ghost",
    exterior: "Rolls-Royce Ghost luxury sedan",
  },
  {
    pattern: /\b(spectre)\b/i,
    model: "Rolls-Royce Spectre",
    exterior: "Rolls-Royce Spectre electric luxury coupe",
  },
  {
    pattern: /\b(cullinan)\b/i,
    model: "Rolls-Royce Cullinan",
    exterior: "Rolls-Royce Cullinan luxury SUV",
  },
  {
    pattern: /\b(urus)\b/i,
    model: "Lamborghini Urus",
    exterior: "Lamborghini Urus performance SUV — angular Lambo body, NOT a sedan",
  },
  {
    pattern: /\b(purosangue|puro[\s-]?sangue)\b/i,
    model: "Ferrari Purosangue",
    exterior: "Ferrari Purosangue four-seat SUV-coupe",
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
      model: "Lamborghini Urus Mansory",
      exterior: "Lamborghini Urus with Mansory widebody — still Urus-based SUV",
    };
  }
  for (const entry of VEHICLE_MODEL_CATALOG) {
    if (entry.pattern.test(source)) return entry;
  }
  if (/\bRolls-Royce\b/i.test(source)) {
    return {
      model: extractRollsRoyceModelPhrase(source),
      exterior:
        "authentic Rolls-Royce OEM body for that exact model phrase — correct body style (sedan, SUV, coupe, Droptail roadster)",
    };
  }
  return null;
}

/** Bloc prompt image (GEN LOCK + extérieur). */
function buildImageVehicleIdentityBlock(userPrompt) {
  const vehicle = extractRequestedVehicleModel(userPrompt);
  if (!vehicle) return "";
  const ext = vehicle.exterior
    ? ` EXTERIOR: ${vehicle.exterior}.`
    : "";
  return (
    ` (IMAGE VEHICLE LOCK: render ONLY ${vehicle.model}.${ext}` +
    " Never substitute a generic luxury sedan or wrong brand. Match real OEM proportions, grille, badges.)"
  );
}

module.exports = {
  normalizeVehicleSearchText,
  extractRequestedVehicleModel,
  buildImageVehicleIdentityBlock,
};
