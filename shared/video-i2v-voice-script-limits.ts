import { normalizeI2VDurationSec } from "./video-i2v-pricing";

/** Limites prononçables I2V — alignées backend + UI (évite voix > durée clip). */
export const I2V_VOICE_SCRIPT_MAX_CHARS_3S = 120;
export const I2V_VOICE_SCRIPT_MAX_CHARS_5S = 220;
export const I2V_VOICE_SCRIPT_MAX_WORDS_3S = 24;
export const I2V_VOICE_SCRIPT_MAX_WORDS_5S = 40;

export function maxVoiceCharsForI2VDuration(rawDurationSec?: unknown): number {
  const d = normalizeI2VDurationSec(rawDurationSec);
  return d === 3 ? I2V_VOICE_SCRIPT_MAX_CHARS_3S : I2V_VOICE_SCRIPT_MAX_CHARS_5S;
}

export function maxVoiceWordsForI2VDuration(rawDurationSec?: unknown): number {
  const d = normalizeI2VDurationSec(rawDurationSec);
  return d === 3 ? I2V_VOICE_SCRIPT_MAX_WORDS_3S : I2V_VOICE_SCRIPT_MAX_WORDS_5S;
}

export function countSpeakableWords(text: string): number {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function clampVoiceScriptToI2VLimit(
  text: string,
  rawDurationSec?: unknown,
): string {
  const max = maxVoiceCharsForI2VDuration(rawDurationSec);
  return String(text ?? "").slice(0, max);
}

export type I2VVoiceScriptLimitStatus = {
  durationSec: 3 | 5;
  maxChars: number;
  maxWords: number;
  charCount: number;
  wordCount: number;
  atCharLimit: boolean;
  overCharLimit: boolean;
  overWordLimit: boolean;
  showLimitWarning: boolean;
};

export function getI2VVoiceScriptLimitStatus(
  text: string,
  rawDurationSec?: unknown,
): I2VVoiceScriptLimitStatus {
  const durationSec = normalizeI2VDurationSec(rawDurationSec);
  const maxChars = maxVoiceCharsForI2VDuration(durationSec);
  const maxWords = maxVoiceWordsForI2VDuration(durationSec);
  const charCount = String(text ?? "").length;
  const wordCount = countSpeakableWords(text);
  const atCharLimit = charCount >= maxChars;
  const overCharLimit = charCount > maxChars;
  const overWordLimit = wordCount > maxWords;
  return {
    durationSec,
    maxChars,
    maxWords,
    charCount,
    wordCount,
    atCharLimit,
    overCharLimit,
    overWordLimit,
    showLimitWarning: atCharLimit || overCharLimit || overWordLimit,
  };
}
