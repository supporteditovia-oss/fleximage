import type { LandingMarqueeImage } from "@/lib/landing-marquee-images";

/**
 * Construit deux listes exclusives à partir du catalogue lifestyle CDN
 * (media.larpking.com) — aucune image stock Unsplash / catalogue auto.
 * Haut et bas ne partagent aucune image.
 */
export function buildExclusiveHeroRows(
  cdnImages: LandingMarqueeImage[],
): { top: LandingMarqueeImage[]; bottom: LandingMarqueeImage[] } {
  if (cdnImages.length === 0) {
    return { top: [], bottom: [] };
  }

  // Alternance pour maximiser la variété thématique dans chaque rangée
  // tout en garantissant l'exclusivité totale.
  const top: LandingMarqueeImage[] = [];
  const bottom: LandingMarqueeImage[] = [];

  cdnImages.forEach((image, index) => {
    if (index % 2 === 0) {
      top.push(image);
    } else {
      bottom.push(image);
    }
  });

  // Si une rangée est trop courte, compléter avec le surplus de l'autre
  // sans jamais dupliquer une même image entre haut et bas.
  if (top.length === 0) {
    const mid = Math.ceil(bottom.length / 2);
    return { top: bottom.slice(0, mid), bottom: bottom.slice(mid) };
  }
  if (bottom.length === 0) {
    const mid = Math.ceil(top.length / 2);
    return { top: top.slice(0, mid), bottom: top.slice(mid) };
  }

  return { top, bottom };
}
