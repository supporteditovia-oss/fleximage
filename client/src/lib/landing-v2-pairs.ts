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

/** Tuile « Univers » landing — label éditorial + paire avant/après. */
export type LandingEditorialTile = {
  id: string;
  label: string;
  original: string;
  generated: string;
  generatedAlt: string;
};

const LANDING_EDITORIAL_POOL: LandingEditorialTile[] = [
  {
    id: "driveway",
    label: "Automobile",
    original: "/assets/v2-compare/driveway-before.jpg",
    generated: "/assets/v2-compare/driveway-after.jpg",
    generatedAlt: "Berline de luxe créée à partir d’une voiture sur une allée",
  },
  {
    id: "garage",
    label: "Lifestyle",
    original: "/assets/v2-compare/garage-before.jpg",
    generated: "/assets/v2-compare/garage-after.jpg",
    generatedAlt: "Garage transformé avec des voitures de prestige",
  },
  {
    id: "pump",
    label: "Automobile",
    original: "/assets/v2-compare/pump-before.jpg",
    generated: "/assets/v2-compare/pump-after.jpg",
    generatedAlt: "Berline sportive à la station-service",
  },
  {
    id: "esso",
    label: "Automobile",
    original: "/assets/v2-compare/esso-before.jpg",
    generated: "/assets/v2-compare/esso-after.jpg",
    generatedAlt: "SUV de luxe — transformation nocturne à la station",
  },
  {
    id: "dubai",
    label: "Voyage",
    original: "/assets/v2-compare/dubai-before.jpg",
    generated: "/assets/v2-compare/dubai-after.jpg",
    generatedAlt: "Portrait transformé en scène au volant à Dubaï",
  },
  {
    id: "portrait-car",
    label: "Lifestyle",
    original: "/assets/landing-v2/portrait-car-original.jpg",
    generated: "/assets/landing-v2/portrait-car-generated.jpg",
    generatedAlt: "Homme devant une supercar — scène lifestyle premium",
  },
];

const EDITORIAL_GRID_POSITIONS = [
  "editorial-position-1",
  "editorial-position-2",
  "editorial-position-3",
  "editorial-position-4",
] as const;

export type LandingEditorialGridItem = LandingEditorialTile & {
  position: (typeof EDITORIAL_GRID_POSITIONS)[number];
  n: string;
};

/** Mélange le pool et pioche N tuiles — photos différentes à chaque visite. */
export function pickLandingEditorialGrid(
  count = 4,
): LandingEditorialGridItem[] {
  const shuffled = shuffleInPlace([...LANDING_EDITORIAL_POOL]);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((item, i) => ({
    ...item,
    position: EDITORIAL_GRID_POSITIONS[i] ?? EDITORIAL_GRID_POSITIONS[0],
    n: String(i + 1).padStart(2, "0"),
  }));
}
