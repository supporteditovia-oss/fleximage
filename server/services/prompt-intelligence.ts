/**
 * Service local (Bun) — même logique que api/_lib/prompt-intelligence.js (prod Vercel).
 */
import {
  enrichPromptForGeneration,
  DEFAULT_GEMINI_PROMPT_MODEL,
} from "../../api/_lib/prompt-intelligence.js";

export { enrichPromptForGeneration, DEFAULT_GEMINI_PROMPT_MODEL };

export type PromptIntelligenceOptions = {
  locale?: string;
};
