export type VoiceCategory =
  | "Rap"
  | "Actrice"
  | "Cinéma"
  | "Musique"
  | "Sport"
  | "Politique"
  | "Business"
  | "Médias"
  | "Influenceur";

export type MockVoiceProfile = {
  id: string;
  name: string;
  description: string;
  durationLabel: string;
  isDefault?: boolean;
  catalog?: boolean;
  category?: VoiceCategory;
  initials?: string;
  accent?: string;
  /** Photo catalogue (optionnel). */
  photoUrl?: string;
  /** Phrase FIXE d’aperçu — jamais le texte utilisateur. */
  sampleText?: string;
  pitch?: number;
  rate?: number;
};

export type MockVoiceGeneration = {
  id: string;
  title: string;
  voiceName: string;
  textPreview: string;
  durationLabel: string;
  createdAt: string;
  waveformSeed: number;
};

export type ClonedVoice = {
  id: string;
  name: string;
  source: "record" | "import";
  sourceLabel: string;
  createdAt: string;
};

/** Sample catalogue uniquement — court, neutre, non personnalisable. */
export const CATALOG_SAMPLE_LINE =
  "Aperçu LuxeFlexIA. Ceci est un extrait modèle, pas ton texte.";

const ACCENTS = [
  "linear-gradient(145deg, #1a1a1a, #5c4a2a)",
  "linear-gradient(145deg, #3d2a45, #c9a227)",
  "linear-gradient(145deg, #0f2a1f, #8b6914)",
  "linear-gradient(145deg, #4a3428, #d4af37)",
  "linear-gradient(145deg, #1e2430, #6b5a3a)",
  "linear-gradient(145deg, #2a1f28, #b78b32)",
  "linear-gradient(145deg, #1a1208, #c9a227)",
  "linear-gradient(145deg, #3a2218, #e8c56a)",
  "linear-gradient(145deg, #142028, #9a7b3a)",
  "linear-gradient(145deg, #2c1830, #d4af37)",
  "linear-gradient(145deg, #101818, #a89050)",
  "linear-gradient(145deg, #241810, #c9a227)",
];

type Seed = {
  slug: string;
  name: string;
  category: VoiceCategory;
  description: string;
  pitch: number;
  rate: number;
};

/** Photos validées manuellement — extension peut varier (jpg/png/webp). */
const MANUAL_PHOTO_FILES: Partial<Record<string, string>> = {
  maes: "maes.jpg",
  gazo: "gazo.webp",
  damso: "damso.webp",
  dadju: "dadju.png",
  klm: "klm.png",
  badbad: "badbad.jpg",
  kaaris: "kaaris.jpg",
  tiakola: "tiakola.jpg",
  ninho: "ninho.jpg",
  niska: "niska.jpg",
  werenoi: "werenoi.jpg",
  plk: "plk.jpg",
  sdm: "sdm.webp",
};

function catalogPhoto(slug: string): string {
  const file = MANUAL_PHOTO_FILES[slug] ?? `${slug}.jpg`;
  return `/assets/voice-catalog/${file}`;
}

