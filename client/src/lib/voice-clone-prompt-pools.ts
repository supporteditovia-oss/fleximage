/** Idées typewriter + pool aléatoire — Clonage IA (FR). */
export const VOICE_CLONE_TYPEWRITER_IDEAS: string[] = [
  "Salut, grosse dédicace à toi, j'espère que tu vas bien…",
  "Yo, bienvenue sur ma chaîne, abonne-toi pour ne rien manquer…",
  "Merci à tous pour votre soutien, ça me touche énormément…",
  "Hey, j'ai une grande nouvelle à vous annoncer aujourd'hui…",
];

export const VOICE_CLONE_RANDOM_PROMPTS: string[] = [
  "Salut, grosse dédicace à toi, j'espère que tu vas bien",
  "Yo, bienvenue sur ma chaîne, abonne-toi pour ne rien manquer",
  "Merci à tous pour votre soutien, ça me touche énormément",
  "Hey, j'ai une grande nouvelle à vous annoncer aujourd'hui",
];

export function pickVoiceCloneRandomPrompt(): string {
  const pool = VOICE_CLONE_RANDOM_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? "";
}
