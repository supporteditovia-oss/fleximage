/** @typedef {"identity"|"scene"|"outfit"} ImageReferenceRole */
/** @typedef {"standard"|"elevated"|"maximum"} FaceFidelityLevel */

const ROLE_ORDER = ["identity", "outfit", "scene"];

function defaultUiRoles(filledCount) {
  if (filledCount <= 1) return ["identity"];
  if (filledCount === 2) return ["scene", "identity"];
  return ["scene", "identity", "outfit"];
}

function normalizeImageRoles(roles, slotCount) {
  const valid = new Set(["identity", "scene", "outfit"]);
  const parsed = [];
  if (Array.isArray(roles)) {
    for (const item of roles) {
      const role = String(item || "").toLowerCase();
      if (valid.has(role)) parsed.push(role);
    }
  }
  while (parsed.length < slotCount) {
    const defaults = defaultUiRoles(Math.max(slotCount, parsed.length + 1));
    parsed.push(defaults[parsed.length] ?? "identity");
  }
  return parsed.slice(0, slotCount);
}

function normalizeFaceFidelity(value, hasIdentityRef) {
  const raw = String(value || "").toLowerCase();
  if (raw === "standard" || raw === "elevated" || raw === "maximum") {
    return raw;
  }
  return hasIdentityRef ? "maximum" : "standard";
}

function reorderReferenceImagesByRole(items, uiRoles) {
  if (!Array.isArray(items) || items.length === 0) {
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
  const buckets = { identity: [], outfit: [], scene: [] };

  items.forEach((item, uiIndex) => {
    const role = roles[uiIndex] ?? "identity";
    buckets[role].push({ item, uiIndex });
  });

  const ordered = [];
  const orderedRoles = [];
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

module.exports = {
  ROLE_ORDER,
  defaultUiRoles,
  normalizeImageRoles,
  normalizeFaceFidelity,
  reorderReferenceImagesByRole,
};
