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
