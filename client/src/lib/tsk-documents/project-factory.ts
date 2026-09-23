import { createDefaultOrgSettings } from "./settings-defaults";
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

export function newLineItem(label: string, unitPriceHt: number, qty = 1): TskLineItem {
  return { id: uid(), label, quantity: qty, unitPriceHt };
}

/** Projet démo réaliste — modifiable dans l'admin. */
export function createDemoProject(settings?: TskOrgSettings): TskProject {
  const s = settings ?? createDefaultOrgSettings();
  const now = new Date().toISOString();
  return {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    workflowStep: "quote_draft",
    client: {
      company: "Maison Dubois & Fils SAS",
      contactName: "Émilie Dubois",
      addressLine1: "12 avenue de la République",
      postalCode: "69002",
      city: "Lyon",
      email: "e.dubois@maisondubois.fr",
      phone: "06 12 34 56 78",
    },
    projectTitle: "Site vitrine premium & espace client",
    projectDescription:
      "Refonte complète de l'identité digitale : site vitrine haut de gamme, performances Core Web Vitals, CMS sur mesure, intégration CRM et parcours de devis en ligne.",
    lineItems: [
      newLineItem("Cadrage, UX/UI premium & design system Figma", 3200),
      newLineItem("Développement front-end (React) & CMS headless", 4800),
      newLineItem("Back-end, API, automatisations & intégration CRM", 2900),
      newLineItem("Recette, déploiement, SEO technique & formation", 1600),
    ],
    vatRate: s.defaultVatRate,
    quoteValidityDays: s.defaultQuoteValidityDays,
    paymentTermsDays: s.defaultPaymentTermsDays,
    issueDate: todayIso(),
    dueDate: addDaysIso(s.defaultPaymentTermsDays),
    deliveryDate: addDaysIso(56),
    depositMode: "percent_30",
    depositPercent: s.defaultDepositPercent,
    depositCustomAmountHt: 0,
    depositInvoiceStatus: "pending",
    useIntermediatePayment: true,
    intermediateMode: "percent_40",
    intermediatePercent: s.defaultIntermediatePercent,
    intermediateCustomAmountHt: 0,
    intermediateInvoiceStatus: "pending",
    finalInvoiceStatus: "pending",
    quoteNumber: null,
    contractNumber: null,
    depositInvoiceNumber: null,
    intermediateInvoiceNumber: null,
    finalInvoiceNumber: null,
    deliveryDocNumber: null,
    maintenanceContractNumber: null,
    maintenancePriceHt: 290,
    maintenanceBilling: "monthly",
    contractClauses: { ...s.contractClauses },
    maintenanceContract: { ...s.maintenanceContract },
    deliveryChecklist:
      "Mise en production du site sur l'URL convenue\nTests de parcours utilisateur validés\nFormation administrateur réalisée (1 session)\nRemise des accès CMS, hébergement et documentation\nConformité au périmètre du devis signé",
    deliveryNotes:
      "Le client reconnaît la réception des livrables listés ci-dessus. Passé un délai de huit (8) jours sans réserve écrite, la livraison sera réputée acceptée.",
    notes:
      "Prestation réalisée par TSK Digital — agence spécialisée sites premium, SaaS et IA.",
  };
}

export function createProject(settings?: TskOrgSettings): TskProject {
  return createDemoProject(settings);
}

export function touchProject(project: TskProject): TskProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

export const DEPOSIT_PRESETS = [
  { id: "percent_20" as const, label: "20 %", percent: 20 },
  { id: "percent_30" as const, label: "30 %", percent: 30 },
  { id: "percent_40" as const, label: "40 %", percent: 40 },
  { id: "percent_custom" as const, label: "% personnalisé", percent: 30 },
  { id: "amount_custom" as const, label: "Montant HT personnalisé", percent: 0 },
];
