/** Idées typewriter + pool aléatoire — Clonage IA (FR). */
export const VOICE_CLONE_TYPEWRITER_IDEAS: string[] = [
  "Salut, c'est Ninho — je t'aime bébé, reviens…",
  "Yo la team, petite dédicace pour mes frères…",
  "Bonjour, j'espère que tu passes une excellente journée…",
  "Écoute bien : ce message c'est pour toi…",
];

export const VOICE_CLONE_RANDOM_PROMPTS: string[] = [
  "Salut, c'est moi — petite blague pour mon pote, reviens me voir ce soir.",
  "Yo, dédicace à toute la team, vous me manquez grave.",
  "Bonjour, j'espère que tu vas bien — on se capte très vite.",
  "Salut bébé, je pensais à toi — appelle-moi quand tu peux.",
  "Écoute, j'ai un truc important à te dire…",
  "Petite vanne pour mon collègue : t'es le boss, mais t'arrives en retard.",
  "Coucou, message vocal rapide — bisous à toute la famille.",
];

export function pickVoiceCloneRandomPrompt(): string {
  const pool = VOICE_CLONE_RANDOM_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? "";
}
