const VOICE_INSTRUCTION_PATTERNS = [
  /\b(mets?|mettre|ajoute|ajouter|garde|garder|conserve|conserver|int[èe]gre|int[èe]grer|with|add|keep|preserve|include)\s+(?:ma|mon|mes|ta|ton|tes|sa|son|ses|my|the|une?|la|le|les)?\s*(?:voix|voice|audio|son|sound|parole|paroles|speech|dialogue|narration)\b/gi,
  /\b(fais?|faire|g[ée]n[èe]re|g[ée]n[èe]rer|make|create|generate)\s+(?:une?|un|la|le|my|a)?\s*(?:voix|voice|audio|parole|speech)\b/gi,
  /\bvoix\s+(?:de|d['’]|of)\s+(?:femme|homme|meuf|mec|woman|man|girl|boy|celebrity|celebrit[ée])\b/gi,
  /\b(female|male|woman|man)\s+voice\b/gi,
  /\b(parle|parler|speak|talking|talk|dis\s+(?:que|qu['’]))\b/gi,
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
  /\b(voiture|car|auto|v[ée]hicule|vehicle|moto|urus|lambo|lamborghini|ferrari|porsche|bmw|mercedes|volant|habitacle|cockpit|interieur|interior|dashboard|compteur|condui|driv|au volant|acc[ée]l|km\/h|kmh)\b/i;

export function isVehicleDrivingPrompt(text: string): boolean {
  return VEHICLE_DRIVING_PATTERN.test(text);
}

export function finalizeV2VPromptForSubmit(
  prompt: string,
  preserveSourceVoice: boolean,
): string {
  const trimmed = prompt.trim();
  if (preserveSourceVoice) return trimmed;
  return stripVoiceInstructionsFromPrompt(trimmed);
}