/** Catalogue voix — noms publics + photo locale (script/fetch-voice-catalog-photos.mjs). */
const CATALOG_SEEDS: Seed[] = [
  // Rap
  { slug: "maes", name: "Maes", category: "Rap", description: "Rap FR — street", pitch: 0.78, rate: 0.95 },
  { slug: "gims", name: "Maître Gims", category: "Rap", description: "Pop urbaine", pitch: 0.88, rate: 1.0 },
  { slug: "damso", name: "Damso", category: "Rap", description: "Flow introspectif", pitch: 0.72, rate: 0.92 },
  { slug: "ninho", name: "Ninho", category: "Rap", description: "Meltrap", pitch: 0.8, rate: 1.02 },
  { slug: "booba", name: "Booba", category: "Rap", description: "Légende du rap FR", pitch: 0.7, rate: 0.9 },
  { slug: "jul", name: "Jul", category: "Rap", description: "Marseille — energie", pitch: 0.82, rate: 1.06 },
  { slug: "sch", name: "SCH", category: "Rap", description: "Voix grave", pitch: 0.68, rate: 0.88 },
  { slug: "gazo", name: "Gazo", category: "Rap", description: "Drill FR", pitch: 0.76, rate: 1.04 },
  { slug: "niska", name: "Niska", category: "Rap", description: "Trap Paris", pitch: 0.74, rate: 1.0 },
  { slug: "plk", name: "PLK", category: "Rap", description: "Cloud rap", pitch: 0.8, rate: 0.98 },
  { slug: "klm", name: "KLM", category: "Rap", description: "Rap drill", pitch: 0.77, rate: 1.05 },
  { slug: "badbad", name: "BadBad", category: "Rap", description: "Rap nouvelle vague", pitch: 0.79, rate: 1.03 },
  { slug: "kaaris", name: "Kaaris", category: "Rap", description: "Trap hard", pitch: 0.69, rate: 0.94 },
  { slug: "werenoi", name: "Werenoi", category: "Rap", description: "Rap FR montant", pitch: 0.75, rate: 1.02 },
  { slug: "sdm", name: "SDM", category: "Rap", description: "Rap Parisien", pitch: 0.73, rate: 1.0 },
  { slug: "tiakola", name: "Tiakola", category: "Rap", description: "Afro trap", pitch: 0.81, rate: 1.04 },
  // Actrice
  { slug: "marion", name: "Marion Cotillard", category: "Actrice", description: "Cinéma FR", pitch: 1.12, rate: 0.94 },
  { slug: "lea", name: "Léa Seydoux", category: "Actrice", description: "Élégante", pitch: 1.14, rate: 0.92 },
  { slug: "adele", name: "Adèle Exarchopoulos", category: "Actrice", description: "Naturelle", pitch: 1.1, rate: 0.96 },
  { slug: "audrey", name: "Audrey Tautou", category: "Actrice", description: "Douceur parisienne", pitch: 1.18, rate: 0.95 },
  { slug: "eva", name: "Eva Green", category: "Actrice", description: "Glamour sombre", pitch: 1.08, rate: 0.9 },
  { slug: "sophie", name: "Sophie Marceau", category: "Actrice", description: "Icône française", pitch: 1.16, rate: 0.93 },
  { slug: "juliette", name: "Juliette Binoche", category: "Actrice", description: "Voix posée", pitch: 1.1, rate: 0.88 },
  { slug: "camille", name: "Camille Cottin", category: "Actrice", description: "Comédie premium", pitch: 1.2, rate: 1.0 },
  { slug: "isabelle", name: "Isabelle Huppert", category: "Actrice", description: "Intensité", pitch: 1.06, rate: 0.9 },
  { slug: "virginie", name: "Virginie Efira", category: "Actrice", description: "Chaleureuse", pitch: 1.15, rate: 0.97 },
  // Cinéma
  { slug: "omar", name: "Omar Sy", category: "Cinéma", description: "Charisme", pitch: 0.9, rate: 0.95 },
  { slug: "vincent", name: "Vincent Cassel", category: "Cinéma", description: "Intense", pitch: 0.86, rate: 0.88 },
  { slug: "jean", name: "Jean Dujardin", category: "Cinéma", description: "Charme retro", pitch: 0.92, rate: 0.96 },
  { slug: "gilles", name: "Gilles Lellouche", category: "Cinéma", description: "Voix grave", pitch: 0.84, rate: 0.9 },
  { slug: "louis", name: "Louis Garrel", category: "Cinéma", description: "Jeune auteur", pitch: 0.94, rate: 0.98 },
  { slug: "francois", name: "François Cluzet", category: "Cinéma", description: "Narration", pitch: 0.88, rate: 0.9 },
  { slug: "reda", name: "Reda Kateb", category: "Cinéma", description: "Profondeur", pitch: 0.87, rate: 0.92 },
  { slug: "gerard", name: "Gérard Depardieu", category: "Cinéma", description: "Légende", pitch: 0.78, rate: 0.86 },
  // Musique
  { slug: "drake", name: "Drake", category: "Rap", description: "Hip-hop global", pitch: 0.85, rate: 0.98 },
  { slug: "travis", name: "Travis Scott", category: "Rap", description: "Trap US", pitch: 0.82, rate: 1.06 },
  { slug: "aya", name: "Aya Nakamura", category: "Musique", description: "Pop afro", pitch: 1.12, rate: 1.02 },
  { slug: "dadju", name: "Dadju", category: "Musique", description: "RnB FR", pitch: 0.9, rate: 1.0 },
  { slug: "central", name: "Central Cee", category: "Rap", description: "UK drill", pitch: 0.88, rate: 1.08 },
  { slug: "rihanna", name: "Rihanna", category: "Musique", description: "Pop icon", pitch: 1.1, rate: 0.96 },
  // Sport
  { slug: "mbappe", name: "Kylian Mbappé", category: "Sport", description: "Football", pitch: 0.95, rate: 1.05 },
  { slug: "ronaldo", name: "Cristiano Ronaldo", category: "Sport", description: "Football", pitch: 0.93, rate: 1.0 },
  { slug: "messi", name: "Lionel Messi", category: "Sport", description: "Football", pitch: 0.94, rate: 0.94 },
  // Influenceur
  { slug: "squeezie", name: "Squeezie", category: "Influenceur", description: "YouTube FR", pitch: 1.05, rate: 1.1 },
  { slug: "tibo", name: "Tibo InShape", category: "Influenceur", description: "Fitness FR", pitch: 0.96, rate: 1.06 },
  { slug: "lena", name: "Léna Situations", category: "Influenceur", description: "Lifestyle", pitch: 1.18, rate: 1.02 },
  { slug: "kim", name: "Kim Kardashian", category: "Influenceur", description: "Lifestyle US", pitch: 1.14, rate: 0.98 },
  // Médias
  { slug: "hanouna", name: "Cyril Hanouna", category: "Médias", description: "Talk-show TV", pitch: 1.0, rate: 1.08 },
  { slug: "nagui", name: "Nagui", category: "Médias", description: "Radio TV", pitch: 0.98, rate: 0.96 },
  { slug: "barthes", name: "Yann Barthès", category: "Médias", description: "Late night", pitch: 0.94, rate: 0.94 },
  { slug: "combal", name: "Camille Combal", category: "Médias", description: "Animateur TV", pitch: 0.96, rate: 1.0 },
  { slug: "salame", name: "Léa Salamé", category: "Médias", description: "Journaliste", pitch: 1.08, rate: 0.92 },
  { slug: "fogiel", name: "Marc-Olivier Fogiel", category: "Médias", description: "People TV", pitch: 1.02, rate: 1.0 },
  // Politique & Business
  { slug: "macron", name: "Emmanuel Macron", category: "Politique", description: "Président", pitch: 0.92, rate: 0.9 },
  { slug: "musk", name: "Elon Musk", category: "Business", description: "Tech & entreprise", pitch: 0.88, rate: 0.92 },
];

