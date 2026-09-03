export type VoiceCatalogCategory = "Rap";

export type VoiceCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  category: VoiceCatalogCategory;
  description: string;
  /** Browser speechSynthesis preview only (not the real clone). */
  pitch: number;
  rate: number;
};

/** Catalogue Voix IA — rappeurs français uniquement. */
export const VOICE_CATALOG: VoiceCatalogEntry[] = [
  { id: "maes", slug: "maes", name: "Maes", category: "Rap", description: "Rap FR — street", pitch: 0.78, rate: 0.95 },
  { id: "gims", slug: "gims", name: "Maître Gims", category: "Rap", description: "Pop urbaine", pitch: 0.88, rate: 1.0 },
  { id: "damso", slug: "damso", name: "Damso", category: "Rap", description: "Flow introspectif", pitch: 0.72, rate: 0.92 },
  { id: "ninho", slug: "ninho", name: "Ninho", category: "Rap", description: "Meltrap", pitch: 0.8, rate: 1.02 },
  { id: "booba", slug: "booba", name: "Booba", category: "Rap", description: "Légende du rap FR", pitch: 0.7, rate: 0.9 },
  { id: "jul", slug: "jul", name: "Jul", category: "Rap", description: "Marseille — energie", pitch: 0.82, rate: 1.06 },
  { id: "sch", slug: "sch", name: "SCH", category: "Rap", description: "Voix grave", pitch: 0.68, rate: 0.88 },
  { id: "gazo", slug: "gazo", name: "Gazo", category: "Rap", description: "Drill FR", pitch: 0.76, rate: 1.04 },
  { id: "niska", slug: "niska", name: "Niska", category: "Rap", description: "Trap Paris", pitch: 0.74, rate: 1.0 },
  { id: "plk", slug: "plk", name: "PLK", category: "Rap", description: "Cloud rap", pitch: 0.8, rate: 0.98 },
  { id: "klm", slug: "klm", name: "KLM", category: "Rap", description: "Rap drill", pitch: 0.77, rate: 1.05 },
  { id: "badbad", slug: "badbad", name: "BadBad", category: "Rap", description: "Rap nouvelle vague", pitch: 0.79, rate: 1.03 },
  { id: "kaaris", slug: "kaaris", name: "Kaaris", category: "Rap", description: "Trap hard", pitch: 0.69, rate: 0.94 },
  { id: "werenoi", slug: "werenoi", name: "Werenoi", category: "Rap", description: "Rap FR montant", pitch: 0.75, rate: 1.02 },
  { id: "sdm", slug: "sdm", name: "SDM", category: "Rap", description: "Rap Parisien", pitch: 0.73, rate: 1.0 },
  { id: "tiakola", slug: "tiakola", name: "Tiakola", category: "Rap", description: "Afro trap", pitch: 0.81, rate: 1.04 },
];

export function getVoiceCatalogEntry(id: string): VoiceCatalogEntry | undefined {
  return VOICE_CATALOG.find((v) => v.id === id || v.slug === id);
}

