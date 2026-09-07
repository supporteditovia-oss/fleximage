/** Rôle d'une image de référence pour la génération multi-images. */
export type ImageReferenceRole = "identity" | "scene" | "outfit";

export type FaceFidelityLevel = "standard" | "elevated" | "maximum";

const ROLE_ORDER: ImageReferenceRole[] = ["identity", "outfit", "scene"];

export function normalizeFaceFidelity(
  value: unknown,
  hasIdentityRef: boolean,
): FaceFidelityLevel {
  const raw = String(value || "").toLowerCase();
  if (raw === "standard" || raw === "elevated" || raw === "maximum") {
    return raw;
  }
  return hasIdentityRef ? "maximum" : "standard";
}

/** Rôles par défaut selon le nombre de slots remplis (ordre UI). */
export function defaultUiRoles(filledCount: number): ImageReferenceRole[] {
  if (filledCount <= 1) return ["identity"];
  if (filledCount === 2) return ["scene", "identity"];
  return ["scene", "identity", "outfit"];
}

export function normalizeImageRoles(
  roles: unknown,
  slotCount: number,
): ImageReferenceRole[] {
  const valid = new Set<ImageReferenceRole>(["identity", "scene", "outfit"]);
  const parsed: ImageReferenceRole[] = [];
  if (Array.isArray(roles)) {
    for (const item of roles) {
      const role = String(item || "").toLowerCase() as ImageReferenceRole;
      if (valid.has(role)) parsed.push(role);
    }
  }
  while (parsed.length < slotCount) {
    const defaults = defaultUiRoles(Math.max(slotCount, parsed.length + 1));
    parsed.push(defaults[parsed.length] ?? "identity");
  }
  return parsed.slice(0, slotCount);
}

export type ReorderedReferenceImages<T> = {
  items: T[];
  roles: ImageReferenceRole[];
  /** Au moins identité + scène distinctes. */
  multiImageIdentityScene: boolean;
  hasOutfitRef: boolean;
  identityIndex: number;
  sceneIndex: number;
};

/**
 * Réordonne les uploads UI → ordre canonique API : identité, tenue?, scène.
 */
export function reorderReferenceImagesByRole<T>(
  items: T[],
  uiRoles: ImageReferenceRole[],
): ReorderedReferenceImages<T> {
  if (items.length === 0) {
    return {
      items: [],
      roles: [],
      multiImageIdentityScene: false,
      hasOutfitRef: false,
      identityIndex: -1,
      sceneIndex: -1,
    };
  }

  const roles = normalizeImageRoles(uiRoles, items.length);
  const buckets: Record<ImageReferenceRole, { item: T; uiIndex: number }[]> = {
    identity: [],
    outfit: [],
    scene: [],
  };

  items.forEach((item, uiIndex) => {
    const role = roles[uiIndex] ?? "identity";
    buckets[role].push({ item, uiIndex });
  });

  const ordered: T[] = [];
  const orderedRoles: ImageReferenceRole[] = [];
  for (const role of ROLE_ORDER) {
    for (const entry of buckets[role]) {
      ordered.push(entry.item);
      orderedRoles.push(role);
    }
  }

  const identityIndex = orderedRoles.indexOf("identity");
  const sceneIndex = orderedRoles.indexOf("scene");
  const hasOutfitRef = orderedRoles.includes("outfit");
  const multiImageIdentityScene =
    identityIndex >= 0 && sceneIndex >= 0 && items.length >= 2;

  return {
    items: ordered,
    roles: orderedRoles,
    multiImageIdentityScene,
    hasOutfitRef,
    identityIndex,
    sceneIndex,
  };
}
