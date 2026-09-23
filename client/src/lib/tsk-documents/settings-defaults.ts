import { TSK_BRAND, TSK_ISSUER_DEFAULTS } from "@/lib/tsk-brand/constants";
import { DEFAULT_MAINTENANCE_CONTRACT } from "./maintenance-defaults";
import type { TskContractClauses, TskOrgSettings } from "./types";

export const DEFAULT_CONTRACT_CLAUSES: TskContractClauses = {
  object:
    "Le présent contrat a pour objet la réalisation, pour le compte du Client, des prestations digitales décrites au devis n° {{DEVIS}} accepté et signé, incluant conception, développement, intégration et mise en ligne de la solution « {{PROJET}} ».",
  scope:
    "Périmètre : cadrage fonctionnel, design UI premium, développement front-end et back-end, intégration des contenus validés, recette, déploiement, passation et documentation. Les modules et fonctionnalités sont limités au devis. Toute extension fera l'objet d'un avenant chiffré.",
  deliverables:
    "Livrables : maquettes Figma validées, code source (dépôt Git), application déployée, guide d'administration, comptes et accès, exports de configuration. Remise par lien sécurisé ou support convenu.",
  schedule:
    "Phase 1 — Cadrage & design (S1–S2)\nPhase 2 — Développement (S3–S6)\nPhase 3 — Recette & mise en production (S7–S8)\nPlanning détaillé transmis par e-mail à la signature.",
  deliveryDelay:
    "Délai indicatif : huit (8) semaines à compter de l'acompte et de la remise des éléments client (contenus, accès, validations). Tout retard imputable au Client reporte le délai à due concurrence.",
  revisionsIncluded:
    "Deux (2) cycles de retours sur maquettes. Un (1) cycle de retours mineurs post-recette (textes, ajustements non structurels). Au-delà : facturation au taux journalier en vigueur.",
  clientObligations:
    "Fournir contenus, accès et validations sous cinq (5) jours ouvrés. Désigner un interlocuteur décisionnaire. Garantir la licéité des éléments transmis (textes, images, marques).",
  providerObligations:
    `${TSK_BRAND.name} réalise les prestations conformément aux règles de l'art, informe le Client de l'avancement, sécurise les environnements et documente les livrables.`,
  paymentTerms:
    "Acompte à la commande, facture intermédiaire le cas échéant, solde à la livraison. Paiement par virement sous {{DELAI}} jours. Coordonnées bancaires sur chaque facture.",
  latePayment:
    "Retard de paiement : pénalités au taux légal + indemnité forfaitaire de 40 € (L441-10 et D441-5 C. com.). Suspension possible des prestations jusqu'à régularisation.",
  intellectualProperty:
    "Cession des droits patrimoniaux sur les créations spécifiques au Client après paiement intégral. Outils, frameworks et méthodes restent la propriété de TSK Digital. Mention portfolio sauf opposition écrite.",
  confidentiality:
    "Confidentialité réciproque pendant la mission et cinq (5) ans après son terme.",
  maintenance:
    "Garantie de conformité : trente (30) jours après mise en production. Maintenance évolutive via contrat CM séparé.",
  termination:
    "Résiliation pour manquement grave non réparé sous quinze (15) jours après mise en demeure. Travaux réalisés dus au prorata.",
  forceMajeure:
    "Force majeure au sens de la jurisprudence française : aucune partie n'est responsable d'un manquement dû à un événement imprévisible et irrésistible.",
  applicableLaw:
    "Droit français. Tribunaux compétents du ressort de Roanne, sauf règle impérative contraire.",
};

export function createDefaultOrgSettings(): TskOrgSettings {
  return {
    logoDataUrl: "",
    company: TSK_ISSUER_DEFAULTS.company,
    addressLine1: TSK_ISSUER_DEFAULTS.addressLine1,
    postalCode: TSK_ISSUER_DEFAULTS.postalCode,
    city: TSK_ISSUER_DEFAULTS.city,
    email: TSK_ISSUER_DEFAULTS.email,
    phone: TSK_ISSUER_DEFAULTS.phone,
    siret: TSK_ISSUER_DEFAULTS.siret,
    vatNumber: TSK_ISSUER_DEFAULTS.vatNumber,
    iban: TSK_ISSUER_DEFAULTS.iban,
    bic: TSK_ISSUER_DEFAULTS.bic,
    defaultVatRate: TSK_ISSUER_DEFAULTS.defaultVatRate,
    defaultPaymentTermsDays: TSK_ISSUER_DEFAULTS.paymentTermsDays,
    defaultQuoteValidityDays: TSK_ISSUER_DEFAULTS.quoteValidityDays,
    defaultDepositPercent: TSK_ISSUER_DEFAULTS.defaultDepositPercent,
    defaultIntermediatePercent: TSK_ISSUER_DEFAULTS.defaultIntermediatePercent,
    paymentConditionsText:
      "Paiement par virement. Acompte {{ACOMPTE}} à la commande. Facture intermédiaire {{INTER}} si prévue au devis. Solde à la livraison. Devis valable {{VALIDITE}} jours.",
    signatureIssuerName: "Représentant TSK Digital",
    signatureIssuerTitle: "Direction — TSK Digital",
    contractClauses: { ...DEFAULT_CONTRACT_CLAUSES },
    maintenanceContract: { ...DEFAULT_MAINTENANCE_CONTRACT },
  };
}

export function issuerAddressLine2(settings: TskOrgSettings): string {
  return `${settings.postalCode} ${settings.city}`.trim();
}

export function interpolateLegalText(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
