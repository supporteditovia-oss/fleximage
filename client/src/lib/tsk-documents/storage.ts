import { createDefaultOrgSettings } from "./settings-defaults";
import type { TskDocumentsStore, TskProject } from "./types";
import { syncCounterYear } from "./numbering";

const STORAGE_KEY = "tsk-digital:store-v2";

function emptyCounters() {
  return syncCounterYear({
    year: new Date().getFullYear(),
    devis: 0,
    contrat: 0,
    facture_acompte: 0,
    facture: 0,
    bon_livraison: 0,
    attestation_maintenance: 0,
  });
}

export function createEmptyStore(): TskDocumentsStore {
  return {
    version: 2,
    settings: createDefaultOrgSettings(),
    counters: emptyCounters(),
    projects: [],
    activeProjectId: null,
  };
}

export function loadDocumentsStore(): TskDocumentsStore {
  if (typeof window === "undefined") return createEmptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStore();
    const parsed = JSON.parse(raw) as TskDocumentsStore;
    if (parsed.version !== 2) return createEmptyStore();
    return {
      ...parsed,
      counters: syncCounterYear(parsed.counters),
    };
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
