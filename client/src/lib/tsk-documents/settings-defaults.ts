import { TSK_BRAND, TSK_ISSUER_DEFAULTS } from "@/lib/tsk-brand/constants";
import { DEFAULT_MAINTENANCE_CONTRACT } from "./maintenance-defaults";
import type { TskContractClauses, TskOrgSettings } from "./types";

export const DEFAULT_CONTRACT_CLAUSES: TskContractClauses = {
  documentHierarchy:
    "En cas de contradiction, l'ordre de priorité est : (1) le présent contrat et ses avenants signés ; (2) le devis n° {{DEVIS}} signé ; (3) les annexes numérotées (Annexe 1 — Cahier des charges) ; (4) les Conditions Générales de Vente TSK Digital.",
  object:
    "Le présent contrat a pour objet la réalisation, pour le compte du Client, des prestations digitales décrites au devis n° {{DEVIS}} accepté et signé, incluant conception, développement, intégration et mise en ligne de la solution « {{PROJET}} ».",
  scope:
    "Périmètre : cadrage fonctionnel, design UI premium, développement front-end et back-end, intégration des contenus validés, recette, déploiement, passation et documentation. Les modules et fonctionnalités sont limités au devis et à l'Annexe 1. Toute extension fera l'objet d'un avenant chiffré.",
  specificationsAnnex:
    "Annexe 1 — Cahier des charges (template)\n• Objectifs métier et publics cibles\n• Arborescence et parcours utilisateur\n• Fonctionnalités incluses / exclues\n• Intégrations (CRM, paiement, analytics)\n• Contraintes techniques (hébergement, navigateurs, accessibilité)\n• Critères d'acceptation par livrable\n• Contenus et assets à fournir par le Client (dates)\nCette annexe est signée conjointement avec le contrat et le devis.",
  deliverables:
    "Livrables : maquettes Figma validées, code source (dépôt Git), application déployée, guide d'administration, comptes et accès, exports de configuration. Remise par lien sécurisé ou support convenu.",
  schedule:
    "Phase 1 — Cadrage & design (S1–S2)\nPhase 2 — Développement (S3–S6)\nPhase 3 — Recette & mise en production (S7–S8)\nPlanning détaillé transmis par e-mail à la signature.",
  deliveryDelay:
    "Délai indicatif : huit (8) semaines à compter de l'acompte et de la remise des éléments client (contenus, accès, validations). Tout retard imputable au Client reporte le délai à due concurrence.",
  revisionsIncluded:
    "Deux (2) cycles de retours sur maquettes. Un (1) cycle de retours mineurs post-recette (textes, ajustements non structurels). Au-delà : facturation au taux horaire en vigueur.",
  acceptanceProcedure:
    "À réception des livrables (PV de livraison), le Client dispose de huit (8) jours ouvrés pour notifier par écrit toute réserve motivée. À défaut, la recette est réputée acquise. Les réserves non bloquantes n'empêchent pas la facturation du solde contractuel, sous réserve de correction dans les délais convenus. La facture de solde FS n° {{FS}} est exigible après recette ou expiration du délai.",
  clientObligations:
    "Fournir contenus, accès et validations sous cinq (5) jours ouvrés. Désigner un interlocuteur décisionnaire. Garantir la licéité des éléments transmis (textes, images, marques).",
  providerObligations:
    `${TSK_BRAND.name} réalise les prestations conformément aux règles de l'art, informe le Client de l'avancement, sécurise les environnements et documente les livrables.`,
  paymentTerms:
    "Acompte à la commande, facture intermédiaire le cas échéant, solde à la livraison après recette. Paiement par virement sous {{DELAI}} jours. Coordonnées bancaires sur chaque facture.",
  latePayment:
    "Retard de paiement : pénalités au taux légal + indemnité forfaitaire de 40 € (art. L441-10 et D441-5 C. com.). Suspension possible des prestations jusqu'à régularisation.",
  intellectualProperty:
    "Sous réserve du paiement intégral, TSK Digital cède au Client, pour le monde entier et pour la durée légale, les droits patrimoniaux d'exploitation sur les créations spécifiques (maquettes, code source, bases structurelles, contenus rédigés par TSK). Cession formalisée conformément à l'article L131-3 du CPI. Bibliothèques, frameworks et savoir-faire génériques restent la propriété de leurs auteurs. Mention portfolio sauf opposition écrite du Client.",
  gdprArticle28:
    "Lorsque TSK Digital traite des données personnelles pour le compte du Client, elle agit en qualité de sous-traitant (art. 28 RGPD). Un accord de traitement (DPA) précise finalités, durées, mesures de sécurité, sous-traitants ultérieurs et notification de violation. Le Client garantit la licéité des données transmises.",
  aiToolsClause:
    "Le Client est informé que certaines prestations peuvent mobiliser des outils d'IA générative. TSK Digital ne garantit pas l'exactitude des outputs IA ; le Client valide tout contenu publié. Aucune donnée personnelle identifiable n'est transmise à des services tiers sans accord écrit.",
  accountsAndLicenses:
    "Comptes et licences (nom de domaine, hébergement, CMS, plugins, polices, API SaaS) sont ouverts au nom du Client ou de TSK Digital selon devis. Le Client reste propriétaire des comptes ouverts à son nom. TSK Digital fournit la liste des abonnements et échéances à la livraison.",
  amendmentsProcedure:
    "Toute demande hors périmètre fait l'objet d'un devis d'avenant. TSK Digital peut suspendre les travaux impactés jusqu'à signature et, le cas échéant, paiement de l'acompte d'avenant. Les délais sont prolongés d'autant.",
  liabilityCap:
    "Obligation de moyens. Responsabilité de TSK Digital plafonnée au montant HT effectivement payé au titre du projet, hors faute lourde. Exclusion des dommages indirects (perte de CA, image, données non sauvegardées par le Client).",
  reversibility:
    "À la fin du contrat, sur demande et sous réserve du paiement intégral, TSK Digital remet sous quinze (15) jours ouvrés les exports disponibles (code, bases, médias fournis par le Client) et l'état des accès. Frais de réversibilité non inclus au devis facturés sur devis.",
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
    legalForm: "Entrepreneur individuel (EI)",
    addressLine1: TSK_ISSUER_DEFAULTS.addressLine1,
    postalCode: TSK_ISSUER_DEFAULTS.postalCode,
    city: TSK_ISSUER_DEFAULTS.city,
    email: TSK_ISSUER_DEFAULTS.email,
    phone: TSK_ISSUER_DEFAULTS.phone,
    siret: TSK_ISSUER_DEFAULTS.siret,
    vatNumber: "",
    vatExempt293B: false,
    iban: TSK_ISSUER_DEFAULTS.iban,
    bic: "",
    defaultVatRate: TSK_ISSUER_DEFAULTS.defaultVatRate,
    defaultPaymentTermsDays: TSK_ISSUER_DEFAULTS.paymentTermsDays,
    defaultQuoteValidityDays: TSK_ISSUER_DEFAULTS.quoteValidityDays,
    defaultDepositPercent: TSK_ISSUER_DEFAULTS.defaultDepositPercent,
    defaultIntermediatePercent: TSK_ISSUER_DEFAULTS.defaultIntermediatePercent,
    paymentConditionsText:
      "Paiement par virement sous {{DELAI}} jours. Acompte {{ACOMPTE}} à la commande. Facture intermédiaire {{INTER}} si prévue. Solde après recette (PV). Devis valable {{VALIDITE}} jours. Acceptation par signature et règlement de l'acompte.",
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
