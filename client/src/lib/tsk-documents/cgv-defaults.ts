import type { TskCgvSections } from "./types";

/** CGV complètes — modifiables dans Administration → Documents. */
export const DEFAULT_CGV_SECTIONS: TskCgvSections = {
  scope:
    "Les présentes Conditions Générales de Vente (CGV) s'appliquent à toutes les prestations proposées par TSK Digital : conception et développement de sites web, applications SaaS, automatisations, intégrations d'intelligence artificielle, branding digital et services associés. Toute commande implique l'acceptation sans réserve des CGV et du devis signé.",
  payments:
    "Sauf mention contraire, les prix sont exprimés en euros hors taxes. Le règlement s'effectue par virement bancaire aux coordonnées indiquées sur la facture. Aucun escompte n'est accordé pour paiement anticipé. TSK Digital se réserve le droit de suspendre toute prestation en cours en cas de retard de paiement.",
  deposit:
    "Un acompte est exigé au démarrage du projet, dont le montant est précisé sur le devis (généralement 30 % du montant HT). L'acompte vaut acceptation du devis et déclenchement du planning. En cas d'annulation par le Client après versement de l'acompte, celui-ci reste acquis à TSK Digital au titre des frais engagés.",
  deadlines:
    "Les délais de livraison sont indicatifs et courent à compter de la réception de l'acompte, des contenus et validations nécessaires. Tout retard imputable au Client (retard de contenu, validation tardive, changement de périmètre) entraîne un report équivalent sans pénalité pour TSK Digital.",
  liability:
    "TSK Digital est tenue à une obligation de moyens. Sa responsabilité est limitée au montant HT facturé au titre du projet concerné, hors dommages indirects (perte de chiffre d'affaires, perte de données due au Client, préjudice commercial). Le Client est seul responsable des contenus qu'il fournit et de leur conformité légale.",
  intellectualProperty:
    "Les livrables spécifiques (design, code, contenus produits par TSK Digital) deviennent la propriété du Client après paiement intégral. TSK Digital conserve la propriété de ses outils, frameworks, bibliothèques et savoir-faire généiques. Le Client garantit disposer des droits sur les éléments qu'il transmet.",
  hosting:
    "L'hébergement, le nom de domaine, les certificats SSL et les services cloud tiers ne sont inclus que s'ils figurent explicitement au devis. À défaut, ils restent à la charge du Client ou font l'objet d'un contrat de maintenance distinct.",
  maintenance:
    "La maintenance corrective et évolutive n'est incluse que si un contrat de maintenance est signé. Hors maintenance, toute intervention fait l'objet d'un devis. TSK Digital peut proposer une attestation ou un contrat de maintenance annuel (mises à jour, support, surveillance).",
  termination:
    "En cas de manquement grave non résolu sous quinze (15) jours après mise en demeure écrite, chaque partie peut résilier le contrat. Les prestations réalisées et frais engagés restent dus. En cas de résiliation à l'initiative du Client sans faute de TSK Digital, les sommes échues et le travail réalisé sont facturés au prorata.",
  confidentiality:
    "Les parties s'engagent à ne pas divulguer les informations confidentielles échangées dans le cadre de la relation commerciale, pendant la durée du contrat et cinq (5) ans après son terme.",
  applicableLaw:
    "Les CGV et les contrats associés sont soumis au droit français. En cas de litige, et à défaut de résolution amiable, compétence exclusive est attribuée aux tribunaux du ressort du siège social de TSK Digital, sauf disposition impérative contraire.",
};
