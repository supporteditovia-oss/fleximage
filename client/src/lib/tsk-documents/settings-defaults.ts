import { TSK_BRAND, TSK_ISSUER_DEFAULTS } from "@/lib/tsk-brand/constants";
import { DEFAULT_CGV_SECTIONS } from "./cgv-defaults";
import type { TskContractClauses, TskOrgSettings } from "./types";

export const DEFAULT_CONTRACT_CLAUSES: TskContractClauses = {
  object:
    "Le présent contrat de prestation de services a pour objet la conception, le développement et la mise en ligne d'une solution digitale sur mesure pour le Client, conformément au devis n° {{DEVIS}} accepté et aux présentes conditions particulières.",
  scope:
    "Le périmètre comprend notamment : cadrage et atelier de lancement, architecture technique, design d'interface premium, développement front-end et back-end, intégration des contenus validés, configuration des environnements, recette, déploiement en production, passation et documentation. Les prestations détaillées et chiffrées figurent au devis. Toute évolution hors périmètre fera l'objet d'un avenant ou d'un devis complémentaire.",
  deliverables:
    "Livrables attendus : maquettes Figma validées, code source versionné (dépôt Git), site ou application déployée sur l'environnement convenu, guide d'administration, accès administrateur, exports de configuration. Les livrables sont remis au format numérique via lien sécurisé ou dépôt convenu avec le Client.",
  schedule:
    "Phase 1 — Cadrage & design (semaines 1 à 2) : atelier, wireframes, maquettes UI.\nPhase 2 — Développement (semaines 3 à 6) : intégration, fonctionnalités, contenus.\nPhase 3 — Recette & mise en ligne (semaines 7 à 8) : tests, corrections, production.\nUn calendrier détaillé est communiqué par e-mail à la signature.",
  deliveryDelay:
    "Le délai global estimé est de huit (8) semaines à compter de la réception de l'acompte, des accès techniques et des contenus nécessaires. Ce délai est indicatif et sera ajusté en cas de retard imputable au Client ou de modification du périmètre.",
  revisionsIncluded:
    "Sont incluses : deux (2) cycles de retours sur les maquettes, une (1) série de retours mineurs après recette (textes, ajustements visuels non structurels). Toute demande supplémentaire, refonte de parcours ou nouvelle fonctionnalité sera chiffrée séparément.",
  clientObligations:
    "Le Client fournit les contenus, accès (hébergement, API, comptes tiers) et validations dans un délai de cinq (5) jours ouvrés par défaut. Il désigne un interlocuteur unique habilité à valider les jalons. Il garantit la licéité des éléments transmis (textes, images, marques).",
  providerObligations:
    `${TSK_BRAND.name} mobilise les compétences nécessaires, informe le Client de l'avancement, alerte sans délai en cas de blocage, respecte les bonnes pratiques de sécurité et documente les livrables. Elle n'est pas responsable des indisponibilités des services tiers (hébergeur, Stripe, etc.) hors périmètre de maintenance.`,
  paymentTerms:
    "Acompte à la commande selon devis, solde à la livraison ou selon l'échéancier convenu. Paiement par virement bancaire. Les factures sont payables sous {{DELAI}} jours à compter de leur émission.",
  latePayment:
    "Tout retard entraîne l'application de pénalités de retard au taux légal en vigueur, ainsi que l'indemnité forfaitaire de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce). TSK Digital pourra suspendre les prestations jusqu'à régularisation.",
  intellectualProperty:
    "Les créations spécifiques réalisées pour le Client (design, code métier, contenus produits par TSK Digital) lui sont cédés après paiement intégral. TSK Digital conserve la propriété de ses outils, frameworks et méthodes. Les bibliothèques open source restent soumises à leurs licences. Mention portfolio sauf opposition écrite.",
  confidentiality:
    "Chaque partie s'engage à ne pas divulguer les informations confidentielles de l'autre, pendant la durée du contrat et cinq (5) ans après son terme.",
  maintenance:
    "La maintenance corrective et évolutive n'est pas incluse au-delà de la période de garantie de trente (30) jours suivant la mise en production (correction de bugs de non-conformité au périmètre validé). Un contrat de maintenance annuel peut être proposé séparément.",
  termination:
    "En cas de manquement grave non résolu sous quinze (15) jours après mise en demeure écrite, le contrat pourra être résilié. Les prestations réalisées et frais engagés restent dus. En cas de résiliation à l'initiative du Client sans faute de TSK Digital, les sommes dues au prorata des travaux réalisés seront facturées.",
  forceMajeure:
    "Aucune partie ne pourra être tenue responsable d'un manquement dû à un événement de force majeure (catastrophe naturelle, panne généralisée, guerre, grève légale, décision gouvernementale, cyberattaque massive indépendante de la diligence habituelle).",
  applicableLaw:
    "Le contrat est régi par le droit français. À défaut d'accord amiable, compétence exclusive des tribunaux du ressort de Roanne, sauf règle impérative contraire.",
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
    paymentConditionsText:
      "Règlement par virement bancaire. Un acompte de 30 % est exigible à la commande pour lancer le planning. Le solde est dû à la livraison des livrables, sous {{DELAI}} jours à compter de la facture. Devis valable 30 jours.",
    signatureIssuerName: "Représentant TSK Digital",
    signatureIssuerTitle: "Direction — TSK Digital",
    contractClauses: { ...DEFAULT_CONTRACT_CLAUSES },
    cgvSections: { ...DEFAULT_CGV_SECTIONS },
    cgvNumber: null,
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
