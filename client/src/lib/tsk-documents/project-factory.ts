import { TSK_ISSUER_DEFAULTS } from "@/lib/tsk-brand/constants";
import {
  createDefaultOrgSettings,
  DEFAULT_CONTRACT_CLAUSES,
  DEFAULT_MAINTENANCE_TERMS,
} from "./settings-defaults";
import type { TskLineItem, TskOrgSettings, TskProject } from "./types";

function uid(): string {
  return crypto.randomUUID?.() ?? `tsk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function newLineItem(label = "Prestation"): TskLineItem {
  return { id: uid(), label, quantity: 1, unitPriceHt: 0 };
}

export function createProject(settings?: TskOrgSettings): TskProject {
  const s = settings ?? createDefaultOrgSettings();
  const now = new Date().toISOString();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    workflowStep: "quote_draft",
    client: {
      company: "",
      contactName: "",
      addressLine1: "",
      postalCode: "",
      city: "",
      email: "",
      phone: "",
    },
    projectTitle: "Projet digital",
    projectDescription:
      "Conception et développement d'une solution web premium (site, SaaS, automatisations ou intégrations IA).",
    lineItems: [newLineItem("Conception & développement")],
    vatRate: s.defaultVatRate,
    quoteValidityDays: s.defaultQuoteValidityDays,
    paymentTermsDays: s.defaultPaymentTermsDays,
    issueDate: todayIso(),
    dueDate: addDaysIso(s.defaultPaymentTermsDays),
    deliveryDate: addDaysIso(45),
    depositMode: "percent_30",
    depositPercent: s.defaultDepositPercent,
    depositCustomAmountHt: 0,
    depositInvoiceStatus: "pending",
    finalInvoiceStatus: "pending",
    quoteNumber: null,
    contractNumber: null,
    depositInvoiceNumber: null,
    finalInvoiceNumber: null,
    deliveryDocNumber: null,
    maintenanceDocNumber: null,
    contractClauses: { ...s.contractClauses },
    maintenanceTerms: { ...s.maintenanceTerms },
    deliveryChecklist:
      "Réception du site / application en production\nConformité au périmètre validé\nRecette acceptée\nAccès et livrables transmis",
    notes: "",
  };
}

export function touchProject(project: TskProject): TskProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

/** Migration helper label for default deposit from settings. */
export const DEPOSIT_PRESETS = [
  { id: "percent_20" as const, label: "20 %", percent: 20 },
  { id: "percent_30" as const, label: "30 %", percent: 30 },
  { id: "percent_40" as const, label: "40 %", percent: 40 },
  { id: "percent_custom" as const, label: "% personnalisé", percent: TSK_ISSUER_DEFAULTS.defaultDepositPercent },
  { id: "amount_custom" as const, label: "Montant HT personnalisé", percent: 0 },
];
