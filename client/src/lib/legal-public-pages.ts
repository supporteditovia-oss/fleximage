import type { LegalDocument } from "@/lib/legal-content";

const CONTACT = "support.luxeflexia@gmail.com";
const LAST_UPDATED = "27 septembre 2026";

export const PUBLIC_LEGAL_LAST_UPDATED = `Dernière mise à jour : ${LAST_UPDATED}`;

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Conditions d'utilisation — LuxeFlexIA",
  sections: [
    {
      id: "intro",
      title: "1. Conditions d'utilisation",
      paragraphs: [
        "Les présentes conditions d'utilisation (« Conditions ») régissent l'accès et l'utilisation du site luxeflexia.com et des services LuxeFlexIA, édités par Tayfur Taskiran, auto-entrepreneur (SIRET 106 200 389 00018), 224 Rue de Charlieu, 42300 Roanne, France.",
        "En créant un compte, en vous connectant (y compris via Google ou OAuth réseaux sociaux) ou en utilisant le service, vous acceptez ces Conditions dans leur intégralité.",
      ],
    },
    {
      id: "service",
      title: "2. Description du service",
      paragraphs: [
        "LuxeFlexIA propose des outils de création de contenus (images, voix, vidéo) assistés par intelligence artificielle, ainsi que des fonctionnalités professionnelles de gestion et de publication sur les réseaux sociaux pour les utilisateurs autorisés.",
        "Certaines fonctionnalités peuvent nécessiter la connexion de comptes tiers (TikTok, Instagram, YouTube) via les interfaces officielles de ces plateformes.",
      ],
    },
    {
      id: "accounts",
      title: "3. Comptes utilisateurs",
      bullets: [
        {
          text: "Vous devez fournir des informations exactes et maintenir la confidentialité de vos identifiants.",
        },
        {
          text: "Vous êtes responsable de toute activité réalisée depuis votre compte LuxeFlexIA.",
        },
        {
          text: "La connexion de comptes sociaux s'effectue via OAuth ; LuxeFlexIA ne vous demande pas votre mot de passe TikTok, Instagram ou YouTube.",
        },
        {
          text: "Vous pouvez connecter plusieurs comptes par plateforme dans les limites techniques et contractuelles du service.",
        },
      ],
      bulletStyle: "disc",
    },
    {
      id: "responsibilities",
      title: "4. Responsabilités de l'utilisateur",
      bullets: [
        {
          text: "Respecter les lois applicables, les conditions des plateformes tierces et les droits des tiers (image, voix, marques, vie privée).",
        },
        {
          text: "Ne pas utiliser LuxeFlexIA pour harcèlement, fraude, usurpation d'identité, diffamation, contenus illicites ou trompeurs.",
        },
        {
          text: "Disposer des autorisations nécessaires sur les contenus importés, générés ou publiés via le service.",
        },
        {
          text: "Signaler sans délai toute compromission suspectée de compte à support.luxeflexia@gmail.com.",
        },
      ],
      bulletStyle: "disc",
    },
    {
      id: "ip",
      title: "5. Propriété intellectuelle",
      paragraphs: [
        "LuxeFlexIA, sa marque, son interface, ses textes et éléments graphiques restent la propriété de l'éditeur ou de ses concédants.",
        "Vous conservez vos droits sur les contenus que vous importez. Vous accordez à LuxeFlexIA une licence limitée de traitement de ces contenus uniquement pour exécuter le service (génération, stockage, publication demandée).",
        "Les résultats générés peuvent être soumis aux conditions d'utilisation des prestataires IA et des plateformes de diffusion ; vous restez responsable de leur exploitation.",
      ],
    },
    {
      id: "termination",
      title: "6. Résiliation",
      paragraphs: [
        "Vous pouvez cesser d'utiliser le service et demander la suppression de votre compte conformément à la politique de confidentialité.",
        "LuxeFlexIA peut suspendre ou résilier l'accès en cas de violation des Conditions, de risque de sécurité, d'impayé ou d'exigence légale, avec notification lorsque possible.",
        "La déconnexion d'un compte social depuis LuxeFlexIA révoque l'usage des tokens associés dans notre CRM ; cela ne supprime pas votre compte sur la plateforme tierce.",
      ],
    },
    {
      id: "liability",
      title: "7. Limitation de responsabilité",
      paragraphs: [
        "Le service est fourni « en l'état » dans les limites permises par la loi. LuxeFlexIA ne garantit pas un fonctionnement ininterrompu ni l'absence d'erreurs.",
        "LuxeFlexIA n'est pas responsable des décisions prises par les plateformes tierces (modération, reach, suspension de compte).",
      ],
    },
    {
      id: "law",
      title: "8. Droit applicable",
      paragraphs: [
        "Les présentes Conditions sont soumises au droit français. En cas de litige, les tribunaux compétents seront ceux du ressort du siège de l'éditeur, sous réserve des dispositions impératives protectrices du consommateur.",
      ],
    },
    {
      id: "contact",
      title: "9. Contact",
      paragraphs: [
        `Pour toute question relative à ces Conditions : ${CONTACT}.`,
        `Adresse : 224 Rue de Charlieu, 42300 Roanne, France.`,
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: "Politique de confidentialité — LuxeFlexIA",
  sections: [
    {
      id: "controller",
      title: "1. Responsable du traitement",
      paragraphs: [
        "Le responsable du traitement est Tayfur Taskiran, éditeur de LuxeFlexIA (luxeflexia.com), joignable à support.luxeflexia@gmail.com.",
      ],
    },
    {
      id: "collection",
      title: "2. Collecte des données",
      bullets: [
        {
          label: "Compte LuxeFlexIA",
          text: "adresse e-mail, identifiant, langue, statut d'abonnement, logs de connexion.",
        },
        {
          label: "Contenus",
          text: "images, audio, vidéos, prompts et historique de génération que vous importez ou créez.",
        },
        {
          label: "Paiement",
          text: "données de facturation via Stripe (nous ne stockons pas vos coordonnées bancaires complètes).",
        },
        {
          label: "Technique",
          text: "adresse IP, type de navigateur, journaux d'erreurs, événements de sécurité.",
        },
        {
          label: "Support",
          text: "messages et pièces jointes envoyés au support client.",
        },
      ],
      bulletStyle: "disc",
    },
    {
      id: "social",
      title: "3. Données des comptes TikTok, Instagram et YouTube",
      paragraphs: [
        "Lorsque vous connectez un compte social via OAuth (Login Kit TikTok, Meta / Instagram Graph, Google / YouTube Data API), nous recevons uniquement les données autorisées par vous et par la plateforme, typiquement :",
      ],
      bullets: [
        { text: "Identifiant unique du compte sur la plateforme." },
        { text: "Nom d'affichage et nom d'utilisateur (@)." },
        { text: "Photo de profil (URL)." },
        { text: "Jetons d'accès OAuth (stockés de manière chiffrée côté serveur, jamais exposés au navigateur)." },
        { text: "Métadonnées de session OAuth (scopes, date d'expiration)." },
        { text: "Statistiques ou métriques lorsque vous activez des fonctions d'analytics et que l'API plateforme les fournit." },
      ],
      bulletStyle: "disc",
    },
    {
      id: "purposes",
      title: "4. Finalités",
      bullets: [
        { text: "Fournir le service (génération IA, CRM, planification de publications)." },
        { text: "Authentifier et maintenir la connexion aux API officielles des réseaux sociaux." },
        { text: "Assurer la sécurité, prévenir les abus et la fraude." },
        { text: "Support client et amélioration du produit." },
        { text: "Respect des obligations légales et comptables." },
      ],
      bulletStyle: "disc",
    },
    {
      id: "cookies",
      title: "5. Cookies et stockage local",
      paragraphs: [
        "Nous utilisons des cookies et stockages locaux strictement nécessaires à l'authentification, la session administrateur, la langue et la sécurité.",
        "Des cookies analytics ou marketing non essentiels ne sont déposés qu'avec votre consentement lorsque la réglementation l'exige.",
        "Vous pouvez configurer votre navigateur pour refuser les cookies ; certaines fonctionnalités peuvent alors être indisponibles.",
      ],
    },
    {
      id: "gdpr",
      title: "6. RGPD — vos droits",
      paragraphs: [
        "Conformément au Règlement général sur la protection des données (UE 2016/679), vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité lorsque applicable.",
        "Pour exercer vos droits : support.luxeflexia@gmail.com. Réponse sous un mois sauf prolongation justifiée.",
        "Réclamation auprès de la CNIL (cnil.fr) si vous estimez que vos droits ne sont pas respectés.",
      ],
    },
    {
      id: "retention",
      title: "7. Conservation des données",
      bullets: [
        {
          label: "Compte",
          text: "pendant l'utilisation du service, puis suppression ou anonymisation dans un délai raisonnable après clôture.",
        },
        {
          label: "Tokens OAuth",
          text: "jusqu'à déconnexion du compte social ou suppression du compte LuxeFlexIA ; révocation côté plateforme recommandée.",
        },
        {
          label: "Contenus générés",
          text: "selon votre historique et paramètres de conservation, jusqu'à suppression par vous ou fermeture de compte.",
        },
        {
          label: "Facturation",
          text: "jusqu'à 10 ans pour obligations comptables.",
        },
        {
          label: "Logs",
          text: "jusqu'à 12 mois sauf investigation de sécurité.",
        },
      ],
      bulletStyle: "disc",
    },
    {
      id: "processors",
      title: "8. Sous-traitants",
      paragraphs: [
        "Nous faisons appel à des prestataires conformes (hébergement Vercel, base de données Supabase, paiement Stripe, API IA et API sociales) agissant selon nos instructions contractuelles.",
      ],
    },
    {
      id: "security",
      title: "9. Sécurité",
      paragraphs: [
        "Mesures techniques et organisationnelles appropriées (chiffrement des tokens OAuth, accès restreint, HTTPS). Aucun système n'étant infaillible, signalez tout incident suspect.",
      ],
    },
    {
      id: "contact",
      title: "10. Contact",
      paragraphs: [
        `Questions confidentialité : ${CONTACT}.`,
        PUBLIC_LEGAL_LAST_UPDATED,
      ],
    },
  ],
};
