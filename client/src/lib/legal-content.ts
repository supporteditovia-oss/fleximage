import {
  DEFAULT_LOCALE,
  type AppLocale,
  resolvePreferredLocale,
} from "@shared/locales";

export interface LegalBullet {
  label?: string;
  text: string;
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: LegalBullet[];
  bulletStyle?: "disc" | "none";
}

export interface LegalDocument {
  title: string;
  sections: LegalSection[];
}

export interface LegalLocaleContent {
  backHome: string;
  lastUpdated: string;
  docs: {
    cgu: LegalDocument;
    cgv: LegalDocument;
    privacy: LegalDocument;
    legalNotice: LegalDocument;
  };
}

const LEGAL_CONTENT: Record<AppLocale, LegalLocaleContent> = {
  fr: {
    backHome: "Retour a l'accueil",
    lastUpdated: "Derniere mise a jour : 13 mars 2026",
    docs: {
      cgu: {
        title: "Conditions Generales d'Utilisation",
        sections: [
          {
            id: "1",
            title: "1. Objet",
            paragraphs: [
              "Les presentes Conditions Generales d'Utilisation (CGU) definissent les modalites d'utilisation du service TurboPrank, accessible sur turboprank.com.",
              "Le service est edite par GUS, auto-entrepreneur (SIRET : 100 452 200 00015), 11 rue de Bourgogne, 38000 Grenoble, France.",
            ],
          },
          {
            id: "2",
            title: "2. Acceptation des CGU",
            paragraphs: [
              "L'inscription a TurboPrank implique l'acceptation pleine et entiere des presentes CGU.",
              "En utilisant le service, vous reconnaissez avoir lu ces conditions et les accepter sans reserve.",
            ],
          },
          {
            id: "3",
            title: "3. Description du service",
            paragraphs: [
              "TurboPrank est un service en ligne de generation d'images par intelligence artificielle a vocation humoristique.",
              "Le service propose une premiere generation gratuite avec filigrane. L'acces aux images sans filigrane et aux fonctions avancees est soumis a un abonnement payant (voir CGV).",
            ],
          },
          {
            id: "4",
            title: "4. Inscription et compte utilisateur",
            paragraphs: [
              "L'acces au service necessite la creation d'un compte. L'utilisateur s'engage a fournir des informations exactes et a conserver ses identifiants de maniere confidentielle.",
              "L'utilisateur peut supprimer son compte a tout moment depuis ses parametres ou en contactant prankturbo@gmail.com.",
            ],
          },
          {
            id: "5",
            title: "5. Utilisation responsable du service",
            paragraphs: [
              "L'utilisateur s'engage a respecter la legislation en vigueur. Les usages suivants sont strictement interdits :",
            ],
            bullets: [
              {
                label: "Utiliser l'image d'autrui sans consentement",
                text: "Il est interdit de soumettre la photo d'une personne tierce sans accord explicite.",
              },
              {
                label: "Atteinte aux droits d'auteur",
                text: "Toute utilisation de contenus proteges sans autorisation est interdite.",
              },
              {
                label: "Harcèlement ou nuisance",
                text: "La creation de contenus humiliants, menacants ou diffamatoires est interdite.",
              },
              {
                label: "Contenu illegal",
                text: "Sont notamment interdits : contenus pedopornographiques, haineux, violents, terroristes, injurieux ou diffamatoires.",
              },
              {
                label: "Deepfakes malveillants",
                text: "Il est interdit de creer des images trompeuses dans l'intention de nuire ou de manipuler.",
              },
              {
                label: "Fraude",
                text: "Toute usurpation d'identite, escroquerie ou autre activite illicite est interdite.",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Propriete intellectuelle",
            paragraphs: [
              "Le service TurboPrank, son interface, ses textes, graphismes et logiciels sont proteges par les lois relatives a la propriete intellectuelle.",
              "L'utilisateur conserve les droits sur les contenus qu'il soumet, sous reserve de respecter les presentes CGU et la legislation applicable.",
            ],
          },
          {
            id: "7",
            title: "7. Responsabilite de l'utilisateur",
            paragraphs: [
              "L'utilisateur est seul responsable des contenus soumis et des images generees.",
              "Il garantit disposer des droits necessaires sur ses contenus et s'engage a indemniser GUS en cas de reclamation de tiers.",
            ],
          },
          {
            id: "8",
            title: "8. Limitation de responsabilite de l'editeur",
            paragraphs: [
              "GUS ne peut etre tenu responsable des contenus generes par les utilisateurs.",
              "Le service est fourni en l'etat. GUS ne garantit pas une disponibilite continue et ininterrompue.",
              "En aucun cas GUS ne pourra etre responsable des dommages indirects, pertes de donnees, pertes de profit ou d'opportunites.",
            ],
          },
          {
            id: "9",
            title: "9. Modification des CGU",
            paragraphs: [
              "GUS se reserve le droit de modifier les presentes CGU a tout moment.",
              "L'utilisation continue du service apres modification vaut acceptation des nouvelles conditions.",
            ],
          },
          {
            id: "10",
            title: "10. Droit applicable et juridiction",
            paragraphs: [
              "Les presentes CGU sont soumises au droit francais.",
              "En cas de litige, et apres tentative de resolution amiable, les tribunaux competents de Grenoble seront seuls competents.",
            ],
          },
          {
            id: "11",
            title: "11. Contact",
            paragraphs: [
              "Pour toute question relative aux presentes CGU, contactez-nous a : prankturbo@gmail.com.",
            ],
          },
        ],
      },
      cgv: {
        title: "Conditions Generales de Vente",
        sections: [
          {
            id: "1",
            title: "1. Objet",
            paragraphs: [
              "Les presentes Conditions Generales de Vente (CGV) regissent la souscription et l'utilisation des services payants TurboPrank.",
              "Le service est edite par GUS, auto-entrepreneur (SIRET : 100 452 200 00015), 11 rue de Bourgogne, 38000 Grenoble, France.",
            ],
          },
          {
            id: "2",
            title: "2. Description du service",
            paragraphs: [
              "L'abonnement payant donne acces aux fonctionnalites suivantes :",
            ],
            bullets: [
              { text: "Images HD sans filigrane" },
              { text: "50 credits de generation par periode d'abonnement" },
              { text: "Acces a l'ensemble des templates disponibles" },
              { text: "Historique complet des generations" },
              { text: "Telechargement et partage des images" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Prix",
            paragraphs: [
              "Le prix de l'abonnement est de 4,90 EUR TTC par semaine.",
              "GUS se reserve le droit de modifier les prix a tout moment. Toute modification est applicable au prochain renouvellement.",
              "GUS beneficie de la franchise en base de TVA (article 293 B du CGI). TVA non applicable.",
            ],
          },
          {
            id: "4",
            title: "4. Modalites de souscription",
            paragraphs: [
              "La souscription s'effectue en ligne sur turboprank.com. Le paiement est securise via Stripe (PCI-DSS).",
              "L'abonnement est renouvele automatiquement chaque semaine.",
            ],
          },
          {
            id: "5",
            title: "5. Droit de retractation",
            paragraphs: [
              "Conformement a l'article L.221-28 du Code de la consommation, le droit de retractation ne peut pas etre exerce pour la fourniture de contenu numerique dont l'execution a commence avec l'accord du consommateur.",
              "Le delai de retractation de 14 jours reste applicable si aucun credit de generation n'a ete utilise.",
            ],
          },
          {
            id: "6",
            title: "6. Resiliation",
            paragraphs: [
              "L'utilisateur peut resilier son abonnement a tout moment depuis ses parametres ou par email a prankturbo@gmail.com.",
              "La resiliation prend effet a la fin de la periode en cours. Aucun remboursement au prorata n'est effectue.",
            ],
          },
          {
            id: "7",
            title: "7. Remboursements",
            paragraphs: [
              "Les demandes de remboursement peuvent etre adressees a prankturbo@gmail.com dans les 14 jours suivant la souscription, sous reserve qu'aucun credit n'ait ete consomme.",
              "Chaque demande est etudiee au cas par cas.",
            ],
          },
          {
            id: "8",
            title: "8. Responsabilite",
            paragraphs: [
              "GUS fournit le service avec diligence mais ne garantit pas une disponibilite continue et sans interruption.",
              "En cas d'indisponibilite prolongee, une compensation peut etre accordee au prorata.",
            ],
          },
          {
            id: "9",
            title: "9. Service client",
            paragraphs: [
              "Pour toute question sur l'abonnement, la facturation ou un remboursement, contactez : prankturbo@gmail.com.",
              "Nous nous engageons a repondre sous 48 heures.",
            ],
          },
          {
            id: "10",
            title: "10. Droit applicable et litiges",
            paragraphs: [
              "Les presentes CGV sont soumises au droit francais.",
              "En cas de litige, l'utilisateur peut recourir a un mediateur de la consommation (articles L.611-1 et suivants). A defaut d'accord amiable, les tribunaux de Grenoble sont seuls competents.",
            ],
          },
        ],
      },
      privacy: {
        title: "Politique de Confidentialite",
        sections: [
          {
            id: "1",
            title: "1. Responsable du traitement",
            paragraphs: [
              "Le responsable du traitement des donnees personnelles est :",
            ],
            bullets: [
              { label: "Nom", text: "GUS" },
              {
                label: "Statut",
                text: "Auto-entrepreneur (Entreprise Individuelle)",
              },
              { label: "SIRET", text: "100 452 200 00015" },
              {
                label: "Adresse",
                text: "11 rue de Bourgogne, 38000 Grenoble, France",
              },
              { label: "Email", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Donnees collectees",
            paragraphs: [
              "Dans le cadre du service TurboPrank, nous collectons :",
            ],
            bullets: [
              {
                label: "Donnees d'inscription",
                text: "adresse email, mot de passe (hashe)",
              },
              {
                label: "Donnees d'utilisation",
                text: "images soumises, images generees, historique, prompts textuels",
              },
              {
                label: "Donnees techniques",
                text: "adresse IP, type de navigateur, donnees de connexion",
              },
              {
                label: "Donnees de paiement",
                text: "traitees par Stripe ; nous ne stockons pas les donnees bancaires",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Finalites du traitement",
            bullets: [
              { text: "Fourniture et gestion du service TurboPrank" },
              { text: "Gestion des comptes utilisateurs" },
              { text: "Traitement des paiements et des abonnements" },
              { text: "Amelioration du service et de l'experience utilisateur" },
              { text: "Communication support et notifications de service" },
              { text: "Respect des obligations legales" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Base legale du traitement",
            bullets: [
              {
                label: "Execution du contrat",
                text: "traitement necessaire a la fourniture du service",
              },
              {
                label: "Consentement",
                text: "consentement donne lors de l'inscription et de l'acceptation des CGU",
              },
              {
                label: "Interet legitime",
                text: "amelioration du service, securite et prevention des abus",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Duree de conservation",
            bullets: [
              {
                label: "Donnees de compte",
                text: "pendant la duree d'inscription puis 3 ans apres suppression",
              },
              {
                label: "Images",
                text: "pendant la duree d'inscription, supprimees a la suppression du compte",
              },
              {
                label: "Donnees de paiement",
                text: "selon obligations legales (10 ans pour les donnees comptables)",
              },
              { label: "Logs techniques", text: "12 mois maximum" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Partage avec des tiers",
            paragraphs: [
              "Vos donnees peuvent etre partagees avec les sous-traitants necessaires au service :",
            ],
            bullets: [
              { text: "Supabase (authentification et base de donnees)" },
              { text: "Stripe (paiements)" },
              { text: "Cloudflare R2 (stockage des images)" },
              { text: "Kie.ai (generation d'images)" },
              { text: "Railway (hebergement du serveur)" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Cookies",
            paragraphs: [
              "TurboPrank utilise uniquement des cookies necessaires au fonctionnement du service (authentification, session).",
              "Aucun cookie publicitaire n'est utilise.",
            ],
          },
          {
            id: "8",
            title: "8. Vos droits (RGPD)",
            bullets: [
              { label: "Droit d'acces", text: "obtenir une copie de vos donnees" },
              { label: "Droit de rectification", text: "corriger des donnees inexactes" },
              { label: "Droit de suppression", text: "demander l'effacement" },
              {
                label: "Droit a la portabilite",
                text: "recevoir vos donnees dans un format structure",
              },
              {
                label: "Droit d'opposition",
                text: "vous opposer a certains traitements",
              },
              {
                label: "Droit a la limitation",
                text: "demander la suspension temporaire d'un traitement",
              },
            ],
            bulletStyle: "disc",
            paragraphs: [
              "Pour exercer ces droits : prankturbo@gmail.com. Reponse sous 30 jours.",
              "Vous pouvez aussi deposer une reclamation aupres de la CNIL : cnil.fr.",
            ],
          },
          {
            id: "9",
            title: "9. Securite",
            paragraphs: [
              "Nous mettons en place des mesures techniques et organisationnelles adaptees pour proteger vos donnees contre les acces non autorises, la modification, la divulgation ou la destruction.",
            ],
          },
          {
            id: "10",
            title: "10. Mise a jour de la politique",
            paragraphs: [
              "Cette politique peut etre modifiee a tout moment.",
              "Toute modification substantielle sera communiquee aux utilisateurs.",
            ],
          },
          {
            id: "11",
            title: "11. Contact",
            paragraphs: [
              "Pour toute question relative a la protection des donnees : prankturbo@gmail.com.",
            ],
          },
        ],
      },
      legalNotice: {
        title: "Mentions Legales",
        sections: [
          {
            id: "1",
            title: "1. Editeur du site",
            paragraphs: [
              "Le site turboprank.com est edite par :",
            ],
            bullets: [
              { label: "Nom", text: "GUS" },
              {
                label: "Statut",
                text: "Auto-entrepreneur (Entreprise Individuelle)",
              },
              { label: "SIRET", text: "100 452 200 00015" },
              {
                label: "Adresse",
                text: "11 rue de Bourgogne, 38000 Grenoble, France",
              },
              { label: "Email", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Directeur de la publication",
            paragraphs: [
              "Le directeur de la publication est GUS, joignable a l'adresse prankturbo@gmail.com.",
            ],
          },
          {
            id: "3",
            title: "3. Hebergeur",
            paragraphs: ["Le site est heberge par :"],
            bullets: [
              { label: "Nom", text: "Railway Corporation" },
              { label: "Site web", text: "railway.com" },
              {
                label: "Adresse",
                text: "548 Market Street, San Francisco, CA 94104, Etats-Unis",
              },
            ],
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Propriete intellectuelle",
            paragraphs: [
              "L'ensemble des contenus du site (textes, graphismes, images, logos, icones, logiciels) est protege par les lois francaises et internationales sur la propriete intellectuelle.",
              "Toute reproduction ou exploitation non autorisee est interdite et peut faire l'objet de poursuites.",
            ],
          },
          {
            id: "5",
            title: "5. Limitation de responsabilite",
            paragraphs: [
              "GUS s'efforce d'assurer l'exactitude des informations publiees, sans garantir l'absence totale d'erreur ou d'omission.",
              "L'editeur ne peut etre tenu responsable des dommages directs ou indirects lies a l'utilisation du site.",
            ],
          },
          {
            id: "6",
            title: "6. Contact",
            paragraphs: [
              "Pour toute question relative aux mentions legales : prankturbo@gmail.com.",
            ],
          },
        ],
      },
    },
  },
  en: {
    backHome: "Back to home",
    lastUpdated: "Last updated: March 13, 2026",
    docs: {
      cgu: {
        title: "Terms of Use",
        sections: [
          {
            id: "1",
            title: "1. Purpose",
            paragraphs: [
              "These Terms of Use define the conditions for using TurboPrank, available at turboprank.com.",
              "The service is operated by GUS, sole proprietor (SIRET: 100 452 200 00015), 11 rue de Bourgogne, 38000 Grenoble, France.",
            ],
          },
          {
            id: "2",
            title: "2. Acceptance",
            paragraphs: [
              "Creating an account implies full acceptance of these Terms.",
              "By using the service, you confirm that you have read and accepted these Terms without reservation.",
            ],
          },
          {
            id: "3",
            title: "3. Service description",
            paragraphs: [
              "TurboPrank is an online AI image generation service intended for humor and entertainment.",
              "The first generation can be free with a watermark. Access to unwatermarked images and advanced features requires a paid subscription (see Sales Terms).",
            ],
          },
          {
            id: "4",
            title: "4. Account registration",
            paragraphs: [
              "Access requires an account. You must provide accurate information and keep your credentials confidential.",
              "You may delete your account at any time from settings or by contacting prankturbo@gmail.com.",
            ],
          },
          {
            id: "5",
            title: "5. Responsible use",
            paragraphs: [
              "You agree to use the service in compliance with applicable laws. The following uses are strictly prohibited:",
            ],
            bullets: [
              {
                label: "Using third-party images without consent",
                text: "Submitting photos of other people without explicit permission is forbidden.",
              },
              {
                label: "Copyright infringement",
                text: "Using protected works, trademarks, or other protected content without authorization is forbidden.",
              },
              {
                label: "Harassment or abuse",
                text: "Humiliating, threatening, defamatory, or abusive content is forbidden.",
              },
              {
                label: "Illegal content",
                text: "Including but not limited to child sexual abuse content, hate content, violence, terrorism, or illegal defamation.",
              },
              {
                label: "Malicious deepfakes",
                text: "Creating misleading images to harm or manipulate others is forbidden.",
              },
              {
                label: "Fraud",
                text: "Identity theft, scams, and any unlawful activity are forbidden.",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Intellectual property",
            paragraphs: [
              "TurboPrank's interface, software, texts, and graphics are protected by intellectual property laws.",
              "You keep ownership of submitted content, subject to compliance with these Terms and applicable law.",
            ],
          },
          {
            id: "7",
            title: "7. User responsibility",
            paragraphs: [
              "You are solely responsible for submitted content and generated images.",
              "You warrant you hold all required rights and agree to indemnify GUS against third-party claims.",
            ],
          },
          {
            id: "8",
            title: "8. Limitation of liability",
            paragraphs: [
              "GUS cannot be held liable for user-generated content.",
              "The service is provided as is and availability is not guaranteed without interruption.",
              "GUS is not liable for indirect damages, loss of data, profits, or business opportunities.",
            ],
          },
          {
            id: "9",
            title: "9. Changes to terms",
            paragraphs: [
              "GUS may update these Terms at any time.",
              "Continued use after changes means you accept the updated Terms.",
            ],
          },
          {
            id: "10",
            title: "10. Governing law and jurisdiction",
            paragraphs: [
              "These Terms are governed by French law.",
              "In case of dispute, and after an attempt at amicable resolution, courts of Grenoble have exclusive jurisdiction.",
            ],
          },
          {
            id: "11",
            title: "11. Contact",
            paragraphs: [
              "For questions about these Terms, contact: prankturbo@gmail.com.",
            ],
          },
        ],
      },
      cgv: {
        title: "Sales Terms",
        sections: [
          {
            id: "1",
            title: "1. Purpose",
            paragraphs: [
              "These Sales Terms govern subscription and use of TurboPrank paid services.",
              "The service is operated by GUS, sole proprietor (SIRET: 100 452 200 00015), 11 rue de Bourgogne, 38000 Grenoble, France.",
            ],
          },
          {
            id: "2",
            title: "2. Service description",
            paragraphs: ["Paid subscription includes:"],
            bullets: [
              { text: "High-definition unwatermarked images" },
              { text: "50 generation credits per billing period" },
              { text: "Access to all available templates" },
              { text: "Full generation history" },
              { text: "Image download and sharing" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Pricing",
            paragraphs: [
              "Subscription price is EUR 4.90 (tax included) per week.",
              "Prices may change at any time and apply from the next renewal.",
              "Under French tax rules (article 293 B CGI), VAT is not applicable.",
            ],
          },
          {
            id: "4",
            title: "4. Subscription terms",
            paragraphs: [
              "Subscription is made online on turboprank.com. Payments are secured by Stripe (PCI-DSS).",
              "The subscription renews automatically each week.",
            ],
          },
          {
            id: "5",
            title: "5. Right of withdrawal",
            paragraphs: [
              "Under article L.221-28 of the French Consumer Code, withdrawal may not apply to digital content supply once execution starts with the consumer's agreement.",
              "The 14-day withdrawal period remains applicable if no generation credits were used.",
            ],
          },
          {
            id: "6",
            title: "6. Cancellation",
            paragraphs: [
              "You can cancel anytime from account settings or by email at prankturbo@gmail.com.",
              "Cancellation takes effect at the end of the current billing period. No prorated refund is provided.",
            ],
          },
          {
            id: "7",
            title: "7. Refunds",
            paragraphs: [
              "Refund requests can be sent to prankturbo@gmail.com within 14 days from subscription, provided no credits were used.",
              "Each request is reviewed case by case.",
            ],
          },
          {
            id: "8",
            title: "8. Liability",
            paragraphs: [
              "GUS provides the service with reasonable care but does not guarantee uninterrupted availability.",
              "In case of extended downtime, proportional compensation may be considered.",
            ],
          },
          {
            id: "9",
            title: "9. Customer support",
            paragraphs: [
              "For subscription, billing, or refund questions, contact: prankturbo@gmail.com.",
              "We aim to answer within 48 hours.",
            ],
          },
          {
            id: "10",
            title: "10. Governing law and disputes",
            paragraphs: [
              "These Sales Terms are governed by French law.",
              "In case of dispute, users may contact a consumer mediator (articles L.611-1 and following). If unresolved, courts of Grenoble have exclusive jurisdiction.",
            ],
          },
        ],
      },
      privacy: {
        title: "Privacy Policy",
        sections: [
          {
            id: "1",
            title: "1. Data controller",
            paragraphs: ["The data controller is:"],
            bullets: [
              { label: "Name", text: "GUS" },
              { label: "Status", text: "Sole proprietor" },
              { label: "Registration", text: "SIRET 100 452 200 00015" },
              {
                label: "Address",
                text: "11 rue de Bourgogne, 38000 Grenoble, France",
              },
              { label: "Email", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Data we collect",
            bullets: [
              {
                label: "Account data",
                text: "email address, password (hashed)",
              },
              {
                label: "Usage data",
                text: "submitted images, generated images, history, text prompts",
              },
              {
                label: "Technical data",
                text: "IP address, browser type, connection data",
              },
              {
                label: "Payment data",
                text: "processed by Stripe; we do not store bank details",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Processing purposes",
            bullets: [
              { text: "Providing and operating TurboPrank" },
              { text: "Managing user accounts" },
              { text: "Processing payments and subscriptions" },
              { text: "Improving service quality and user experience" },
              { text: "Support and service communications" },
              { text: "Compliance with legal obligations" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Legal basis",
            bullets: [
              {
                label: "Contract performance",
                text: "processing required to deliver the service",
              },
              {
                label: "Consent",
                text: "provided during registration and acceptance of terms",
              },
              {
                label: "Legitimate interest",
                text: "service improvement, security, abuse prevention",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Retention periods",
            bullets: [
              {
                label: "Account data",
                text: "for account duration, then 3 years after deletion",
              },
              {
                label: "Images",
                text: "for account duration, deleted when account is deleted",
              },
              {
                label: "Payment records",
                text: "according to legal obligations (10 years for accounting records)",
              },
              { label: "Technical logs", text: "up to 12 months" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Data sharing",
            paragraphs: ["Data may be shared with processors required to run the service:"],
            bullets: [
              { text: "Supabase (authentication and database)" },
              { text: "Stripe (payments)" },
              { text: "Cloudflare R2 (image storage)" },
              { text: "Kie.ai (AI image generation)" },
              { text: "Railway (server hosting)" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Cookies",
            paragraphs: [
              "TurboPrank only uses cookies strictly necessary for service operation (authentication and session).",
              "No advertising cookies are used.",
            ],
          },
          {
            id: "8",
            title: "8. Your rights (GDPR)",
            bullets: [
              { label: "Access", text: "request a copy of your data" },
              { label: "Rectification", text: "correct inaccurate data" },
              { label: "Erasure", text: "request deletion of your data" },
              {
                label: "Portability",
                text: "receive data in a structured format",
              },
              {
                label: "Objection",
                text: "object to certain processing operations",
              },
              {
                label: "Restriction",
                text: "request temporary suspension of processing",
              },
            ],
            bulletStyle: "disc",
            paragraphs: [
              "To exercise your rights: prankturbo@gmail.com. We respond within 30 days.",
              "You can also file a complaint with the CNIL: cnil.fr.",
            ],
          },
          {
            id: "9",
            title: "9. Security",
            paragraphs: [
              "We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.",
            ],
          },
          {
            id: "10",
            title: "10. Policy updates",
            paragraphs: [
              "This policy may be updated at any time.",
              "Material changes will be communicated to users.",
            ],
          },
          {
            id: "11",
            title: "11. Contact",
            paragraphs: [
              "For any privacy question, contact: prankturbo@gmail.com.",
            ],
          },
        ],
      },
      legalNotice: {
        title: "Legal Notice",
        sections: [
          {
            id: "1",
            title: "1. Website publisher",
            paragraphs: ["The website turboprank.com is published by:"],
            bullets: [
              { label: "Name", text: "GUS" },
              { label: "Status", text: "Sole proprietor" },
              { label: "Registration", text: "SIRET 100 452 200 00015" },
              {
                label: "Address",
                text: "11 rue de Bourgogne, 38000 Grenoble, France",
              },
              { label: "Email", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Publication director",
            paragraphs: [
              "The publication director is GUS, reachable at prankturbo@gmail.com.",
            ],
          },
          {
            id: "3",
            title: "3. Hosting provider",
            paragraphs: ["The website is hosted by:"],
            bullets: [
              { label: "Name", text: "Railway Corporation" },
              { label: "Website", text: "railway.com" },
              {
                label: "Address",
                text: "548 Market Street, San Francisco, CA 94104, United States",
              },
            ],
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Intellectual property",
            paragraphs: [
              "All website content (texts, graphics, images, logos, icons, software) is protected by intellectual property laws.",
              "Any unauthorized reproduction or use is prohibited and may lead to legal action.",
            ],
          },
          {
            id: "5",
            title: "5. Limitation of liability",
            paragraphs: [
              "GUS strives to ensure information accuracy but cannot guarantee the absence of errors or omissions.",
              "The publisher is not liable for direct or indirect damages related to website use.",
            ],
          },
          {
            id: "6",
            title: "6. Contact",
            paragraphs: [
              "For any legal notice question, contact: prankturbo@gmail.com.",
            ],
          },
        ],
      },
    },
  },
  es: {
    backHome: "Volver al inicio",
    lastUpdated: "Ultima actualizacion: 13 de marzo de 2026",
    docs: {
      cgu: {
        title: "Condiciones Generales de Uso",
        sections: [
          {
            id: "1",
            title: "1. Objeto",
            paragraphs: [
              "Estas Condiciones Generales de Uso regulan el uso de TurboPrank, disponible en turboprank.com.",
              "El servicio es operado por GUS, autonomo (SIRET: 100 452 200 00015), 11 rue de Bourgogne, 38000 Grenoble, Francia.",
            ],
          },
          {
            id: "2",
            title: "2. Aceptacion",
            paragraphs: [
              "El registro en TurboPrank implica la aceptacion plena de estas condiciones.",
              "Al usar el servicio, confirmas que has leido y aceptado estas condiciones.",
            ],
          },
          {
            id: "3",
            title: "3. Descripcion del servicio",
            paragraphs: [
              "TurboPrank es un servicio online de generacion de imagenes con IA para entretenimiento.",
              "La primera generacion puede ser gratuita con marca de agua. El acceso sin marca y funciones avanzadas requiere suscripcion de pago.",
            ],
          },
          {
            id: "4",
            title: "4. Cuenta de usuario",
            paragraphs: [
              "Para usar el servicio debes crear una cuenta y proporcionar datos correctos.",
              "Puedes eliminar tu cuenta en cualquier momento desde ajustes o escribiendo a prankturbo@gmail.com.",
            ],
          },
          {
            id: "5",
            title: "5. Uso responsable",
            paragraphs: [
              "Debes usar el servicio conforme a la ley. Se prohibe expresamente:",
            ],
            bullets: [
              {
                label: "Usar imagenes de terceros sin consentimiento",
                text: "No se puede subir la foto de otra persona sin permiso expreso.",
              },
              {
                label: "Infringir derechos de autor",
                text: "No se permite usar obras protegidas sin autorizacion.",
              },
              {
                label: "Acoso o dano",
                text: "Se prohiben contenidos humillantes, amenazantes o difamatorios.",
              },
              {
                label: "Contenido ilegal",
                text: "Incluye contenido de abuso infantil, odio, violencia, terrorismo o difamacion ilegal.",
              },
              {
                label: "Deepfakes maliciosos",
                text: "Se prohiben imagenes enganosas destinadas a perjudicar o manipular.",
              },
              {
                label: "Fraude",
                text: "No se permite suplantacion de identidad, estafa ni actividades ilicitas.",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Propiedad intelectual",
            paragraphs: [
              "La interfaz, software y contenidos de TurboPrank estan protegidos por leyes de propiedad intelectual.",
              "El usuario conserva sus derechos sobre los contenidos enviados, respetando estas condiciones y la ley.",
            ],
          },
          {
            id: "7",
            title: "7. Responsabilidad del usuario",
            paragraphs: [
              "El usuario es el unico responsable de los contenidos enviados y de las imagenes generadas.",
              "Garantiza disponer de los derechos necesarios y acepta indemnizar a GUS ante reclamaciones de terceros.",
            ],
          },
          {
            id: "8",
            title: "8. Limitacion de responsabilidad",
            paragraphs: [
              "GUS no es responsable del contenido generado por los usuarios.",
              "El servicio se ofrece tal cual y no se garantiza disponibilidad continua.",
              "GUS no responde por danos indirectos, perdida de datos, beneficios u oportunidades.",
            ],
          },
          {
            id: "9",
            title: "9. Cambios en las condiciones",
            paragraphs: [
              "GUS puede modificar estas condiciones en cualquier momento.",
              "El uso continuado del servicio implica aceptacion de los cambios.",
            ],
          },
          {
            id: "10",
            title: "10. Ley aplicable y jurisdiccion",
            paragraphs: [
              "Estas condiciones se rigen por la ley francesa.",
              "En caso de disputa, y tras intento de acuerdo amistoso, los tribunales de Grenoble seran competentes.",
            ],
          },
          {
            id: "11",
            title: "11. Contacto",
            paragraphs: [
              "Para cualquier consulta sobre estas condiciones: prankturbo@gmail.com.",
            ],
          },
        ],
      },
      cgv: {
        title: "Condiciones Generales de Venta",
        sections: [
          {
            id: "1",
            title: "1. Objeto",
            paragraphs: [
              "Estas Condiciones de Venta regulan la suscripcion y uso de los servicios de pago de TurboPrank.",
              "El servicio es operado por GUS, autonomo (SIRET: 100 452 200 00015), Grenoble, Francia.",
            ],
          },
          {
            id: "2",
            title: "2. Descripcion del servicio",
            paragraphs: ["La suscripcion de pago incluye:"],
            bullets: [
              { text: "Imagenes en alta definicion sin marca de agua" },
              { text: "50 creditos por periodo de suscripcion" },
              { text: "Acceso a todas las plantillas" },
              { text: "Historial completo de generaciones" },
              { text: "Descarga y comparticion de imagenes" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Precio",
            paragraphs: [
              "El precio es de 4,90 EUR por semana (impuestos incluidos).",
              "GUS puede modificar los precios. Los cambios se aplican en la siguiente renovacion.",
              "Segun el regimen fiscal frances (articulo 293 B CGI), el IVA no es aplicable.",
            ],
          },
          {
            id: "4",
            title: "4. Suscripcion",
            paragraphs: [
              "La suscripcion se realiza online en turboprank.com. El pago se procesa de forma segura por Stripe (PCI-DSS).",
              "La suscripcion se renueva automaticamente cada semana.",
            ],
          },
          {
            id: "5",
            title: "5. Derecho de desistimiento",
            paragraphs: [
              "Conforme al articulo L.221-28 del Codigo de Consumo frances, el desistimiento puede no aplicar a contenido digital cuya ejecucion haya comenzado con acuerdo del consumidor.",
              "El plazo de 14 dias se mantiene si no se ha consumido ningun credito.",
            ],
          },
          {
            id: "6",
            title: "6. Cancelacion",
            paragraphs: [
              "Puedes cancelar en cualquier momento desde ajustes o por email a prankturbo@gmail.com.",
              "La cancelacion surte efecto al final del periodo actual. No hay reembolso prorrateado.",
            ],
          },
          {
            id: "7",
            title: "7. Reembolsos",
            paragraphs: [
              "Las solicitudes de reembolso deben enviarse en un plazo de 14 dias desde la suscripcion, siempre que no se hayan usado creditos.",
              "Cada solicitud se analiza caso por caso.",
            ],
          },
          {
            id: "8",
            title: "8. Responsabilidad",
            paragraphs: [
              "GUS presta el servicio con diligencia, sin garantizar disponibilidad continua.",
              "En caso de indisponibilidad prolongada, puede evaluarse una compensacion proporcional.",
            ],
          },
          {
            id: "9",
            title: "9. Atencion al cliente",
            paragraphs: [
              "Para dudas sobre suscripcion, facturacion o reembolsos: prankturbo@gmail.com.",
              "Objetivo de respuesta: 48 horas.",
            ],
          },
          {
            id: "10",
            title: "10. Ley aplicable y conflictos",
            paragraphs: [
              "Estas condiciones se rigen por la ley francesa.",
              "El usuario puede acudir a mediacion de consumo. Si no hay acuerdo, los tribunales de Grenoble son competentes.",
            ],
          },
        ],
      },
      privacy: {
        title: "Politica de Privacidad",
        sections: [
          {
            id: "1",
            title: "1. Responsable del tratamiento",
            paragraphs: ["El responsable del tratamiento es:"],
            bullets: [
              { label: "Nombre", text: "GUS" },
              { label: "Estado", text: "Autonomo" },
              { label: "Registro", text: "SIRET 100 452 200 00015" },
              {
                label: "Direccion",
                text: "11 rue de Bourgogne, 38000 Grenoble, Francia",
              },
              { label: "Email", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Datos recogidos",
            bullets: [
              {
                label: "Datos de cuenta",
                text: "email y contrasena (hasheada)",
              },
              {
                label: "Datos de uso",
                text: "imagenes subidas, imagenes generadas, historial y prompts",
              },
              {
                label: "Datos tecnicos",
                text: "IP, navegador y datos de conexion",
              },
              {
                label: "Datos de pago",
                text: "procesados por Stripe; no guardamos datos bancarios",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Finalidades",
            bullets: [
              { text: "Prestar y gestionar TurboPrank" },
              { text: "Gestionar cuentas de usuario" },
              { text: "Procesar pagos y suscripciones" },
              { text: "Mejorar el servicio y la experiencia" },
              { text: "Soporte y comunicaciones de servicio" },
              { text: "Cumplir obligaciones legales" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Base legal",
            bullets: [
              {
                label: "Ejecucion del contrato",
                text: "tratamiento necesario para prestar el servicio",
              },
              {
                label: "Consentimiento",
                text: "otorgado al registrarte y aceptar las condiciones",
              },
              {
                label: "Interes legitimo",
                text: "mejora del servicio, seguridad y prevencion de abusos",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Conservacion",
            bullets: [
              {
                label: "Datos de cuenta",
                text: "durante la vida de la cuenta y 3 anos tras su eliminacion",
              },
              {
                label: "Imagenes",
                text: "durante la vida de la cuenta; se borran al eliminarla",
              },
              {
                label: "Datos de pago",
                text: "segun obligaciones legales (10 anos para contabilidad)",
              },
              { label: "Logs tecnicos", text: "maximo 12 meses" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Cesion a terceros",
            paragraphs: ["Los datos pueden compartirse con proveedores necesarios:"],
            bullets: [
              { text: "Supabase (autenticacion y base de datos)" },
              { text: "Stripe (pagos)" },
              { text: "Cloudflare R2 (almacenamiento de imagenes)" },
              { text: "Kie.ai (generacion de imagenes con IA)" },
              { text: "Railway (hosting del servidor)" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Cookies",
            paragraphs: [
              "TurboPrank solo usa cookies necesarias para autenticacion y sesion.",
              "No se usan cookies publicitarias.",
            ],
          },
          {
            id: "8",
            title: "8. Tus derechos (RGPD)",
            bullets: [
              { label: "Acceso", text: "obtener copia de tus datos" },
              { label: "Rectificacion", text: "corregir datos inexactos" },
              { label: "Supresion", text: "solicitar borrado" },
              {
                label: "Portabilidad",
                text: "recibir datos en formato estructurado",
              },
              {
                label: "Oposicion",
                text: "oponerte a ciertos tratamientos",
              },
              {
                label: "Limitacion",
                text: "pedir suspension temporal del tratamiento",
              },
            ],
            bulletStyle: "disc",
            paragraphs: [
              "Para ejercer tus derechos: prankturbo@gmail.com. Respondemos en 30 dias.",
              "Tambien puedes reclamar ante la CNIL: cnil.fr.",
            ],
          },
          {
            id: "9",
            title: "9. Seguridad",
            paragraphs: [
              "Aplicamos medidas tecnicas y organizativas adecuadas para proteger tus datos.",
            ],
          },
          {
            id: "10",
            title: "10. Actualizacion de la politica",
            paragraphs: [
              "Esta politica puede actualizarse en cualquier momento.",
              "Los cambios importantes se comunicaran a los usuarios.",
            ],
          },
          {
            id: "11",
            title: "11. Contacto",
            paragraphs: [
              "Para cualquier consulta sobre privacidad: prankturbo@gmail.com.",
            ],
          },
        ],
      },
      legalNotice: {
        title: "Aviso Legal",
        sections: [
          {
            id: "1",
            title: "1. Editor del sitio",
            paragraphs: ["El sitio turboprank.com es editado por:"],
            bullets: [
              { label: "Nombre", text: "GUS" },
              { label: "Estado", text: "Autonomo" },
              { label: "Registro", text: "SIRET 100 452 200 00015" },
              {
                label: "Direccion",
                text: "11 rue de Bourgogne, 38000 Grenoble, Francia",
              },
              { label: "Email", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Director de publicacion",
            paragraphs: [
              "El director de publicacion es GUS, contacto: prankturbo@gmail.com.",
            ],
          },
          {
            id: "3",
            title: "3. Hosting",
            paragraphs: ["El sitio esta alojado por:"],
            bullets: [
              { label: "Nombre", text: "Railway Corporation" },
              { label: "Web", text: "railway.com" },
              {
                label: "Direccion",
                text: "548 Market Street, San Francisco, CA 94104, Estados Unidos",
              },
            ],
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Propiedad intelectual",
            paragraphs: [
              "Todo el contenido del sitio esta protegido por leyes de propiedad intelectual.",
              "Cualquier reproduccion o uso no autorizado esta prohibido y puede generar acciones legales.",
            ],
          },
          {
            id: "5",
            title: "5. Limitacion de responsabilidad",
            paragraphs: [
              "GUS intenta asegurar la exactitud de la informacion, sin garantizar ausencia total de errores.",
              "El editor no responde por danos directos o indirectos relacionados con el uso del sitio.",
            ],
          },
          {
            id: "6",
            title: "6. Contacto",
            paragraphs: [
              "Para cualquier consulta legal: prankturbo@gmail.com.",
            ],
          },
        ],
      },
    },
  },
  de: {
    backHome: "Zuruck zur Startseite",
    lastUpdated: "Letzte Aktualisierung: 13. Marz 2026",
    docs: {
      cgu: {
        title: "Allgemeine Nutzungsbedingungen",
        sections: [
          {
            id: "1",
            title: "1. Gegenstand",
            paragraphs: [
              "Diese Nutzungsbedingungen regeln die Nutzung von TurboPrank auf turboprank.com.",
              "Der Dienst wird betrieben von GUS, Einzelunternehmer (SIRET: 100 452 200 00015), 11 rue de Bourgogne, 38000 Grenoble, Frankreich.",
            ],
          },
          {
            id: "2",
            title: "2. Annahme",
            paragraphs: [
              "Die Registrierung bei TurboPrank setzt die vollstandige Annahme dieser Bedingungen voraus.",
              "Mit der Nutzung bestaetigst du, dass du diese Bedingungen gelesen und akzeptiert hast.",
            ],
          },
          {
            id: "3",
            title: "3. Leistungsbeschreibung",
            paragraphs: [
              "TurboPrank ist ein Online-Dienst zur KI-Bildgenerierung fur humoristische Zwecke.",
              "Eine erste Generierung kann kostenlos mit Wasserzeichen erfolgen. Zugriff ohne Wasserzeichen und auf erweiterte Funktionen erfordert ein kostenpflichtiges Abonnement.",
            ],
          },
          {
            id: "4",
            title: "4. Benutzerkonto",
            paragraphs: [
              "Die Nutzung erfordert ein Konto. Nutzer mussen korrekte Angaben machen und Zugangsdaten vertraulich behandeln.",
              "Das Konto kann jederzeit in den Einstellungen oder per E-Mail an prankturbo@gmail.com geloscht werden.",
            ],
          },
          {
            id: "5",
            title: "5. Verantwortungsvolle Nutzung",
            paragraphs: [
              "Die Nutzung muss gesetzeskonform erfolgen. Folgendes ist streng verboten:",
            ],
            bullets: [
              {
                label: "Bilder Dritter ohne Einwilligung",
                text: "Das Hochladen von Fotos anderer Personen ohne ausdrueckliche Zustimmung ist verboten.",
              },
              {
                label: "Urheberrechtsverletzung",
                text: "Die Nutzung geschutzter Inhalte ohne Erlaubnis ist verboten.",
              },
              {
                label: "Belastigung oder Schaden",
                text: "Demutigende, bedrohende oder verleumderische Inhalte sind verboten.",
              },
              {
                label: "Rechtswidrige Inhalte",
                text: "Insbesondere kindesmissbrauchsdarstellungen, Hassinhalte, Gewalt, Terrorismus und rechtswidrige Verleumdung sind verboten.",
              },
              {
                label: "Bosartige Deepfakes",
                text: "Irrefuhrende Inhalte mit Schadzweck oder Manipulationsabsicht sind verboten.",
              },
              {
                label: "Betrug",
                text: "Identitatsdiebstahl, Betrug und sonstige rechtswidrige Handlungen sind verboten.",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Geistiges Eigentum",
            paragraphs: [
              "Oberflache, Software und Inhalte von TurboPrank sind urheberrechtlich geschutzt.",
              "Nutzer behalten Rechte an eingereichten Inhalten, sofern diese Bedingungen und geltendes Recht eingehalten werden.",
            ],
          },
          {
            id: "7",
            title: "7. Verantwortung des Nutzers",
            paragraphs: [
              "Nutzer sind allein fur eingereichte Inhalte und generierte Bilder verantwortlich.",
              "Nutzer sichern zu, uber alle erforderlichen Rechte zu verfugen, und stellen GUS von Anspruchen Dritter frei.",
            ],
          },
          {
            id: "8",
            title: "8. Haftungsbeschrankung",
            paragraphs: [
              "GUS haftet nicht fur nutzergenerierte Inhalte.",
              "Der Dienst wird wie verfugbar bereitgestellt; eine ununterbrochene Verfugbarkeit wird nicht garantiert.",
              "GUS haftet nicht fur mittelbare Schaden, Datenverlust, Gewinn- oder Chancenverlust.",
            ],
          },
          {
            id: "9",
            title: "9. Anderungen der Bedingungen",
            paragraphs: [
              "GUS kann diese Bedingungen jederzeit andern.",
              "Die fortgesetzte Nutzung nach Anderung gilt als Zustimmung.",
            ],
          },
          {
            id: "10",
            title: "10. Anwendbares Recht und Gerichtsstand",
            paragraphs: [
              "Diese Bedingungen unterliegen franzosischem Recht.",
              "Bei Streitigkeiten sind nach einem Einigungsversuch die Gerichte in Grenoble zustandig.",
            ],
          },
          {
            id: "11",
            title: "11. Kontakt",
            paragraphs: [
              "Bei Fragen zu diesen Bedingungen: prankturbo@gmail.com.",
            ],
          },
        ],
      },
      cgv: {
        title: "Allgemeine Verkaufsbedingungen",
        sections: [
          {
            id: "1",
            title: "1. Gegenstand",
            paragraphs: [
              "Diese Verkaufsbedingungen regeln Abschluss und Nutzung kostenpflichtiger TurboPrank-Dienste.",
              "Der Dienst wird von GUS betrieben (SIRET: 100 452 200 00015), Grenoble, Frankreich.",
            ],
          },
          {
            id: "2",
            title: "2. Leistungsbeschreibung",
            paragraphs: ["Das kostenpflichtige Abo umfasst:"],
            bullets: [
              { text: "HD-Bilder ohne Wasserzeichen" },
              { text: "50 Generierungs-Credits pro Abrechnungszeitraum" },
              { text: "Zugriff auf alle Vorlagen" },
              { text: "Vollstandiger Verlauf" },
              { text: "Download und Teilen von Bildern" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Preise",
            paragraphs: [
              "Der Preis betragt 4,90 EUR pro Woche (inkl. Steuern).",
              "Preisanderungen sind jederzeit moglich und gelten ab der nachsten Verlangerung.",
              "Nach franzosischem Steuerrecht (Art. 293 B CGI) ist keine MwSt. auszuweisen.",
            ],
          },
          {
            id: "4",
            title: "4. Abschluss",
            paragraphs: [
              "Der Abschluss erfolgt online auf turboprank.com. Zahlungen werden uber Stripe (PCI-DSS) sicher verarbeitet.",
              "Das Abo verlangert sich automatisch jede Woche.",
            ],
          },
          {
            id: "5",
            title: "5. Widerrufsrecht",
            paragraphs: [
              "Nach Art. L.221-28 des franzosischen Verbraucherrechts kann das Widerrufsrecht bei digitalen Inhalten ausgeschlossen sein, wenn die Ausfuhrung mit Zustimmung begonnen hat.",
              "Die 14-Tage-Frist gilt weiterhin, sofern keine Credits genutzt wurden.",
            ],
          },
          {
            id: "6",
            title: "6. Kundigung",
            paragraphs: [
              "Eine Kundigung ist jederzeit uber die Einstellungen oder per E-Mail an prankturbo@gmail.com moglich.",
              "Sie wird zum Ende des laufenden Abrechnungszeitraums wirksam. Eine anteilige Erstattung erfolgt nicht.",
            ],
          },
          {
            id: "7",
            title: "7. Erstattungen",
            paragraphs: [
              "Erstattungsanfragen konnen innerhalb von 14 Tagen nach Abschluss gestellt werden, sofern keine Credits verwendet wurden.",
              "Jede Anfrage wird einzeln gepruft.",
            ],
          },
          {
            id: "8",
            title: "8. Haftung",
            paragraphs: [
              "GUS erbringt den Dienst mit angemessener Sorgfalt, garantiert jedoch keine unterbrechungsfreie Verfugbarkeit.",
              "Bei langerem Ausfall kann eine anteilige Kompensation gepruft werden.",
            ],
          },
          {
            id: "9",
            title: "9. Kundendienst",
            paragraphs: [
              "Bei Fragen zu Abo, Rechnung oder Erstattung: prankturbo@gmail.com.",
              "Antwortziel: innerhalb von 48 Stunden.",
            ],
          },
          {
            id: "10",
            title: "10. Anwendbares Recht und Streitigkeiten",
            paragraphs: [
              "Diese Bedingungen unterliegen franzosischem Recht.",
              "Nutzer konnen eine Verbraucherschlichtung in Anspruch nehmen. Falls keine Einigung erfolgt, sind die Gerichte in Grenoble zustandig.",
            ],
          },
        ],
      },
      privacy: {
        title: "Datenschutzerklarung",
        sections: [
          {
            id: "1",
            title: "1. Verantwortlicher",
            paragraphs: ["Verantwortlich fur die Verarbeitung ist:"],
            bullets: [
              { label: "Name", text: "GUS" },
              { label: "Status", text: "Einzelunternehmer" },
              { label: "Register", text: "SIRET 100 452 200 00015" },
              {
                label: "Adresse",
                text: "11 rue de Bourgogne, 38000 Grenoble, Frankreich",
              },
              { label: "E-Mail", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Erhobene Daten",
            bullets: [
              {
                label: "Kontodaten",
                text: "E-Mail-Adresse, Passwort (gehasht)",
              },
              {
                label: "Nutzungsdaten",
                text: "hochgeladene Bilder, generierte Bilder, Verlauf, Prompts",
              },
              {
                label: "Technische Daten",
                text: "IP-Adresse, Browsertyp, Verbindungsdaten",
              },
              {
                label: "Zahlungsdaten",
                text: "werden von Stripe verarbeitet; Bankdaten werden nicht gespeichert",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Verarbeitungszwecke",
            bullets: [
              { text: "Bereitstellung und Betrieb von TurboPrank" },
              { text: "Verwaltung von Benutzerkonten" },
              { text: "Zahlungs- und Aboverwaltung" },
              { text: "Verbesserung von Dienst und Nutzererlebnis" },
              { text: "Support und servicebezogene Kommunikation" },
              { text: "Erfullung gesetzlicher Pflichten" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Rechtsgrundlage",
            bullets: [
              {
                label: "Vertragserfullung",
                text: "Verarbeitung zur Leistungserbringung erforderlich",
              },
              {
                label: "Einwilligung",
                text: "erteilt bei Registrierung und Zustimmung zu den Bedingungen",
              },
              {
                label: "Berechtigtes Interesse",
                text: "Dienstverbesserung, Sicherheit, Missbrauchsverhinderung",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Speicherdauer",
            bullets: [
              {
                label: "Kontodaten",
                text: "wahrend der Kontonutzung und 3 Jahre nach Loschung",
              },
              {
                label: "Bilder",
                text: "wahrend der Kontonutzung, Loschung bei Kontoloschung",
              },
              {
                label: "Zahlungsunterlagen",
                text: "gemaess gesetzlicher Aufbewahrung (10 Jahre fur Buchhaltung)",
              },
              { label: "Technische Logs", text: "maximal 12 Monate" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Weitergabe an Dritte",
            paragraphs: [
              "Daten konnen an notwendige Dienstleister weitergegeben werden:",
            ],
            bullets: [
              { text: "Supabase (Authentifizierung und Datenbank)" },
              { text: "Stripe (Zahlungen)" },
              { text: "Cloudflare R2 (Bildspeicherung)" },
              { text: "Kie.ai (KI-Bildgenerierung)" },
              { text: "Railway (Server-Hosting)" },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Cookies",
            paragraphs: [
              "TurboPrank verwendet nur technisch notwendige Cookies fur Authentifizierung und Sitzung.",
              "Es werden keine Werbe-Cookies eingesetzt.",
            ],
          },
          {
            id: "8",
            title: "8. Deine Rechte (DSGVO)",
            bullets: [
              { label: "Auskunft", text: "Kopie deiner Daten anfordern" },
              { label: "Berichtigung", text: "falsche Daten korrigieren" },
              { label: "Loschung", text: "Loschung deiner Daten verlangen" },
              {
                label: "Datenubertragbarkeit",
                text: "Daten in strukturiertem Format erhalten",
              },
              {
                label: "Widerspruch",
                text: "bestimmten Verarbeitungen widersprechen",
              },
              {
                label: "Einschrankung",
                text: "vorubergehende Aussetzung der Verarbeitung verlangen",
              },
            ],
            bulletStyle: "disc",
            paragraphs: [
              "Zur Ausubung deiner Rechte: prankturbo@gmail.com. Antwort innerhalb von 30 Tagen.",
              "Zusatzlich ist eine Beschwerde bei der CNIL moglich: cnil.fr.",
            ],
          },
          {
            id: "9",
            title: "9. Sicherheit",
            paragraphs: [
              "Wir setzen geeignete technische und organisatorische Massnahmen zum Schutz deiner Daten ein.",
            ],
          },
          {
            id: "10",
            title: "10. Aktualisierung der Richtlinie",
            paragraphs: [
              "Diese Richtlinie kann jederzeit aktualisiert werden.",
              "Wesentliche Anderungen werden den Nutzern mitgeteilt.",
            ],
          },
          {
            id: "11",
            title: "11. Kontakt",
            paragraphs: [
              "Bei Fragen zum Datenschutz: prankturbo@gmail.com.",
            ],
          },
        ],
      },
      legalNotice: {
        title: "Impressum",
        sections: [
          {
            id: "1",
            title: "1. Anbieter",
            paragraphs: ["Die Website turboprank.com wird betrieben von:"],
            bullets: [
              { label: "Name", text: "GUS" },
              { label: "Status", text: "Einzelunternehmer" },
              { label: "Register", text: "SIRET 100 452 200 00015" },
              {
                label: "Adresse",
                text: "11 rue de Bourgogne, 38000 Grenoble, Frankreich",
              },
              { label: "E-Mail", text: "prankturbo@gmail.com" },
            ],
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Verantwortlich fur Inhalte",
            paragraphs: [
              "Verantwortlich fur die Veroffentlichung ist GUS, erreichbar unter prankturbo@gmail.com.",
            ],
          },
          {
            id: "3",
            title: "3. Hosting",
            paragraphs: ["Die Website wird gehostet von:"],
            bullets: [
              { label: "Name", text: "Railway Corporation" },
              { label: "Webseite", text: "railway.com" },
              {
                label: "Adresse",
                text: "548 Market Street, San Francisco, CA 94104, USA",
              },
            ],
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Geistiges Eigentum",
            paragraphs: [
              "Alle Inhalte dieser Website sind urheberrechtlich geschutzt.",
              "Jede nicht autorisierte Vervielfaltigung oder Nutzung ist untersagt und kann rechtlich verfolgt werden.",
            ],
          },
          {
            id: "5",
            title: "5. Haftungsbeschrankung",
            paragraphs: [
              "GUS bemuht sich um korrekte Informationen, kann aber Fehler oder Auslassungen nicht ausschliessen.",
              "Der Anbieter haftet nicht fur direkte oder indirekte Schaden im Zusammenhang mit der Nutzung der Website.",
            ],
          },
          {
            id: "6",
            title: "6. Kontakt",
            paragraphs: ["Bei Fragen zum Impressum: prankturbo@gmail.com."],
          },
        ],
      },
    },
  },
};

export type LegalDocumentKey = keyof LegalLocaleContent["docs"];

export function getLegalContent(localeLike: string | undefined): LegalLocaleContent {
  const locale = resolvePreferredLocale(localeLike, DEFAULT_LOCALE);
  return LEGAL_CONTENT[locale];
}
