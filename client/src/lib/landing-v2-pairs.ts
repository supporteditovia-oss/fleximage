export type LandingComparePair = {
  id: string;
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
};

export const LANDING_V2_COMPARE_PAIRS: LandingComparePair[] = [
  {
    id: "driveway",
    beforeSrc: "/assets/v2-compare/driveway-before.jpg",
    afterSrc: "/assets/v2-compare/driveway-after.jpg",
    beforeAlt: "Photo originale d’une voiture sur une allée",
    afterAlt: "Transformation IA en berline de luxe",
  },
  {
    id: "garage",
    beforeSrc: "/assets/v2-compare/garage-before.jpg",
    afterSrc: "/assets/v2-compare/garage-after.jpg",
    beforeAlt: "Garage vide original",
    afterAlt: "Garage transformé par IA avec des voitures de luxe",
  },
  {
    id: "pump",
    beforeSrc: "/assets/v2-compare/pump-before.jpg",
    afterSrc: "/assets/v2-compare/pump-after.jpg",
    beforeAlt: "Voiture originale à la station-service",
    afterAlt: "Transformation IA en berline sportive",
  },
  {
    id: "esso",
    beforeSrc: "/assets/v2-compare/esso-before.jpg",
    afterSrc: "/assets/v2-compare/esso-after.jpg",
    beforeAlt: "Photo originale de nuit à la station",
    afterAlt: "Transformation IA en SUV de luxe",
  },
  {
    id: "dubai",
    beforeSrc: "/assets/v2-compare/dubai-before.jpg",
    afterSrc: "/assets/v2-compare/dubai-after.jpg",
    beforeAlt: "Selfie original",
    afterAlt: "Transformation IA à Dubaï",
  },
];

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function pickLandingCompareLayout(): {
  hero: LandingComparePair;
  gallery: LandingComparePair[];
} {
  const shuffled = shuffleInPlace([...LANDING_V2_COMPARE_PAIRS]);
  return {
    hero: shuffled[0],
    gallery: shuffled.slice(1, 3),
  };
}

/** Paire avant / après — une tuile de la grille Univers. */
export type LandingEditorialPair = {
  id: string;
  label: string;
  original: string;
  generated: string;
  generatedAlt: string;
  originalAlt: string;
};

/** 4 paires premium landing-editorial. */
export const LANDING_EDITORIAL_PAIRS: LandingEditorialPair[] = [
  {
    id: "resort-celebrity",
    label: "Célébrité",
    original: "/assets/landing-editorial/pair-1-before.jpg",
    generated: "/assets/landing-editorial/pair-1-after.jpg",
    originalAlt: "Photo originale — resort piscine",
    generatedAlt: "Scène backstage avec célébrité — généré par LuxeFlexIA",
  },
  {
    id: "ronaldo",
    label: "Lifestyle",
    original: "/assets/landing-editorial/pair-2-before.jpg",
    generated: "/assets/landing-editorial/pair-2-after.jpg",
    originalAlt: "Selfie original",
    generatedAlt: "Portrait avec Cristiano Ronaldo — généré par LuxeFlexIA",
  },
  {
    id: "maldives",
    label: "Voyage",
    original: "/assets/landing-editorial/pair-3-before.jpg",
    generated: "/assets/landing-editorial/pair-3-after.jpg",
    originalAlt: "Photo originale — soirée urbaine",
    generatedAlt: "Maldives — ponton overwater — généré par LuxeFlexIA",
  },
  {
    id: "paris",
    label: "Voyage",
    original: "/assets/landing-editorial/pair-4-before.jpg",
    generated: "/assets/landing-editorial/pair-4-after.jpg",
    originalAlt: "Selfie miroir original",
    generatedAlt: "Paris, Tour Eiffel — généré par LuxeFlexIA",
  },
];

function compareToEditorial(pair: LandingComparePair): LandingEditorialPair {
  return {
    id: pair.id,
    label: "Lifestyle",
    original: pair.beforeSrc,
    generated: pair.afterSrc,
    originalAlt: pair.beforeAlt,
    generatedAlt: pair.afterAlt,
  };
}

/** Pool complet — editorial + transformations v2-compare (9 paires). */
export const LANDING_EDITORIAL_POOL: LandingEditorialPair[] = [
  ...LANDING_EDITORIAL_PAIRS,
  ...LANDING_V2_COMPARE_PAIRS.map(compareToEditorial),
];

function pickUniquePoolIndices(
  count: number,
  exclude: ReadonlySet<number> = new Set(),
): number[] {
  const poolSize = LANDING_EDITORIAL_POOL.length;
  const candidates: number[] = [];
  for (let i = 0; i < poolSize; i += 1) {
    if (!exclude.has(i)) candidates.push(i);
  }
  const source =
    candidates.length >= count
      ? candidates
      : Array.from({ length: poolSize }, (_, i) => i);
  return shuffleInPlace([...source]).slice(0, count);
}

export type LandingEditorialTile = LandingEditorialPair;

export const EDITORIAL_GRID_POSITIONS = [
  "editorial-position-1",
  "editorial-position-2",
  "editorial-position-3",
  "editorial-position-4",
] as const;

export type LandingEditorialSlot = {
  position: (typeof EDITORIAL_GRID_POSITIONS)[number];
  /** Index dans LANDING_EDITORIAL_PAIRS — une paire par slot, jamais de doublon. */
  pairIndex: number;
  n: string;
};

export function createLandingEditorialSlots(): LandingEditorialSlot[] {
  const shuffledIndices = pickUniquePoolIndices(EDITORIAL_GRID_POSITIONS.length);
  return EDITORIAL_GRID_POSITIONS.map((position, index) => ({
    position,
    pairIndex: shuffledIndices[index] ?? index,
    n: String(index + 1).padStart(2, "0"),
  }));
}

/** Nouvelles paires aléatoires — évite de répéter le même set à chaque rotation. */
export function rotateEditorialPairIndices(indices: number[]): number[] {
  const exclude = new Set(indices);
  const next = pickUniquePoolIndices(indices.length, exclude);
  const unchanged =
    next.length === indices.length &&
    next.every((value, index) => value === indices[index]);
  if (!unchanged && new Set(next).size === next.length) {
    return next;
  }
  return pickUniquePoolIndices(indices.length);
}

export function editorialPairAt(pairIndex: number): LandingEditorialPair {
  const len = LANDING_EDITORIAL_POOL.length;
  const safe = ((pairIndex % len) + len) % len;
  return LANDING_EDITORIAL_POOL[safe]!;
}

/** @deprecated */
export function advanceEditorialPoolIndex(poolIndex: number): number {
  return rotateEditorialPairIndices([poolIndex])[0] ?? 0;
}

/** @deprecated */
export function editorialTileAt(poolIndex: number): LandingEditorialPair {
  return editorialPairAt(poolIndex);
}

export type LandingEditorialGridItem = LandingEditorialPair & {
  position: (typeof EDITORIAL_GRID_POSITIONS)[number];
  n: string;
};

/** Intervalle entre deux rotations synchronisées de la grille. */
export const LANDING_EDITORIAL_ROTATE_MS = 9000;

export function pickLandingEditorialGrid(
  count = 4,
  _previousIds: string[] = [],
): LandingEditorialGridItem[] {
  const slots = createLandingEditorialSlots();
  return slots.slice(0, count).map((slot) => {
    const pair = editorialPairAt(slot.pairIndex);
    return {
      ...pair,
      position: slot.position,
      n: slot.n,
    };
  });
}
