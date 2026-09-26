import { createDefaultOrgSettings } from "./settings-defaults";
import { applySignatureSchedule } from "./project-schedule";
import type { TskLineItem, TskOrgSettings, TskProject } from "./types";

function uid(): string {
  return crypto.randomUUID?.() ?? `tsk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newLineItem(label: string, unitPriceHt: number, qty = 1): TskLineItem {
  return { id: uid(), label, quantity: qty, unitPriceHt };
}

/** Projet démo réaliste — dates workflow cohérentes, factures « À payer ». */
export function createDemoProject(settings?: TskOrgSettings): TskProject {
  const s = settings ?? createDefaultOrgSettings();
  const now = new Date().toISOString();
  const signatureDate = todayIso();
  const schedule = applySignatureSchedule(signatureDate, s.defaultPaymentTermsDays);

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
      siret: "",
      vatNumber: "",
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
    ...schedule,
    depositMode: "percent_30",
    depositPercent: s.defaultDepositPercent,
    depositCustomAmountHt: 0,
    depositInvoiceStatus: "pending",
    depositPaidAt: null,
    useIntermediatePayment: true,
    intermediateMode: "percent_40",
    intermediatePercent: s.defaultIntermediatePercent,
    intermediateCustomAmountHt: 0,
    intermediateMilestoneLabel: "Recette intermédiaire & MEP staging",
    intermediateInvoiceStatus: "pending",
    intermediatePaidAt: null,
    finalInvoiceStatus: "pending",
    finalPaidAt: null,
    quoteNumber: null,
    contractNumber: null,
    depositInvoiceNumber: null,
    intermediateInvoiceNumber: null,
    finalInvoiceNumber: null,
    deliveryDocNumber: null,
    maintenanceContractNumber: null,
    maintenanceInvoiceNumber: null,
    maintenancePriceHt: 290,
    maintenanceHourlyRateHt: 95,
    maintenanceBilling: "monthly",
    contractClauses: { ...s.contractClauses },
    maintenanceContract: { ...s.maintenanceContract },
    deliveryUrlProduction: "https://www.maisondubois.fr",
    deliveryUrlStaging: "https://staging.maisondubois.fr",
    deliveryTechnicalRef: "Git : main @ a1b2c3d · Build v1.0.0",
    deliveryReservesTemplate:
      "Réserves motivées (le cas échéant) :\n\n\n\nDate · Signature Client",
    deliveryChecklist:
      "Mise en production du site sur l'URL convenue\nTests de parcours utilisateur validés\nFormation administrateur réalisée (1 session)\nRemise des accès CMS, hébergement et documentation\nConformité au périmètre du devis signé",
    deliveryNotes:
      "Passé un délai de huit (8) jours ouvrés sans réserve écrite, la livraison sera réputée acceptée (cf. contrat CT).",
    notes:
      "Prestation réalisée par TSK Digital — Entrepreneur individuel — sites premium, SaaS et IA.",
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
