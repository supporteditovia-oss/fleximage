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

export function stripVoiceInstructionsFromPrompt(text: string): string {
  let cleaned = String(text || "").trim();
  if (!cleaned) return cleaned;

  for (const pattern of VOICE_INSTRUCTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  return cleaned
    .replace(/\s*[,;.\-–—]\s*[,;.\-–—]+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/(?:^|\s)[,.;:\-–—]+/g, " ")
    .trim()
    .replace(/[,.;:\-–—\s]+$/g, "")
    .trim();
}

const VEHICLE_DRIVING_PATTERN =
  /\b(voiture|car|auto|v[ée]hicule|vehicle|moto|cl[ée]|clef|key|volant|habitacle|cockpit|interieur|interior|dashboard|compteur|condui|driv|au volant|acc[ée]l|km\/h|kmh|remplace|swap|twingo|clio|urus|lambo|lamborghini|ferrari|porsche|bmw|mercedes|supercar|suv)\b/i;

export function isVehicleDrivingPrompt(text: string): boolean {
  return VEHICLE_DRIVING_PATTERN.test(text);
}

const V2V_PROMPT_TRANSFORM_PATTERN =
  /\b(int[ée]rieur|interior|habitacle|cockpit|dashboard|d[ée]cor|background|remplace|remplacer|swap|change|transforme|transformer|mets|mettre|habille|habiller|style|look|tenue|outfit|objet|vehicle|voiture|v[ée]hicule)\b/i;

/** Miroir de api/_lib/video-studio.js resolveV2VProviderForStudio */
export function resolveV2VProviderForStudio(userPrompt: string): "runway_aleph" | "kling_motion" {
  const prompt = String(userPrompt || "").trim();
  if (!prompt) return "kling_motion";
  if (isVehicleDrivingPrompt(prompt)) return "kling_motion";
  if (V2V_PROMPT_TRANSFORM_PATTERN.test(prompt)) return "kling_motion";
  return "kling_motion";
}

export function finalizeV2VPromptForSubmit(
  prompt: string,
  preserveSourceVoice: boolean,
): string {
  const trimmed = prompt.trim();
  if (preserveSourceVoice) return trimmed;
  return stripVoiceInstructionsFromPrompt(trimmed);
}

/** Image → Vidéo : sans option voix payante, on retire les consignes audio du prompt. */
export function finalizeI2VMotionPromptForSubmit(
  prompt: string,
  voiceEnabled: boolean,
): string {
  const trimmed = prompt.trim();
  if (voiceEnabled) return trimmed;
  return stripVoiceInstructionsFromPrompt(trimmed);
}
