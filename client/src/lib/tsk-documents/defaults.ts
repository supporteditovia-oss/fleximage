import { TSK_ISSUER_DEFAULTS } from "@/lib/tsk-brand/constants";
import type { TskDocumentDraft, TskLineItem } from "./types";

const STORAGE_KEY = "tsk-digital:documents-draft-v1";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function newLine(): TskLineItem {
  return {
    id: crypto.randomUUID(),
    label: "Prestation",
    quantity: 1,
    unitPriceHt: 0,
  };
}

export function createDefaultDraft(kind: TskDocumentDraft["kind"] = "devis"): TskDocumentDraft {
  const ref = `TSK-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  return {
    kind,
    reference: ref,
    projectTitle: "Projet web premium",
    projectDescription:
      "Conception, développement et mise en production d'une solution digitale sur mesure.",
    issueDate: todayIso(),
    dueDate: addDaysIso(TSK_ISSUER_DEFAULTS.paymentTermsDays),
    vatRate: 20,
    depositPercent: 30,
    paymentTermsDays: TSK_ISSUER_DEFAULTS.paymentTermsDays,
    quoteValidityDays: TSK_ISSUER_DEFAULTS.quoteValidityDays,
    issuer: {
      company: TSK_ISSUER_DEFAULTS.company,
      addressLine1: TSK_ISSUER_DEFAULTS.addressLine1,
      addressLine2: TSK_ISSUER_DEFAULTS.addressLine2,
      email: TSK_ISSUER_DEFAULTS.email,
      phone: TSK_ISSUER_DEFAULTS.phone,
      siret: TSK_ISSUER_DEFAULTS.siret,
      vat: TSK_ISSUER_DEFAULTS.vat,
      iban: TSK_ISSUER_DEFAULTS.iban,
      bic: TSK_ISSUER_DEFAULTS.bic,
    },
    client: {
      company: "Client SAS",
      contactName: "Nom Prénom",
      addressLine1: "Adresse client",
      addressLine2: "Code postal · Ville",
      email: "client@example.com",
    },
    lineItems: [newLine()],
    contractScope:
      "Création du site / application, intégration des contenus validés, recette et mise en ligne. Hébergement et nom de domaine hors périmètre sauf mention contraire.",
    contractDuration: "Durée estimée : 6 à 10 semaines à compter de la réception de l'acompte et des éléments client.",
    validationChecklist:
      "Livraison conforme au cahier des charges validé\nRecette fonctionnelle effectuée\nFormation / passation réalisée\nAccès et livrables remis au client",
    notes: "",
  };
}

export function loadDraftFromStorage(): TskDocumentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TskDocumentDraft;
  } catch {
    return null;
  }
}

export function saveDraftToStorage(draft: TskDocumentDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function newLineItem(): TskLineItem {
  return newLine();
}