function initialsFrom(name: string): string {
  const parts = name.replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const MOCK_VOICE_CATALOG: MockVoiceProfile[] = CATALOG_SEEDS.map(
  (seed, index) => ({
    id: `cat-${seed.slug}`,
    name: seed.name,
    description: seed.description,
    durationLabel: "0:06",
    catalog: true,
    category: seed.category,
    initials: initialsFrom(seed.name),
    accent: ACCENTS[index % ACCENTS.length],
    photoUrl: catalogPhoto(seed.slug),
    sampleText: CATALOG_SAMPLE_LINE,
    pitch: seed.pitch,
    rate: seed.rate,
  }),
);

export const VOICE_CATALOG_FILTERS: Array<"Tous" | VoiceCategory> = [
  "Tous",
  "Rap",
  "Musique",
  "Actrice",
  "Cinéma",
  "Sport",
  "Politique",
  "Business",
  "Médias",
  "Influenceur",
];

export const MOCK_VOICE_PROFILES: MockVoiceProfile[] = [
  {
    id: "voice-1",
    name: "Voix principale",
    description: "Ton naturel — enregistrée",
    durationLabel: "0:24",
    isDefault: true,
  },
  {
    id: "voice-2",
    name: "Voix studio",
    description: "Importée — extrait net",
    durationLabel: "0:18",
  },
  ...MOCK_VOICE_CATALOG,
];

export const MOCK_VOICE_GENERATIONS: MockVoiceGeneration[] = [
  {
    id: "gen-1",
    title: "Accroche lifestyle",
    voiceName: "Voix principale",
    textPreview:
      "Ce soir, direction Dubai Marina. La suite est réservée, la soirée aussi.",
    durationLabel: "0:12",
    createdAt: "2026-08-26T18:40:00.000Z",
    waveformSeed: 11,
  },
  {
    id: "gen-2",
    title: "Story Snap",
    voiceName: "Voix studio",
    textPreview: "Nouvelle acquisition. Même énergie, autre niveau.",
    durationLabel: "0:08",
    createdAt: "2026-08-25T09:15:00.000Z",
    waveformSeed: 27,
  },
  {
    id: "gen-3",
    title: "Message premium",
    voiceName: "Voix principale",
    textPreview: "Merci pour votre confiance. On se retrouve très vite.",
    durationLabel: "0:15",
    createdAt: "2026-08-23T21:05:00.000Z",
    waveformSeed: 42,
  },
];

export function mockWaveformBars(seed: number, count = 48): number[] {
  const bars: number[] = [];
  let x = seed * 9301 + 49297;
  for (let i = 0; i < count; i += 1) {
    x = (x * 233280 + 49297) % 233280;
    const t = i / count;
    const envelope = 0.35 + Math.sin(t * Math.PI) * 0.55;
    const noise = (x % 1000) / 1000;
    bars.push(Math.max(0.12, Math.min(1, envelope * (0.4 + noise * 0.9))));
  }
  return bars;
}

/**
 * Aperçu catalogue UNIQUEMENT.
 * Force toujours la phrase fixe — ignore tout texte custom passé par erreur.
 */
export function speakCatalogSample(
  profile: Pick<MockVoiceProfile, "name" | "pitch" | "rate">,
  onEnd?: () => void,
): () => void {
  return speakRaw(
    {
      text: CATALOG_SAMPLE_LINE,
      pitch: profile.pitch ?? 1,
      rate: profile.rate ?? 1,
    },
    onEnd,
  );
}

/**
 * Lecture d’un texte custom — à n’appeler QUE si l’utilisateur a payé / crédits.
 */
export function speakPaidCustomText(
  opts: { text: string; pitch?: number; rate?: number },
  onEnd?: () => void,
): () => void {
  const cleaned = opts.text.trim().slice(0, 220);
  if (!cleaned) {
    onEnd?.();
    return () => undefined;
  }
  return speakRaw(
    {
      text: cleaned,
      pitch: opts.pitch ?? 1,
      rate: opts.rate ?? 1,
    },
    onEnd,
  );
}

function speakRaw(
  opts: { text: string; pitch: number; rate: number },
  onEnd?: () => void,
): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return () => undefined;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(opts.text);
  utterance.lang = "fr-FR";
  utterance.pitch = opts.pitch;
  utterance.rate = opts.rate;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return () => {
    window.speechSynthesis.cancel();
  };
}

/** @deprecated use speakCatalogSample — ne pas parler de texte utilisateur. */
export function speakMockVoice(
  profile: Pick<MockVoiceProfile, "sampleText" | "pitch" | "rate" | "name">,
  onEnd?: () => void,
): () => void {
  return speakCatalogSample(profile, onEnd);
}
