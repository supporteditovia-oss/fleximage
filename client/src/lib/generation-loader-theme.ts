const THEME_PALETTES = [
  {
    accent: "#e8c547",
    accentSoft: "#f0d875",
    accentDeep: "#a8841a",
    glow: "rgba(232, 197, 71, 0.42)",
    auroraA: "rgba(232, 197, 71, 0.22)",
    auroraB: "rgba(201, 162, 39, 0.12)",
  },
  {
    accent: "#e8a4b8",
    accentSoft: "#f5c6d0",
    accentDeep: "#c46b88",
    glow: "rgba(232, 164, 184, 0.42)",
    auroraA: "rgba(232, 164, 184, 0.2)",
    auroraB: "rgba(196, 107, 136, 0.1)",
  },
  {
    accent: "#d4b896",
    accentSoft: "#f5e6c8",
    accentDeep: "#9a7b55",
    glow: "rgba(212, 184, 150, 0.42)",
    auroraA: "rgba(245, 230, 200, 0.2)",
    auroraB: "rgba(154, 123, 85, 0.1)",
  },
  {
    accent: "#b8c5e0",
    accentSoft: "#e8edf5",
    accentDeep: "#7a8aaa",
    glow: "rgba(184, 197, 224, 0.42)",
    auroraA: "rgba(184, 197, 224, 0.2)",
    auroraB: "rgba(122, 138, 170, 0.1)",
  },
] as const;

export type GenerationLoaderTheme = (typeof THEME_PALETTES)[number];

function pickTheme(taskId: string): GenerationLoaderTheme {
  let hash = 0;
  for (let i = 0; i < taskId.length; i += 1) {
    hash = (hash + taskId.charCodeAt(i) * (i + 3)) % THEME_PALETTES.length;
  }
  return THEME_PALETTES[hash];
}

/** Thème verrouillé pour toute la durée d'une génération (pending → taskId). */
let lockedTheme: GenerationLoaderTheme | null = null;

export function acquireGenerationLoaderTheme(taskId: string): {
  theme: GenerationLoaderTheme;
  isContinuation: boolean;
} {
  const isContinuation = lockedTheme !== null;
  if (!lockedTheme) {
    lockedTheme = pickTheme(taskId);
  }
  return { theme: lockedTheme, isContinuation };
}

export function releaseGenerationLoaderTheme() {
  lockedTheme = null;
}
