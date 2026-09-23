import { TSK_BRAND, TSK_ISSUER_DEFAULTS } from "@/lib/tsk-brand/constants";
import type { TskContractClauses, TskMaintenanceTerms, TskOrgSettings } from "./types";

export const DEFAULT_CONTRACT_CLAUSES: TskContractClauses = {
  object:
    "Le présent contrat a pour objet la réalisation de prestations digitales au bénéfice du Client, incluant notamment la conception, le développement, l'intégration et la mise en ligne de la solution décrite au devis accepté.",
  scope:
    "Les prestations comprennent : analyse des besoins, design, développement, intégration des contenus fournis par le Client, recette, déploiement et passation. Toute prestation hors périmètre fera l'objet d'un devis complémentaire.",
  schedule:
    "Un planning indicatif est établi à la signature. Les jalons principaux (maquettes, développement, recette, mise en production) sont communiqués par e-mail.",
  deliveryDelay:
    "Le délai de livraison court à compter de la réception de l'acompte et de l'ensemble des éléments nécessaires (contenus, accès, validations).",
  revisionsIncluded:
    "Sont incluses deux (2) séries de retours sur les maquettes et une (1) série de retours mineurs après recette. Toute demande supplémentaire sera facturée au tarif en vigueur.",
  clientObligations:
    "Le Client fournit les contenus, accès et validations dans les délais convenus. Il désigne un interlocuteur décisionnaire. Tout retard du Client entraîne un report équivalent du planning.",
  providerObligations:
    `${TSK_BRAND.name} exécute les prestations avec diligence et conformément aux règles de l'art. Elle informe le Client de l'avancement et des points de blocage éventuels.`,
  paymentTerms:
    "Acompte à la commande, solde à la livraison ou selon échéancier du devis. Paiement par virement sous le délai indiqué sur la facture.",
  latePayment:
    "En cas de retard, des pénalités de retard au taux légal ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement pourront être appliquées (art. L441-10 et D441-5 du Code de commerce).",
  intellectualProperty:
    "Les livrables deviennent la propriété du Client après paiement intégral. TSK Digital conserve un droit de mention commerciale sauf opposition écrite. Les composants tiers restent soumis à leurs licences.",
  confidentiality:
    "Les parties s'engagent à garder confidentielles les informations échangées pendant la mission et pendant cinq (5) ans après sa fin.",
  termination:
    "En cas de manquement grave non résolu sous quinze (15) jours après mise en demeure, l'autre partie pourra résilier le contrat. Les prestations réalisées restent dues.",
  forceMajeure:
    "Aucune partie ne sera responsable d'un retard ou d'une inexécution due à un événement de force majeure au sens de la jurisprudence française.",
  applicableLaw:
    "Le contrat est soumis au droit français. Compétence exclusive des tribunaux du ressort du siège de TSK Digital, sauf disposition impérative contraire.",
};

export const DEFAULT_MAINTENANCE_TERMS: TskMaintenanceTerms = {
  duration: "12 mois à compter de la date de mise en production.",
  updatesIncluded:
    "Mises à jour de sécurité, corrections de bugs bloquants et compatibilité navigateurs majeurs.",
  support:
    "Support par e-mail en jours ouvrés (réponse sous 48 h ouvrées). Interventions hors périmètre sur devis.",
  hosting:
    "Hébergement et nom de domaine non inclus sauf mention expresse au contrat ou devis.",
  renewal:
    "Renouvellement par tacite reconduction annuelle sauf dénonciation par e-mail avec préavis de 30 jours.",
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
      "Paiement par virement bancaire. Acompte à la commande, solde à la livraison. Devis valable 30 jours sauf mention contraire.",
    signatureIssuerName: "TSK Digital",
    contractClauses: { ...DEFAULT_CONTRACT_CLAUSES },
    maintenanceTerms: { ...DEFAULT_MAINTENANCE_TERMS },
  };
}

export function issuerAddressLine2(settings: TskOrgSettings): string {
  return `${settings.postalCode} ${settings.city}`.trim();
}
