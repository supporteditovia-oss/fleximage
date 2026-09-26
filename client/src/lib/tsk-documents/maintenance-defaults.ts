import type { TskMaintenanceContract } from "./types";

export const DEFAULT_MAINTENANCE_CONTRACT: TskMaintenanceContract = {
  duration:
    "12 mois, reconduction tacite par périodes de 12 mois, sauf dénonciation par e-mail avec préavis de trente (30) jours avant échéance.",
  support:
    "Assistance par e-mail en jours ouvrés (9 h–18 h). Point de contact unique. Escalade téléphonique sur rendez-vous pour incidents bloquants (P1).",
  updatesIncluded:
    "Correctifs de sécurité, mises à jour critiques des dépendances, compatibilité navigateurs majeurs (dernières versions N et N-1).",
  hosting:
    "Supervision de l'hébergement géré par TSK Digital : certificats SSL, monitoring, sauvegardes (voir politique ci-dessous).",
  renewal:
    "Indexation possible sur devis de renouvellement communiqué soixante (60) jours avant échéance. Le Client peut refuser le renouvellement dans les délais de préavis.",
  pricingTerms:
    "Tarif forfaitaire {{TARIF_HT}} HT / {{PERIODE}}, facturation à terme échu. Hors forfait : évolutions, refontes, contenus, formations supplémentaires (sur devis ou au taux horaire).",
  scope:
    "Maintenance corrective et préventive du site / application livrés au titre du contrat CT. Jusqu'à {{HEURES}} h d'intervention incluse par mois.",
  slaTable: `Niveau | Situation | Prise en compte (ouvré) | Rétablissement cible (ouvré)
P1 | Site production indisponible ou parcours critique bloqué | 4 h | 8 h
P2 | Fonction majeure dégradée, contournement partiel possible | 8 h | 24 h
P3 | Anomalie mineure, cosmétique, non bloquante | 2 j ouvrés | Best effort`,
  backupsPolicy:
    "Sauvegardes automatiques quotidiennes des fichiers et bases gérées par TSK Digital, rétention trente (30) jours, stockage Union européenne. Test de restauration documenté au minimum une (1) fois par an.",
  securityPolicy:
    "Application des correctifs de sécurité, surveillance des composants critiques, durcissement de base (HTTPS, en-têtes, comptes admin). Scans de vulnérabilité selon stack, au minimum trimestriel sur périmètre exposé.",
  performancePolicy:
    "Objectif de disponibilité 99,5 % / mois (hors maintenance planifiée et tiers). Suivi des Core Web Vitals sur page d'accueil ; alerte si régression majeure constatée.",
  exclusions:
    "Pannes hébergeur tiers, force majeure, modifications par le Client ou un tiers, obsolescence volontaire du navigateur, contenus non fournis par TSK, campagnes marketing, SEO éditorial, refonte graphique.",
  hourlyRateExtra:
    "Interventions hors forfait ou au-delà du quota mensuel : {{TAUX_HORAIRE}} HT/h, facturées sur FM ou devis complémentaire.",
  terminationRestitution:
    "Résiliation avec préavis de trente (30) jours fin de mois. Restitution des accès et exports disponibles sous quinze (15) jours ouvrés après règlement des FM impayées.",
};
