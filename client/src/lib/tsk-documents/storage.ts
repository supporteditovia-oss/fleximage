import { createDefaultOrgSettings } from "./settings-defaults";
import { DEFAULT_MAINTENANCE_CONTRACT } from "./maintenance-defaults";
import type { TskDocumentsStore, TskProject } from "./types";
import { syncCounterYear } from "./numbering";

const STORAGE_KEY = "tsk-digital:store-v4";
const LEGACY_V3_KEY = "tsk-digital:store-v3";
const LEGACY_V2_KEY = "tsk-digital:store-v2";

function emptyCounters() {
  return syncCounterYear({
    year: new Date().getFullYear(),
    devis: 0,
    contrat: 0,
    facture_acompte: 0,
    facture_intermediaire: 0,
    facture_finale: 0,
    bon_livraison: 0,
    contrat_maintenance: 0,
  });
}

export function createEmptyStore(): TskDocumentsStore {
  return {
    version: 4,
    settings: createDefaultOrgSettings(),
    counters: emptyCounters(),
    projects: [],
    activeProjectId: null,
  };
}

function normalizeProject(p: Partial<TskProject>): TskProject {
  const defaults = createDefaultOrgSettings();
  return {
    id: p.id ?? crypto.randomUUID(),
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
    workflowStep: p.workflowStep ?? "quote_draft",
    client: p.client ?? {
      company: "",
      contactName: "",
      addressLine1: "",
      postalCode: "",
      city: "",
      email: "",
      phone: "",
    },
    projectTitle: p.projectTitle ?? "",
    projectDescription: p.projectDescription ?? "",
    lineItems: p.lineItems ?? [],
    vatRate: p.vatRate ?? defaults.defaultVatRate,
    quoteValidityDays: p.quoteValidityDays ?? defaults.defaultQuoteValidityDays,
    paymentTermsDays: p.paymentTermsDays ?? defaults.defaultPaymentTermsDays,
    issueDate: p.issueDate ?? new Date().toISOString().slice(0, 10),
    dueDate: p.dueDate ?? new Date().toISOString().slice(0, 10),
    deliveryDate: p.deliveryDate ?? new Date().toISOString().slice(0, 10),
    depositMode: p.depositMode ?? "percent_30",
    depositPercent: p.depositPercent ?? defaults.defaultDepositPercent,
    depositCustomAmountHt: p.depositCustomAmountHt ?? 0,
    depositInvoiceStatus: p.depositInvoiceStatus ?? "pending",
    useIntermediatePayment: p.useIntermediatePayment ?? true,
    intermediateMode: p.intermediateMode ?? "percent_40",
    intermediatePercent: p.intermediatePercent ?? defaults.defaultIntermediatePercent,
    intermediateCustomAmountHt: p.intermediateCustomAmountHt ?? 0,
    intermediateInvoiceStatus: p.intermediateInvoiceStatus ?? "pending",
    finalInvoiceStatus: p.finalInvoiceStatus ?? "pending",
    quoteNumber: p.quoteNumber ?? null,
    contractNumber: p.contractNumber ?? null,
    depositInvoiceNumber: p.depositInvoiceNumber ?? null,
    intermediateInvoiceNumber: p.intermediateInvoiceNumber ?? null,
    finalInvoiceNumber: p.finalInvoiceNumber ?? null,
    deliveryDocNumber: p.deliveryDocNumber ?? null,
    maintenanceContractNumber: p.maintenanceContractNumber ?? null,
    maintenancePriceHt: p.maintenancePriceHt ?? 290,
    maintenanceBilling: p.maintenanceBilling ?? "monthly",
    contractClauses: {
      ...defaults.contractClauses,
      ...p.contractClauses,
    },
    maintenanceContract: {
      ...DEFAULT_MAINTENANCE_CONTRACT,
      ...p.maintenanceContract,
    },
    deliveryChecklist: p.deliveryChecklist ?? "",
    deliveryNotes: p.deliveryNotes ?? "",
    notes: p.notes ?? "",
  };
}

function migrateFromLegacy(raw: unknown): TskDocumentsStore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const version = o.version;
  if (version !== 2 && version !== 3) return null;

  const store = createEmptyStore();
  const legacy = o as {
    version: 2 | 3;
    settings: Record<string, unknown>;
    counters: Record<string, number> & { year: number };
    projects: Partial<TskProject>[];
    activeProjectId: string | null;
  };

  store.settings = {
    ...createDefaultOrgSettings(),
    ...legacy.settings,
    maintenanceContract: {
      ...DEFAULT_MAINTENANCE_CONTRACT,
      ...(legacy.settings?.maintenanceContract as object),
    },
    contractClauses: {
      ...createDefaultOrgSettings().contractClauses,
      ...(legacy.settings?.contractClauses as object),
    },
  };

  const legacyCounters = legacy.counters as Record<string, number> & { year: number };
  store.counters = syncCounterYear({
    year: legacyCounters.year ?? new Date().getFullYear(),
    devis: legacyCounters.devis ?? 0,
    contrat: legacyCounters.contrat ?? 0,
    facture_acompte: legacyCounters.facture_acompte ?? 0,
    facture_intermediaire: legacyCounters.facture_intermediaire ?? 0,
    facture_finale:
      legacyCounters.facture_finale ?? legacyCounters.facture ?? 0,
    bon_livraison: legacyCounters.bon_livraison ?? 0,
    contrat_maintenance:
      legacyCounters.contrat_maintenance ?? legacyCounters.cgv ?? 0,
  });

  store.projects = (legacy.projects ?? []).map((p) => {
    const proj = p as TskProject & {
      finalInvoiceNumber?: string | null;
      maintenanceDocNumber?: string | null;
    };
    return normalizeProject({
      ...proj,
      maintenanceContractNumber:
        proj.maintenanceContractNumber ?? proj.maintenanceDocNumber ?? null,
      maintenanceContract: proj.maintenanceContract ?? DEFAULT_MAINTENANCE_CONTRACT,
    });
  });
  store.activeProjectId = legacy.activeProjectId;
  return store;
}

export function loadDocumentsStore(): TskDocumentsStore {
  if (typeof window === "undefined") return createEmptyStore();
  try {
    const rawV4 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV4) {
      const parsed = JSON.parse(rawV4) as TskDocumentsStore;
      if (parsed.version === 4) {
        return {
          ...parsed,
          counters: syncCounterYear(parsed.counters),
          projects: parsed.projects.map((p) => normalizeProject(p)),
        };
      }
    }
    for (const key of [LEGACY_V3_KEY, LEGACY_V2_KEY]) {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const migrated = migrateFromLegacy(JSON.parse(raw));
        if (migrated) return migrated;
      }
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
