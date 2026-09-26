import { createDefaultOrgSettings, DEFAULT_CONTRACT_CLAUSES } from "./settings-defaults";
import { DEFAULT_MAINTENANCE_CONTRACT } from "./maintenance-defaults";
import { applySignatureSchedule } from "./project-schedule";
import type { TskClient, TskDocumentsStore, TskProject } from "./types";
import { syncCounterYear } from "./numbering";

const STORAGE_KEY = "tsk-digital:store-v5";
const LEGACY_V4_KEY = "tsk-digital:store-v4";
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
    facture_maintenance: 0,
  });
}

export function createEmptyStore(): TskDocumentsStore {
  return {
    version: 5,
    settings: createDefaultOrgSettings(),
    counters: emptyCounters(),
    projects: [],
    activeProjectId: null,
  };
}

function defaultClient(c?: Partial<TskClient>): TskClient {
  return {
    company: c?.company ?? "",
    contactName: c?.contactName ?? "",
    addressLine1: c?.addressLine1 ?? "",
    postalCode: c?.postalCode ?? "",
    city: c?.city ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    siret: c?.siret ?? "",
    vatNumber: c?.vatNumber ?? "",
  };
}

function normalizeProject(p: Partial<TskProject>): TskProject {
  const defaults = createDefaultOrgSettings();
  const sig = p.signatureDate ?? p.issueDate ?? new Date().toISOString().slice(0, 10);
  const schedule = applySignatureSchedule(sig, p.paymentTermsDays ?? defaults.defaultPaymentTermsDays);

  return {
    id: p.id ?? crypto.randomUUID(),
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
    workflowStep: p.workflowStep ?? "quote_draft",
    client: defaultClient(p.client),
    projectTitle: p.projectTitle ?? "",
    projectDescription: p.projectDescription ?? "",
    lineItems: p.lineItems ?? [],
    vatRate: p.vatRate ?? defaults.defaultVatRate,
    quoteValidityDays: p.quoteValidityDays ?? defaults.defaultQuoteValidityDays,
    paymentTermsDays: p.paymentTermsDays ?? defaults.defaultPaymentTermsDays,
    signatureDate: sig,
    intermediateInvoiceDate: p.intermediateInvoiceDate ?? schedule.intermediateInvoiceDate,
    deliveryDate: p.deliveryDate ?? schedule.deliveryDate,
    finalInvoiceDate: p.finalInvoiceDate ?? schedule.finalInvoiceDate,
    maintenanceContractDate: p.maintenanceContractDate ?? schedule.maintenanceContractDate,
    maintenanceInvoiceDate: p.maintenanceInvoiceDate ?? schedule.maintenanceInvoiceDate,
    issueDate: p.issueDate ?? sig,
    dueDate: p.dueDate ?? schedule.dueDate,
    depositMode: p.depositMode ?? "percent_30",
    depositPercent: p.depositPercent ?? defaults.defaultDepositPercent,
    depositCustomAmountHt: p.depositCustomAmountHt ?? 0,
    depositInvoiceStatus: p.depositInvoiceStatus ?? "pending",
    depositPaidAt: p.depositPaidAt ?? null,
    useIntermediatePayment: p.useIntermediatePayment ?? true,
    intermediateMode: p.intermediateMode ?? "percent_40",
    intermediatePercent: p.intermediatePercent ?? defaults.defaultIntermediatePercent,
    intermediateCustomAmountHt: p.intermediateCustomAmountHt ?? 0,
    intermediateMilestoneLabel:
      p.intermediateMilestoneLabel ?? "Recette intermédiaire & MEP staging",
    intermediateInvoiceStatus: p.intermediateInvoiceStatus ?? "pending",
    intermediatePaidAt: p.intermediatePaidAt ?? null,
    finalInvoiceStatus: p.finalInvoiceStatus ?? "pending",
    finalPaidAt: p.finalPaidAt ?? null,
    quoteNumber: p.quoteNumber ?? null,
    contractNumber: p.contractNumber ?? null,
    depositInvoiceNumber: p.depositInvoiceNumber ?? null,
    intermediateInvoiceNumber: p.intermediateInvoiceNumber ?? null,
    finalInvoiceNumber: p.finalInvoiceNumber ?? null,
    deliveryDocNumber: p.deliveryDocNumber ?? null,
    maintenanceContractNumber: p.maintenanceContractNumber ?? null,
    maintenanceInvoiceNumber: p.maintenanceInvoiceNumber ?? null,
    maintenancePriceHt: p.maintenancePriceHt ?? 290,
    maintenanceHourlyRateHt: p.maintenanceHourlyRateHt ?? 95,
    maintenanceBilling: p.maintenanceBilling ?? "monthly",
    contractClauses: {
      ...DEFAULT_CONTRACT_CLAUSES,
      ...defaults.contractClauses,
      ...p.contractClauses,
    },
    maintenanceContract: {
      ...DEFAULT_MAINTENANCE_CONTRACT,
      ...p.maintenanceContract,
    },
    deliveryUrlProduction: p.deliveryUrlProduction ?? "",
    deliveryUrlStaging: p.deliveryUrlStaging ?? "",
    deliveryTechnicalRef: p.deliveryTechnicalRef ?? "",
    deliveryReservesTemplate: p.deliveryReservesTemplate ?? "",
    deliveryChecklist: p.deliveryChecklist ?? "",
    deliveryNotes: p.deliveryNotes ?? "",
    notes: p.notes ?? "",
  };
}

