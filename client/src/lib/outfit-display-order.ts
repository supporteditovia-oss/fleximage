import {
  getOutfitsByGender,
  type BuiltinOutfit,
  type OutfitGender,
} from "@/lib/builtin-outfit-templates";

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

type OrderState = Record<OutfitGender, string[]>;

let displayOrder: OrderState | null = null;
let orderVersion = 0;

function buildOrder(): OrderState {
  return {
    men: shuffleInPlace(getOutfitsByGender("men").map((outfit) => outfit.id)),
    women: shuffleInPlace(getOutfitsByGender("women").map((outfit) => outfit.id)),
  };
}

function ensureOrder(): OrderState {
  if (!displayOrder) {
    displayOrder = buildOrder();
    orderVersion += 1;
  }
  return displayOrder;
}

/** Nouvel ordre aléatoire (rechargement, fin de génération, bouton reset). */
export function reshuffleOutfitCatalog(): void {
  displayOrder = buildOrder();
  orderVersion += 1;
}

export function getOutfitCatalogOrderVersion(): number {
  ensureOrder();
  return orderVersion;
}

/** Tenues dans l'ordre d'affichage courant (stable tant qu'on ne reshuffle pas). */
export function getDisplayOutfitsByGender(gender: OutfitGender): BuiltinOutfit[] {
  const order = ensureOrder();
  const byId = new Map(
    getOutfitsByGender(gender).map((outfit) => [outfit.id, outfit] as const),
  );

  const seen = new Set<string>();
  const ordered: BuiltinOutfit[] = [];

  for (const id of order[gender]) {
    const outfit = byId.get(id);
    if (outfit) {
      ordered.push(outfit);
      seen.add(id);
    }
  }

  // Tenues ajoutées au catalogue après le dernier mélange.
  for (const outfit of byId.values()) {
    if (!seen.has(outfit.id)) ordered.push(outfit);
  }

  return ordered;
}
