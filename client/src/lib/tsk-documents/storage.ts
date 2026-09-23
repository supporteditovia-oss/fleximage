import { createDefaultOrgSettings } from "./settings-defaults";
import type { TskDocumentsStore, TskProject } from "./types";
import { syncCounterYear } from "./numbering";

const STORAGE_KEY = "tsk-digital:store-v3";
const LEGACY_V2_KEY = "tsk-digital:store-v2";

function emptyCounters() {
  return syncCounterYear({
    year: new Date().getFullYear(),
    devis: 0,
    contrat: 0,
    facture_acompte: 0,
    facture: 0,
    bon_livraison: 0,
    cgv: 0,
  });
}

export function createEmptyStore(): TskDocumentsStore {
  return {
    version: 3,
    settings: createDefaultOrgSettings(),
    counters: emptyCounters(),
    projects: [],
    activeProjectId: null,
  };
}

function migrateLegacy(raw: unknown): TskDocumentsStore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version === 3) return o as TskDocumentsStore;
  if (o.version !== 2) return null;
  const store = createEmptyStore();
  const legacy = o as TskDocumentsStore & { version: 2 };
  store.settings = {
    ...createDefaultOrgSettings(),
    ...legacy.settings,
    cgvSections: createDefaultOrgSettings().cgvSections,
    cgvNumber: null,
    signatureIssuerTitle: "Direction — TSK Digital",
    contractClauses: {
      ...createDefaultOrgSettings().contractClauses,
      ...legacy.settings?.contractClauses,
    },
  };
  store.counters = syncCounterYear({
    ...emptyCounters(),
    ...legacy.counters,
    cgv: 0,
  });
  store.projects = (legacy.projects ?? []).map((p) => {
    const { maintenanceTerms: _m, maintenanceDocNumber: _n, ...rest } = p as TskProject & {
      maintenanceTerms?: unknown;
      maintenanceDocNumber?: string | null;
    };
    return {
      ...rest,
      deliveryNotes: rest.deliveryNotes ?? "",
      contractClauses: {
        ...createDefaultOrgSettings().contractClauses,
        ...rest.contractClauses,
      },
    };
  });
  store.activeProjectId = legacy.activeProjectId;
  return store;
}

export function loadDocumentsStore(): TskDocumentsStore {
  if (typeof window === "undefined") return createEmptyStore();
  try {
    const rawV3 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as TskDocumentsStore;
      if (parsed.version === 3) {
        return { ...parsed, counters: syncCounterYear(parsed.counters) };
      }
    }
    const rawV2 = window.localStorage.getItem(LEGACY_V2_KEY);
    if (rawV2) {
      const migrated = migrateLegacy(JSON.parse(rawV2));
      if (migrated) return migrated;
    }
    return createEmptyStore();
  } catch {
    return createEmptyStore();
  }
}

export function saveDocumentsStore(store: TskDocumentsStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getActiveProject(store: TskDocumentsStore): TskProject | null {
  if (!store.activeProjectId) return null;
  return store.projects.find((p) => p.id === store.activeProjectId) ?? null;
}

export function upsertProject(
  store: TskDocumentsStore,
  project: TskProject,
): TskDocumentsStore {
  const exists = store.projects.some((p) => p.id === project.id);
  const projects = exists
    ? store.projects.map((p) => (p.id === project.id ? project : p))
    : [...store.projects, project];
  return {
    ...store,
    projects,
    activeProjectId: project.id,
  };
}