function migrateSettings(raw: Record<string, unknown>) {
  const base = createDefaultOrgSettings();
  const merged = { ...base, ...raw } as typeof base;
  merged.legalForm = (raw.legalForm as string) ?? base.legalForm;
  merged.vatExempt293B = (raw.vatExempt293B as boolean) ?? base.vatExempt293B;
  merged.contractClauses = {
    ...DEFAULT_CONTRACT_CLAUSES,
    ...(raw.contractClauses as object),
  };
  merged.maintenanceContract = {
    ...DEFAULT_MAINTENANCE_CONTRACT,
    ...(raw.maintenanceContract as object),
  };
  return merged;
}

function migrateFromLegacy(raw: unknown): TskDocumentsStore | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const version = o.version;
  if (version !== 2 && version !== 3 && version !== 4) return null;

  const store = createEmptyStore();
  const legacy = o as {
    settings: Record<string, unknown>;
    counters: Record<string, number> & { year: number };
    projects: Partial<TskProject>[];
    activeProjectId: string | null;
  };

  store.settings = migrateSettings(legacy.settings);
  const c = legacy.counters;
  store.counters = syncCounterYear({
    year: c.year ?? new Date().getFullYear(),
    devis: c.devis ?? 0,
    contrat: c.contrat ?? 0,
    facture_acompte: c.facture_acompte ?? 0,
    facture_intermediaire: c.facture_intermediaire ?? 0,
    facture_finale: c.facture_finale ?? (c.facture as number) ?? 0,
    bon_livraison: c.bon_livraison ?? 0,
    contrat_maintenance: c.contrat_maintenance ?? (c.cgv as number) ?? 0,
    facture_maintenance: c.facture_maintenance ?? 0,
  });
  store.projects = (legacy.projects ?? []).map((p) => normalizeProject(p));
  store.activeProjectId = legacy.activeProjectId;
  return store;
}

export function loadDocumentsStore(): TskDocumentsStore {
  if (typeof window === "undefined") return createEmptyStore();
  try {
    const rawV5 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV5) {
      const parsed = JSON.parse(rawV5) as TskDocumentsStore;
      if (parsed.version === 5) {
        return {
          ...parsed,
          settings: migrateSettings(parsed.settings as unknown as Record<string, unknown>),
          counters: syncCounterYear(parsed.counters),
          projects: parsed.projects.map((p) => normalizeProject(p)),
        };
      }
    }
    for (const key of [LEGACY_V4_KEY, LEGACY_V3_KEY, LEGACY_V2_KEY]) {
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
