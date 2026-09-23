import type { TskMaintenanceContract } from "./types";

export const DEFAULT_MAINTENANCE_CONTRACT: TskMaintenanceContract = {
  duration: "12 mois renouvelables tacitement, sauf dénonciation par e-mail avec préavis de 30 jours.",
  support:
    "Assistance par e-mail en jours ouvrés (9 h–18 h), délai de réponse cible sous 48 h ouvrées. Téléphone sur rendez-vous pour incidents bloquants.",
  updatesIncluded:
    "Mises à jour de sécurité, correctifs de bugs bloquants, compatibilité navigateurs majeurs et dépendances critiques du stack déployé.",
  hosting:
    "Supervision de l'hébergement convenu au contrat initial : disponibilité, certificats SSL, sauvegardes quotidiennes (si hébergement géré par TSK Digital).",
  renewal:
    "Reconduction annuelle par tacite reconduction. Indexation possible sur devis de renouvellement communiqué 60 jours avant échéance.",
  pricingTerms:
    "Tarif {{TARIF_HT}} HT / {{PERIODE}} — facturation à terme échu. Hors périmètre : évolutions fonctionnelles, refontes, contenus (sur devis).",
  scope:
    "Maintenance corrective et préventive du site / application livrés. Jusqu'à {{HEURES}} h d'intervention incluse par mois au-delà de laquelle un devis complémentaire s'applique.",
  sla:
    "Objectif de rétablissement service critique sous 24 h ouvrées après signalement validé. Exclut pannes hébergeur tiers ou force majeure.",
};
