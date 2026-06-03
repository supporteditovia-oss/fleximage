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

const SITE_DOMAIN = "larpking.com";
const CONTACT_EMAIL = "contact@larpking.com";
const SERVICE_NAME = "LarpKing";
const COMPANY_STATUS_FR = "Auto-entrepreneur (Entreprise Individuelle)";
const COMPANY_STATUS_EN = "Sole proprietor";
const COMPANY_STATUS_ES = "Autonomo / empresa individual";
const COMPANY_STATUS_DE = "Einzelunternehmer";
const COMPANY_TRADE_NAME = "DEVINCK";
const COMPANY_SIRET = "944 582 600 00010";
const COMPANY_ADDRESS = "28 Rue Nicolas Leblanc, 59000 Lille, France";

const COMPANY_DETAILS: Record<AppLocale, LegalBullet[]> = {
  fr: [
    { label: "Nom commercial", text: COMPANY_TRADE_NAME },
    { label: "Editeur", text: `${COMPANY_TRADE_NAME} (${SERVICE_NAME})` },
    { label: "Statut", text: COMPANY_STATUS_FR },
    { label: "SIRET", text: COMPANY_SIRET },
    { label: "Adresse", text: COMPANY_ADDRESS },
    { label: "Email", text: CONTACT_EMAIL },
  ],
  en: [
    { label: "Trade name", text: COMPANY_TRADE_NAME },
    { label: "Publisher", text: `${COMPANY_TRADE_NAME} (${SERVICE_NAME})` },
    { label: "Status", text: COMPANY_STATUS_EN },
    { label: "Registration", text: `SIRET ${COMPANY_SIRET}` },
    { label: "Address", text: COMPANY_ADDRESS },
    { label: "Email", text: CONTACT_EMAIL },
  ],
  es: [
    { label: "Nombre comercial", text: COMPANY_TRADE_NAME },
    { label: "Editor", text: `${COMPANY_TRADE_NAME} (${SERVICE_NAME})` },
    { label: "Estatuto", text: COMPANY_STATUS_ES },
    { label: "Registro", text: `SIRET ${COMPANY_SIRET}` },
    { label: "Direccion", text: COMPANY_ADDRESS },
    { label: "Email", text: CONTACT_EMAIL },
  ],
  de: [
    { label: "Handelsname", text: COMPANY_TRADE_NAME },
    { label: "Herausgeber", text: `${COMPANY_TRADE_NAME} (${SERVICE_NAME})` },
    { label: "Status", text: COMPANY_STATUS_DE },
    { label: "Registrierung", text: `SIRET ${COMPANY_SIRET}` },
    { label: "Adresse", text: COMPANY_ADDRESS },
    { label: "E-Mail", text: CONTACT_EMAIL },
  ],
};

const HOSTING_DETAILS: Record<AppLocale, LegalBullet[]> = {
  fr: [
    { label: "Nom", text: "Railway Corporation" },
    { label: "Site web", text: "railway.com" },
    { label: "Adresse", text: "548 Market Street, San Francisco, CA 94104, Etats-Unis" },
  ],
  en: [
    { label: "Name", text: "Railway Corporation" },
    { label: "Website", text: "railway.com" },
    { label: "Address", text: "548 Market Street, San Francisco, CA 94104, United States" },
  ],
  es: [
    { label: "Nombre", text: "Railway Corporation" },
    { label: "Sitio web", text: "railway.com" },
    { label: "Direccion", text: "548 Market Street, San Francisco, CA 94104, Estados Unidos" },
  ],
  de: [
    { label: "Name", text: "Railway Corporation" },
    { label: "Website", text: "railway.com" },
    { label: "Adresse", text: "548 Market Street, San Francisco, CA 94104, USA" },
  ],
};

const TECH_PROVIDERS: Record<AppLocale, LegalBullet[]> = {
  fr: [
    { text: "Supabase pour l'authentification, la base de donnees et certains fichiers techniques." },
    { text: "Stripe pour les paiements, abonnements, factures et portail client." },
    { text: "Cloudflare R2 pour le stockage securise de fichiers image." },
    { text: "Kie.ai et/ou prestataires similaires pour le traitement IA des generations." },
    { text: "Railway pour l'hebergement applicatif." },
  ],
  en: [
    { text: "Supabase for authentication, database services, and selected technical files." },
    { text: "Stripe for payments, subscriptions, invoices, and the customer portal." },
    { text: "Cloudflare R2 for secure image file storage." },
    { text: "Kie.ai and/or similar providers for AI generation processing." },
    { text: "Railway for application hosting." },
  ],
  es: [
    { text: "Supabase para autenticacion, base de datos y ciertos archivos tecnicos." },
    { text: "Stripe para pagos, suscripciones, facturas y portal de cliente." },
    { text: "Cloudflare R2 para almacenamiento seguro de archivos de imagen." },
    { text: "Kie.ai y/o proveedores similares para el tratamiento de generaciones con IA." },
    { text: "Railway para alojamiento de la aplicacion." },
  ],
  de: [
    { text: "Supabase fur Authentifizierung, Datenbank und bestimmte technische Dateien." },
    { text: "Stripe fur Zahlungen, Abonnements, Rechnungen und Kundenportal." },
    { text: "Cloudflare R2 fur sichere Speicherung von Bilddateien." },
    { text: "Kie.ai und/oder ahnliche Anbieter fur KI-Generierungsprozesse." },
    { text: "Railway fur das Hosting der Anwendung." },
  ],
};

const LEGAL_CONTENT: Record<AppLocale, LegalLocaleContent> = {
  fr: {
    backHome: "Retour a l'accueil",
    lastUpdated: "Derniere mise a jour : 31 mai 2026",
    docs: {
      cgu: {
        title: "Conditions Generales d'Utilisation",
        sections: [
          {
            id: "1",
            title: "1. Objet",
            paragraphs: [
              `Les presentes Conditions Generales d'Utilisation (CGU) definissent les conditions d'acces et d'utilisation de LarpKing, service disponible sur ${SITE_DOMAIN}.`,
              "LarpKing permet de transformer des images a l'aide de l'intelligence artificielle afin de creer des visuels lifestyle, sociaux, mode, voyage, restauration, luxe ou creatifs, a partir d'images et/ou d'instructions fournies par l'utilisateur.",
            ],
          },
          {
            id: "2",
            title: "2. Acceptation et acces",
            paragraphs: [
              "La creation d'un compte, la connexion ou l'utilisation du service implique l'acceptation pleine et entiere des presentes CGU.",
              "L'utilisateur doit disposer de la capacite juridique necessaire pour utiliser le service. L'utilisation par un mineur suppose l'accord de son representant legal.",
              "LarpKing peut suspendre ou limiter l'acces au service en cas de violation des presentes CGU, d'abus, de risque de securite ou de demande legale.",
            ],
          },
          {
            id: "3",
            title: "3. Fonctionnement du service",
            paragraphs: [
              "L'utilisateur peut importer une ou plusieurs images, choisir un template ou saisir un prompt, puis lancer une generation IA.",
              "Les generations consomment des credits. Le cout en credits depend du type de generation, de la qualite demandee et des options disponibles dans l'application.",
              "Les resultats peuvent etre realistes, stylises, imparfaits ou inattendus. LarpKing ne garantit pas qu'un rendu corresponde exactement a la demande initiale.",
            ],
          },
          {
            id: "4",
            title: "4. Compte utilisateur",
            paragraphs: [
              "L'utilisateur s'engage a fournir des informations exactes, a maintenir la confidentialite de ses identifiants et a signaler toute utilisation non autorisee de son compte.",
              `Le compte peut etre supprime depuis les parametres lorsque la fonctionnalite est disponible, ou en contactant ${CONTACT_EMAIL}.`,
              "La suppression du compte peut entrainer la suppression de l'historique, des contenus et des credits non utilises, sauf obligations legales contraires.",
            ],
          },
          {
            id: "5",
            title: "5. Contenus fournis par l'utilisateur",
            paragraphs: [
              "L'utilisateur conserve les droits qu'il detient sur les images, textes et autres contenus qu'il soumet a LarpKing.",
              "En soumettant un contenu, l'utilisateur accorde a LarpKing une licence non exclusive, mondiale, gratuite et limitee a ce qui est necessaire pour heberger, traiter, transformer, afficher et fournir le service demande.",
              "L'utilisateur garantit disposer des droits, autorisations et consentements necessaires, notamment lorsque l'image represente une personne identifiable, un lieu prive, une marque ou une oeuvre protegee.",
            ],
          },
          {
            id: "6",
            title: "6. Usages interdits",
            paragraphs: [
              "LarpKing est concu pour la creation d'images lifestyle et de contenus creatifs. Les usages suivants sont strictement interdits :",
            ],
            bullets: [
              {
                label: "Absence de consentement",
                text: "soumettre ou transformer l'image d'une personne identifiable sans droit ni consentement lorsque celui-ci est requis.",
              },
              {
                label: "Tromperie ou fraude",
                text: "presenter un visuel genere ou modifie comme une preuve reelle, usurper une identite, obtenir un avantage indu ou tromper une plateforme, un employeur, une banque, une administration ou un tiers.",
              },
              {
                label: "Atteinte a la reputation",
                text: "creer des contenus humiliants, diffamatoires, menacants, harcelants ou visant a nuire a une personne ou une organisation.",
              },
              {
                label: "Contenus sexuels ou sensibles non consentis",
                text: "generer, modifier ou diffuser des contenus intimes, sexuels, nudite, mineurs, violence, haine, extremisme ou toute categorie illicite.",
              },
              {
                label: "Droits de propriete intellectuelle",
                text: "utiliser sans autorisation des marques, oeuvres, logos, photographies, personnages ou elements proteges.",
              },
              {
                label: "Automatisation abusive",
                text: "extraire, copier, perturber, contourner les limites de credits ou utiliser le service pour du spam, du scraping ou une exploitation non autorisee.",
              },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Images generees et responsabilite",
            paragraphs: [
              "L'utilisateur est seul responsable de l'utilisation, de la publication et du partage des images generees.",
              "Les images issues de LarpKing doivent etre utilisees de maniere loyale et ne doivent pas etre employees pour induire un tiers en erreur, porter atteinte a ses droits ou contourner une verification d'identite.",
              "Lorsque le contexte le requiert, l'utilisateur doit signaler qu'une image est generee ou modifiee par IA.",
            ],
          },
          {
            id: "8",
            title: "8. Propriete intellectuelle de LarpKing",
            paragraphs: [
              "L'interface, les textes, graphismes, logos, logiciels, bases de donnees, templates et elements distinctifs de LarpKing sont proteges par les droits de propriete intellectuelle.",
              "Toute reproduction, adaptation, extraction, distribution ou exploitation non autorisee de ces elements est interdite.",
            ],
          },
          {
            id: "9",
            title: "9. Disponibilite et garanties",
            paragraphs: [
              "Le service est fourni avec diligence raisonnable, sans garantie de disponibilite continue, de resultat exact, d'absence d'erreur ou d'adequation a un usage particulier.",
              "LarpKing peut faire evoluer, suspendre ou interrompre certaines fonctionnalites pour maintenance, securite, amelioration du produit ou contraintes de prestataires tiers.",
              `${SERVICE_NAME} ne peut etre tenu responsable des dommages indirects, pertes de donnees, pertes d'opportunite, atteinte a l'image ou consequences liees a une utilisation non conforme du service.`,
            ],
          },
          {
            id: "10",
            title: "10. Modification des CGU",
            paragraphs: [
              "Les CGU peuvent etre modifiees pour tenir compte de l'evolution du service, de la loi ou des pratiques operationnelles.",
              "En cas de changement substantiel, LarpKing pourra informer les utilisateurs par tout moyen utile. L'utilisation continue du service apres mise a jour vaut acceptation des nouvelles conditions.",
            ],
          },
          {
            id: "11",
            title: "11. Droit applicable et contact",
            paragraphs: [
              "Les presentes CGU sont soumises au droit francais.",
              `Pour toute question relative aux CGU : ${CONTACT_EMAIL}.`,
              "En cas de litige, les parties rechercheront une solution amiable avant toute action judiciaire. Les juridictions competentes seront determinees conformement aux regles de procedure applicables.",
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
              "Les presentes Conditions Generales de Vente (CGV) encadrent la souscription, le paiement et l'utilisation des offres payantes LarpKing.",
              `Le vendeur est ${COMPANY_TRADE_NAME}, auto-entrepreneur (SIRET : ${COMPANY_SIRET}), ${COMPANY_ADDRESS}.`,
            ],
          },
          {
            id: "2",
            title: "2. Offres payantes",
            paragraphs: [
              "Les offres payantes donnent acces a des credits et fonctionnalites supplementaires pour generer, conserver, telecharger ou partager des images.",
            ],
            bullets: [
              { text: "Formule Decouverte : 250 credits par cycle de facturation mensuel." },
              { text: "Formule Essentiel : 850 credits par cycle de facturation mensuel + 250 credits offerts." },
              { text: "Formule Ultimate : 2500 credits par cycle de facturation mensuel." },
              { text: "Acces aux templates et options disponibles selon l'offre active." },
              { text: "Images generees accessibles dans l'historique du compte tant qu'elles sont conservees par le service." },
              { text: "Les credits non utilises ne constituent pas une monnaie, ne sont pas remboursables en especes et peuvent expirer a la fin du cycle selon l'offre." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Prix",
            paragraphs: [
              "Les prix affiches dans l'application et lors du paiement font foi au moment de la commande.",
              "A titre indicatif, les offres actuellement proposees sont 8,90 EUR, 19,90 EUR et 39,90 EUR par mois.",
              "TVA non applicable, article 293 B du Code general des impots, sauf changement de statut fiscal ou indication contraire au moment du paiement.",
              "LarpKing peut modifier ses prix. Une modification s'applique au prochain cycle de facturation ou a toute nouvelle commande, jamais retroactivement sur une periode deja payee.",
            ],
          },
          {
            id: "4",
            title: "4. Souscription et renouvellement",
            paragraphs: [
              "La souscription s'effectue en ligne depuis LarpKing via Stripe Checkout ou tout parcours de paiement affiche dans l'application.",
              "Sauf mention contraire, l'abonnement est reconduit automatiquement a chaque periode de facturation jusqu'a resiliation par l'utilisateur.",
              "Avant validation du paiement, l'utilisateur peut verifier l'offre, le prix, la periodicite, les credits inclus et corriger ses informations.",
            ],
          },
          {
            id: "5",
            title: "5. Paiement et facturation",
            paragraphs: [
              "Les paiements sont traites par Stripe. LarpKing ne stocke pas les donnees completes de carte bancaire.",
              "En cas d'echec de paiement, l'acces aux fonctionnalites payantes peut etre suspendu jusqu'a regularisation.",
              "Les factures et recus, lorsqu'ils sont disponibles, peuvent etre consultes via le portail client Stripe ou demandes au support.",
            ],
          },
          {
            id: "6",
            title: "6. Droit de retractation et contenu numerique",
            paragraphs: [
              "Pour les consommateurs, le delai legal de retractation de 14 jours s'applique sauf exception prevue par la loi.",
              "Lorsque l'utilisateur lance une generation, consomme des credits ou demande l'execution immediate d'un contenu numerique avant la fin du delai de retractation, il reconnait que le service commence immediatement et que le droit de retractation peut etre perdu pour la prestation deja executee.",
              "Si aucun credit n'a ete consomme et qu'aucune prestation numerique n'a commence, une demande de retractation ou remboursement peut etre envoyee dans les 14 jours suivant la souscription.",
            ],
          },
          {
            id: "7",
            title: "7. Resiliation",
            paragraphs: [
              "L'utilisateur peut resilier son abonnement a tout moment depuis ses parametres, le portail client Stripe ou en contactant le support.",
              "La resiliation prend effet a la fin de la periode payee en cours. L'acces payant reste actif jusqu'a cette date, sauf violation des CGU.",
              "Aucun remboursement prorata temporis n'est du du seul fait d'une resiliation anticipee, sauf obligation legale ou geste commercial accorde par LarpKing.",
            ],
          },
          {
            id: "8",
            title: "8. Remboursements et incidents",
            paragraphs: [
              `Les demandes relatives a une erreur de facturation, un paiement non reconnu, un incident technique majeur ou un remboursement doivent etre adressees a ${CONTACT_EMAIL}.`,
              "Chaque demande est analysee au cas par cas, notamment au regard de l'utilisation des credits, de l'historique de paiement et de la nature de l'incident.",
              "En cas d'indisponibilite prolongee imputable a LarpKing, une compensation peut etre proposee sous forme de credits, prolongation d'acces ou remboursement partiel.",
            ],
          },
          {
            id: "9",
            title: "9. Service client et mediation",
            paragraphs: [
              `Pour toute question sur une commande, un abonnement, un paiement ou une facture : ${CONTACT_EMAIL}.`,
              "LarpKing s'efforce de repondre sous 48 heures ouvrables.",
              "En cas de litige de consommation non resolu amiablement, l'utilisateur consommateur peut recourir gratuitement a un mediateur de la consommation competent, conformement aux articles L.611-1 et suivants du Code de la consommation.",
            ],
          },
          {
            id: "10",
            title: "10. Droit applicable",
            paragraphs: [
              "Les presentes CGV sont soumises au droit francais.",
              "Les juridictions competentes seront determinees conformement aux regles de procedure applicables, sans priver le consommateur des protections imperatives de son pays de residence lorsqu'elles s'appliquent.",
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
            paragraphs: ["Le responsable du traitement des donnees personnelles est :"],
            bullets: COMPANY_DETAILS.fr,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Donnees collectees",
            paragraphs: ["Dans le cadre de LarpKing, nous pouvons collecter les categories de donnees suivantes :"],
            bullets: [
              { label: "Compte", text: "adresse email, identifiant utilisateur, langue preferee, statut d'abonnement, acceptation des conditions." },
              { label: "Contenus", text: "images importees, images generees, templates choisis, prompts, parametres de generation et historique." },
              { label: "Paiement", text: "identifiants client et abonnement Stripe, statut de paiement, factures et informations transactionnelles; les donnees bancaires completes sont traitees par Stripe." },
              { label: "Technique", text: "adresse IP, logs, type de navigateur, appareil, erreurs, evenements de securite et donnees necessaires au bon fonctionnement du service." },
              { label: "Support", text: "messages envoyes au support et informations utiles au traitement de la demande." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Finalites",
            bullets: [
              { text: "Creer et gerer les comptes utilisateurs." },
              { text: "Fournir les generations IA, templates, credits, historique et telechargements." },
              { text: "Gerer les paiements, abonnements, remboursements, factures et support client." },
              { text: "Prevenir les abus, la fraude, les usages interdits et securiser le service." },
              { text: "Diagnostiquer les erreurs, mesurer la performance et ameliorer LarpKing." },
              { text: "Respecter les obligations legales, comptables, fiscales et de preuve." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Bases legales",
            bullets: [
              { label: "Execution du contrat", text: "fourniture du service, gestion du compte, generations, credits, abonnements et support." },
              { label: "Consentement", text: "actions volontairement realisees par l'utilisateur, communications optionnelles ou cookies non essentiels si de tels cookies sont actives." },
              { label: "Interet legitime", text: "securite, prevention des abus, amelioration du produit, defense des droits de LarpKing." },
              { label: "Obligation legale", text: "facturation, comptabilite, fiscalite, reponse aux demandes des autorites competentes." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Destinataires et sous-traitants",
            paragraphs: [
              "Les donnees sont accessibles uniquement aux personnes et prestataires ayant besoin d'y acceder pour fournir, securiser ou administrer le service.",
            ],
            bullets: TECH_PROVIDERS.fr,
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Transferts hors Union europeenne",
            paragraphs: [
              "Certains prestataires peuvent traiter des donnees en dehors de l'Union europeenne.",
              "Lorsque cela est necessaire, LarpKing s'appuie sur les mecanismes de transfert disponibles, notamment clauses contractuelles types, mesures contractuelles et garanties de securite proposees par les prestataires.",
            ],
          },
          {
            id: "7",
            title: "7. Durees de conservation",
            bullets: [
              { label: "Compte", text: "pendant la duree d'utilisation du compte, puis suppression ou anonymisation dans un delai raisonnable, sauf obligation de conservation." },
              { label: "Images et prompts", text: "pendant la duree necessaire a la fourniture du service et de l'historique, jusqu'a suppression par l'utilisateur ou suppression du compte, sauf conservation imposee par la loi ou necessaire a la securite." },
              { label: "Facturation", text: "jusqu'a 10 ans pour les pieces comptables et justificatifs." },
              { label: "Logs techniques", text: "jusqu'a 12 mois, sauf investigation de securite ou obligation legale." },
              { label: "Support", text: "jusqu'a 3 ans apres le dernier contact utile." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "8",
            title: "8. Cookies et stockage local",
            paragraphs: [
              "LarpKing utilise des cookies ou technologies similaires necessaires a l'authentification, la securite, la session, la langue et le fonctionnement de l'application.",
              "Aucun cookie publicitaire n'est depose sans base legale appropriee. Si des cookies non essentiels sont ajoutes, un mecanisme de choix sera propose lorsque requis.",
            ],
          },
          {
            id: "9",
            title: "9. Vos droits",
            paragraphs: [
              `Vous pouvez exercer vos droits a tout moment en ecrivant a ${CONTACT_EMAIL}. Une reponse sera apportee dans les delais prevus par le RGPD.`,
            ],
            bullets: [
              { text: "Droit d'acces, de rectification et d'effacement." },
              { text: "Droit a la limitation et a l'opposition." },
              { text: "Droit a la portabilite lorsque applicable." },
              { text: "Droit de retirer votre consentement lorsque le traitement repose sur celui-ci." },
              { text: "Droit d'introduire une reclamation aupres de la CNIL : cnil.fr." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "10",
            title: "10. Securite",
            paragraphs: [
              "LarpKing met en place des mesures techniques et organisationnelles raisonnables pour proteger les donnees contre l'acces non autorise, la perte, l'alteration ou la divulgation.",
              "Aucun service en ligne ne peut toutefois garantir une securite absolue. L'utilisateur doit proteger ses identifiants et signaler toute suspicion d'incident.",
            ],
          },
          {
            id: "11",
            title: "11. Traitement IA des images",
            paragraphs: [
              "Les images importees peuvent contenir des donnees personnelles selon leur contenu. Elles sont traitees afin de produire la generation demandee.",
              "LarpKing n'a pas pour finalite d'identifier une personne, d'authentifier une identite ou de prendre une decision produisant des effets juridiques a partir des images.",
              "Les contenus peuvent etre transmis a des prestataires IA strictement pour executer la generation et exploiter le service, dans les conditions prevues par leurs propres garanties contractuelles.",
            ],
          },
          {
            id: "12",
            title: "12. Mise a jour et contact",
            paragraphs: [
              "La presente politique peut etre mise a jour pour refleter l'evolution du service, des prestataires ou de la reglementation.",
              `Pour toute question relative aux donnees personnelles : ${CONTACT_EMAIL}.`,
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
            paragraphs: [`Le site ${SITE_DOMAIN} est edite par :`],
            bullets: COMPANY_DETAILS.fr,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Directeur de la publication",
            paragraphs: [`Le directeur de la publication est ${COMPANY_TRADE_NAME}, joignable a ${CONTACT_EMAIL}.`],
          },
          {
            id: "3",
            title: "3. Hebergement",
            paragraphs: ["Le site est heberge par :"],
            bullets: HOSTING_DETAILS.fr,
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Prestataires techniques",
            paragraphs: ["LarpKing s'appuie notamment sur les prestataires techniques suivants :"],
            bullets: TECH_PROVIDERS.fr,
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Propriete intellectuelle",
            paragraphs: [
              "Les marques, logos, textes, interfaces, templates, logiciels, bases de donnees et elements graphiques de LarpKing sont proteges.",
              "Toute reproduction, extraction, adaptation ou exploitation non autorisee est interdite.",
              "Les utilisateurs conservent les droits sur les contenus qu'ils soumettent, sous reserve des droits accordes a LarpKing pour executer le service.",
            ],
          },
          {
            id: "6",
            title: "6. Responsabilite",
            paragraphs: [
              "LarpKing fournit un service de transformation d'images par IA a finalite creative et lifestyle.",
              "L'editeur ne peut garantir l'exactitude, la disponibilite permanente ou l'adequation des resultats a un usage specifique.",
              "L'utilisateur reste responsable des images qu'il importe, genere, publie ou partage.",
            ],
          },
          {
            id: "7",
            title: "7. Donnees personnelles et cookies",
            paragraphs: [
              "Les informations relatives aux donnees personnelles, aux cookies et aux droits des utilisateurs sont detaillees dans la Politique de Confidentialite.",
            ],
          },
          {
            id: "8",
            title: "8. Contact",
            paragraphs: [`Pour toute question relative aux mentions legales : ${CONTACT_EMAIL}.`],
          },
        ],
      },
    },
  },
  en: {
    backHome: "Back to home",
    lastUpdated: "Last updated: May 31, 2026",
    docs: {
      cgu: {
        title: "Terms of Use",
        sections: [
          {
            id: "1",
            title: "1. Purpose",
            paragraphs: [
              `These Terms of Use govern access to and use of LarpKing, available at ${SITE_DOMAIN}.`,
              "LarpKing is an AI image transformation service for creating lifestyle, social, fashion, travel, restaurant, luxury, or creative visuals from images and/or prompts supplied by users.",
              "The French version of these Terms prevails over translations in case of inconsistency.",
            ],
          },
          {
            id: "2",
            title: "2. Acceptance and access",
            paragraphs: [
              "Creating an account, signing in, or using the service means accepting these Terms in full.",
              "You must have the legal capacity to use the service. Use by a minor requires permission from a legal guardian.",
              "LarpKing may suspend or restrict access in case of breach, abuse, security risk, or legal request.",
            ],
          },
          {
            id: "3",
            title: "3. How the service works",
            paragraphs: [
              "Users may upload one or more images, choose a template or enter a prompt, then start an AI generation.",
              "Generations consume credits. The credit cost depends on generation type, requested quality, and options available in the app.",
              "Outputs may be realistic, stylized, imperfect, or unexpected. LarpKing does not guarantee that an output will exactly match the initial request.",
            ],
          },
          {
            id: "4",
            title: "4. User account",
            paragraphs: [
              "You agree to provide accurate information, keep credentials confidential, and report unauthorized account use.",
              `You may delete your account from settings when available, or by contacting ${CONTACT_EMAIL}.`,
              "Account deletion may remove history, content, and unused credits unless legal obligations require retention.",
            ],
          },
          {
            id: "5",
            title: "5. User content",
            paragraphs: [
              "You keep the rights you hold in images, text, and other content submitted to LarpKing.",
              "By submitting content, you grant LarpKing a non-exclusive, worldwide, royalty-free license limited to what is necessary to host, process, transform, display, and provide the requested service.",
              "You warrant that you hold all rights, permissions, and consents required, especially where an image shows an identifiable person, private place, trademark, or protected work.",
            ],
          },
          {
            id: "6",
            title: "6. Prohibited uses",
            paragraphs: [
              "LarpKing is designed for lifestyle image creation and creative content. The following uses are strictly prohibited:",
            ],
            bullets: [
              { label: "No consent", text: "submitting or transforming an identifiable person's image without the required rights or consent." },
              { label: "Deception or fraud", text: "presenting generated or edited visuals as real evidence, impersonating someone, obtaining undue benefit, or misleading platforms, employers, banks, authorities, or third parties." },
              { label: "Reputation harm", text: "creating humiliating, defamatory, threatening, harassing, or harmful content targeting a person or organization." },
              { label: "Non-consensual sexual or sensitive content", text: "generating, editing, or sharing intimate content, sexual content, nudity, minors, violence, hate, extremism, or illegal categories." },
              { label: "Intellectual property", text: "using trademarks, works, logos, photos, characters, or protected elements without authorization." },
              { label: "Abusive automation", text: "extracting, copying, disrupting, bypassing credit limits, spamming, scraping, or exploiting the service without authorization." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Generated images and responsibility",
            paragraphs: [
              "You are solely responsible for using, publishing, and sharing generated images.",
              "Images from LarpKing must be used fairly and must not be used to mislead others, infringe rights, or bypass identity checks.",
              "Where context requires it, you must disclose that an image was generated or edited by AI.",
            ],
          },
          {
            id: "8",
            title: "8. LarpKing intellectual property",
            paragraphs: [
              "LarpKing's interface, text, graphics, logos, software, databases, templates, and distinctive elements are protected by intellectual property rights.",
              "Unauthorized reproduction, adaptation, extraction, distribution, or exploitation is prohibited.",
            ],
          },
          {
            id: "9",
            title: "9. Availability and warranties",
            paragraphs: [
              "The service is provided with reasonable care, without any guarantee of continuous availability, exact results, error-free operation, or fitness for a particular purpose.",
              "LarpKing may evolve, suspend, or discontinue features for maintenance, security, product improvement, or third-party provider constraints.",
              `${SERVICE_NAME} is not liable for indirect damages, loss of data, loss of opportunity, reputational harm, or consequences of non-compliant use.`,
            ],
          },
          {
            id: "10",
            title: "10. Changes",
            paragraphs: [
              "These Terms may be updated to reflect changes to the service, law, or operating practices.",
              "For material changes, LarpKing may notify users through any appropriate channel. Continued use after updates means accepting the new Terms.",
            ],
          },
          {
            id: "11",
            title: "11. Governing law and contact",
            paragraphs: [
              "These Terms are governed by French law.",
              `For questions about these Terms: ${CONTACT_EMAIL}.`,
              "In case of dispute, the parties will seek an amicable solution before legal action. Competent courts are determined by applicable procedural rules.",
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
              "These Sales Terms govern subscriptions, payments, and use of LarpKing paid offers.",
              `The seller is ${COMPANY_TRADE_NAME}, sole proprietor (SIRET: ${COMPANY_SIRET}), ${COMPANY_ADDRESS}.`,
              "The French version prevails over translations in case of inconsistency.",
            ],
          },
          {
            id: "2",
            title: "2. Paid offers",
            paragraphs: ["Paid offers provide credits and additional features to generate, keep, download, or share images."],
            bullets: [
              { text: "Discovery plan: 250 credits per monthly billing cycle." },
              { text: "Essential plan: 850 credits per monthly billing cycle + 250 bonus credits." },
              { text: "Ultimate plan: 2500 credits per monthly billing cycle." },
              { text: "Access to templates and options available according to the active offer." },
              { text: "Generated images remain available in account history while retained by the service." },
              { text: "Unused credits are not currency, cannot be redeemed for cash, and may expire at the end of the cycle depending on the offer." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Prices",
            paragraphs: [
              "Prices shown in the app and at checkout are authoritative at the time of order.",
              "For information, current offers are EUR 8.90, EUR 19.90, and EUR 39.90 per month.",
              "VAT not applicable under article 293 B of the French General Tax Code, unless tax status changes or checkout states otherwise.",
              "Prices may change. Changes apply to the next billing cycle or new orders, never retroactively to an already paid period.",
            ],
          },
          {
            id: "4",
            title: "4. Subscription and renewal",
            paragraphs: [
              "Subscriptions are purchased online through LarpKing via Stripe Checkout or any payment flow displayed in the app.",
              "Unless otherwise stated, subscriptions renew automatically at each billing period until cancelled by the user.",
              "Before confirming payment, users can review the offer, price, billing period, included credits, and correct information.",
            ],
          },
          {
            id: "5",
            title: "5. Payment and invoices",
            paragraphs: [
              "Payments are processed by Stripe. LarpKing does not store full card details.",
              "If payment fails, access to paid features may be suspended until the issue is resolved.",
              "Invoices and receipts, when available, can be accessed through the Stripe customer portal or requested from support.",
            ],
          },
          {
            id: "6",
            title: "6. Withdrawal and digital content",
            paragraphs: [
              "For consumers, the statutory 14-day withdrawal period applies unless an exception provided by law applies.",
              "When a user starts a generation, consumes credits, or requests immediate performance of digital content before the withdrawal period ends, the user acknowledges that performance starts immediately and that withdrawal rights may be lost for the already performed service.",
              "If no credit has been consumed and no digital service has started, a withdrawal or refund request may be sent within 14 days from subscription.",
            ],
          },
          {
            id: "7",
            title: "7. Cancellation",
            paragraphs: [
              "Users may cancel their subscription at any time from settings, the Stripe customer portal, or by contacting support.",
              "Cancellation takes effect at the end of the current paid period. Paid access remains active until then unless the Terms are breached.",
              "No prorated refund is due solely because of early cancellation, unless required by law or granted as a commercial gesture.",
            ],
          },
          {
            id: "8",
            title: "8. Refunds and incidents",
            paragraphs: [
              `Requests about billing errors, unrecognized payments, major technical incidents, or refunds must be sent to ${CONTACT_EMAIL}.`,
              "Each request is reviewed case by case, considering credit usage, payment history, and the nature of the incident.",
              "In case of extended downtime attributable to LarpKing, compensation may be offered as credits, access extension, or partial refund.",
            ],
          },
          {
            id: "9",
            title: "9. Customer support and mediation",
            paragraphs: [
              `For order, subscription, payment, or invoice questions: ${CONTACT_EMAIL}.`,
              "LarpKing aims to respond within 48 business hours.",
              "For unresolved consumer disputes, consumer users may use a competent consumer mediator free of charge under articles L.611-1 and following of the French Consumer Code.",
            ],
          },
          {
            id: "10",
            title: "10. Governing law",
            paragraphs: [
              "These Sales Terms are governed by French law.",
              "Competent courts are determined by applicable procedural rules, without depriving consumers of mandatory protections in their country of residence where applicable.",
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
            bullets: COMPANY_DETAILS.en,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Data we collect",
            paragraphs: ["When using LarpKing, we may collect the following data categories:"],
            bullets: [
              { label: "Account", text: "email address, user ID, preferred language, subscription status, acceptance of terms." },
              { label: "Content", text: "uploaded images, generated images, selected templates, prompts, generation settings, and history." },
              { label: "Payment", text: "Stripe customer and subscription IDs, payment status, invoices, and transaction information; full card details are processed by Stripe." },
              { label: "Technical", text: "IP address, logs, browser type, device, errors, security events, and data needed for service operation." },
              { label: "Support", text: "support messages and information needed to process requests." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Purposes",
            bullets: [
              { text: "Create and manage user accounts." },
              { text: "Provide AI generations, templates, credits, history, and downloads." },
              { text: "Manage payments, subscriptions, refunds, invoices, and customer support." },
              { text: "Prevent abuse, fraud, prohibited uses, and secure the service." },
              { text: "Diagnose errors, measure performance, and improve LarpKing." },
              { text: "Meet legal, accounting, tax, and evidence obligations." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Legal bases",
            bullets: [
              { label: "Contract performance", text: "service delivery, account management, generations, credits, subscriptions, and support." },
              { label: "Consent", text: "voluntary user actions, optional communications, or non-essential cookies if such cookies are enabled." },
              { label: "Legitimate interest", text: "security, abuse prevention, product improvement, and defense of LarpKing's rights." },
              { label: "Legal obligation", text: "billing, accounting, taxes, and responses to competent authorities." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Recipients and processors",
            paragraphs: [
              "Data is accessible only to people and providers who need it to provide, secure, or administer the service.",
            ],
            bullets: TECH_PROVIDERS.en,
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Transfers outside the EU",
            paragraphs: [
              "Some providers may process data outside the European Union.",
              "Where required, LarpKing relies on available transfer mechanisms, including standard contractual clauses, contractual safeguards, and provider security guarantees.",
            ],
          },
          {
            id: "7",
            title: "7. Retention",
            bullets: [
              { label: "Account", text: "for the duration of account use, then deleted or anonymized within a reasonable time unless retention is legally required." },
              { label: "Images and prompts", text: "for as long as needed to provide the service and history, until user deletion or account deletion, unless retention is required by law or security needs." },
              { label: "Billing", text: "up to 10 years for accounting records and evidence." },
              { label: "Technical logs", text: "up to 12 months, unless a security investigation or legal obligation requires longer retention." },
              { label: "Support", text: "up to 3 years after the last useful contact." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "8",
            title: "8. Cookies and local storage",
            paragraphs: [
              "LarpKing uses cookies or similar technologies required for authentication, security, session, language, and app operation.",
              "No advertising cookie is placed without an appropriate legal basis. If non-essential cookies are added, a choice mechanism will be provided where required.",
            ],
          },
          {
            id: "9",
            title: "9. Your rights",
            paragraphs: [
              `You may exercise your rights at any time by writing to ${CONTACT_EMAIL}. We will respond within GDPR time limits.`,
            ],
            bullets: [
              { text: "Access, rectification, and erasure." },
              { text: "Restriction and objection." },
              { text: "Portability where applicable." },
              { text: "Withdrawal of consent where processing relies on consent." },
              { text: "Right to lodge a complaint with the CNIL: cnil.fr." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "10",
            title: "10. Security",
            paragraphs: [
              "LarpKing implements reasonable technical and organizational measures to protect data against unauthorized access, loss, alteration, or disclosure.",
              "No online service can guarantee absolute security. Users must protect credentials and report suspected incidents.",
            ],
          },
          {
            id: "11",
            title: "11. AI image processing",
            paragraphs: [
              "Uploaded images may contain personal data depending on their content. They are processed to produce the requested generation.",
              "LarpKing does not aim to identify people, authenticate identity, or make decisions producing legal effects from images.",
              "Content may be sent to AI providers strictly to perform generations and operate the service, under their applicable contractual safeguards.",
            ],
          },
          {
            id: "12",
            title: "12. Updates and contact",
            paragraphs: [
              "This policy may be updated to reflect changes to the service, providers, or regulations.",
              `For privacy questions: ${CONTACT_EMAIL}.`,
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
            paragraphs: [`The website ${SITE_DOMAIN} is published by:`],
            bullets: COMPANY_DETAILS.en,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Publication director",
            paragraphs: [`The publication director is ${COMPANY_TRADE_NAME}, reachable at ${CONTACT_EMAIL}.`],
          },
          {
            id: "3",
            title: "3. Hosting",
            paragraphs: ["The website is hosted by:"],
            bullets: HOSTING_DETAILS.en,
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Technical providers",
            paragraphs: ["LarpKing relies in particular on the following technical providers:"],
            bullets: TECH_PROVIDERS.en,
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Intellectual property",
            paragraphs: [
              "LarpKing's trademarks, logos, texts, interfaces, templates, software, databases, and graphics are protected.",
              "Unauthorized reproduction, extraction, adaptation, or exploitation is prohibited.",
              "Users retain rights to submitted content, subject to rights granted to LarpKing to perform the service.",
            ],
          },
          {
            id: "6",
            title: "6. Liability",
            paragraphs: [
              "LarpKing provides an AI image transformation service for creative and lifestyle purposes.",
              "The publisher cannot guarantee accuracy, permanent availability, or suitability of outputs for a specific use.",
              "Users remain responsible for images they upload, generate, publish, or share.",
            ],
          },
          {
            id: "7",
            title: "7. Personal data and cookies",
            paragraphs: [
              "Information about personal data, cookies, and user rights is detailed in the Privacy Policy.",
            ],
          },
          {
            id: "8",
            title: "8. Contact",
            paragraphs: [`For legal notice questions: ${CONTACT_EMAIL}.`],
          },
        ],
      },
    },
  },
  es: {
    backHome: "Volver al inicio",
    lastUpdated: "Ultima actualizacion: 31 de mayo de 2026",
    docs: {
      cgu: {
        title: "Condiciones de Uso",
        sections: [
          {
            id: "1",
            title: "1. Objeto",
            paragraphs: [
              `Estas Condiciones de Uso regulan el acceso y uso de LarpKing, disponible en ${SITE_DOMAIN}.`,
              "LarpKing es un servicio de transformacion de imagenes con IA para crear visuales lifestyle, sociales, moda, viajes, restaurantes, lujo o creativos a partir de imagenes y/o prompts del usuario.",
              "La version francesa prevalece sobre cualquier traduccion en caso de contradiccion.",
            ],
          },
          {
            id: "2",
            title: "2. Aceptacion y acceso",
            paragraphs: [
              "Crear una cuenta, iniciar sesion o usar el servicio implica aceptar estas condiciones.",
              "El usuario debe tener capacidad legal para usar el servicio. El uso por menores requiere autorizacion del representante legal.",
              "LarpKing puede suspender o limitar el acceso en caso de incumplimiento, abuso, riesgo de seguridad o solicitud legal.",
            ],
          },
          {
            id: "3",
            title: "3. Funcionamiento",
            paragraphs: [
              "El usuario puede subir una o varias imagenes, elegir una plantilla o introducir un prompt y lanzar una generacion con IA.",
              "Las generaciones consumen creditos. El coste depende del tipo de generacion, calidad solicitada y opciones disponibles.",
              "Los resultados pueden ser realistas, estilizados, imperfectos o inesperados. LarpKing no garantiza que el resultado coincida exactamente con la solicitud inicial.",
            ],
          },
          {
            id: "4",
            title: "4. Cuenta de usuario",
            paragraphs: [
              "El usuario debe proporcionar informacion exacta, mantener sus credenciales confidenciales y avisar de cualquier uso no autorizado.",
              `La cuenta puede eliminarse desde la configuracion cuando este disponible, o contactando con ${CONTACT_EMAIL}.`,
              "La eliminacion puede borrar historial, contenidos y creditos no usados, salvo obligaciones legales de conservacion.",
            ],
          },
          {
            id: "5",
            title: "5. Contenidos del usuario",
            paragraphs: [
              "El usuario conserva los derechos que posea sobre imagenes, textos y otros contenidos enviados a LarpKing.",
              "Al enviar contenido, concede a LarpKing una licencia no exclusiva, mundial, gratuita y limitada a lo necesario para alojar, procesar, transformar, mostrar y prestar el servicio solicitado.",
              "El usuario garantiza tener derechos, permisos y consentimientos necesarios, especialmente si la imagen muestra una persona identificable, lugar privado, marca u obra protegida.",
            ],
          },
          {
            id: "6",
            title: "6. Usos prohibidos",
            paragraphs: ["LarpKing esta pensado para creacion lifestyle y contenido creativo. Se prohibe:"],
            bullets: [
              { label: "Falta de consentimiento", text: "enviar o transformar la imagen de una persona identificable sin derechos o consentimiento requerido." },
              { label: "Engano o fraude", text: "presentar visuales generados o editados como prueba real, suplantar identidades, obtener ventajas indebidas o enganar a plataformas, empleadores, bancos, autoridades o terceros." },
              { label: "Dano reputacional", text: "crear contenido humillante, difamatorio, amenazante, acosador o perjudicial para una persona u organizacion." },
              { label: "Contenido sexual o sensible no consentido", text: "generar, editar o compartir contenido intimo, sexual, desnudez, menores, violencia, odio, extremismo o categorias ilegales." },
              { label: "Propiedad intelectual", text: "usar marcas, obras, logos, fotos, personajes o elementos protegidos sin autorizacion." },
              { label: "Automatizacion abusiva", text: "extraer, copiar, perturbar, saltar limites de creditos, enviar spam, scraping o explotar el servicio sin autorizacion." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Imagenes generadas y responsabilidad",
            paragraphs: [
              "El usuario es el unico responsable del uso, publicacion y comparticion de las imagenes generadas.",
              "Las imagenes de LarpKing deben usarse de forma leal y no para enganar, infringir derechos o evitar verificaciones de identidad.",
              "Cuando el contexto lo requiera, el usuario debe indicar que una imagen ha sido generada o editada con IA.",
            ],
          },
          {
            id: "8",
            title: "8. Propiedad intelectual de LarpKing",
            paragraphs: [
              "La interfaz, textos, graficos, logos, software, bases de datos, plantillas y elementos distintivos de LarpKing estan protegidos.",
              "Se prohibe toda reproduccion, adaptacion, extraccion, distribucion o explotacion no autorizada.",
            ],
          },
          {
            id: "9",
            title: "9. Disponibilidad y garantias",
            paragraphs: [
              "El servicio se presta con diligencia razonable, sin garantia de disponibilidad continua, resultado exacto, ausencia de errores o adecuacion a un uso particular.",
              "LarpKing puede modificar, suspender o interrumpir funciones por mantenimiento, seguridad, mejora del producto o restricciones de proveedores.",
              `${SERVICE_NAME} no responde por danos indirectos, perdida de datos, oportunidades, reputacion o consecuencias de un uso no conforme.`,
            ],
          },
          {
            id: "10",
            title: "10. Cambios",
            paragraphs: [
              "Estas condiciones pueden actualizarse por cambios del servicio, ley o practicas operativas.",
              "En cambios sustanciales, LarpKing podra informar a los usuarios por cualquier medio apropiado. El uso continuado implica aceptacion.",
            ],
          },
          {
            id: "11",
            title: "11. Ley aplicable y contacto",
            paragraphs: [
              "Estas condiciones se rigen por la ley francesa.",
              `Para preguntas sobre estas condiciones: ${CONTACT_EMAIL}.`,
              "En caso de disputa, las partes buscaran una solucion amistosa antes de acciones judiciales. Los tribunales competentes se determinan por las reglas procesales aplicables.",
            ],
          },
        ],
      },
      cgv: {
        title: "Condiciones de Venta",
        sections: [
          {
            id: "1",
            title: "1. Objeto",
            paragraphs: [
              "Estas Condiciones de Venta regulan suscripciones, pagos y uso de las ofertas de pago de LarpKing.",
              `El vendedor es ${COMPANY_TRADE_NAME}, autonomo (SIRET: ${COMPANY_SIRET}), ${COMPANY_ADDRESS}.`,
              "La version francesa prevalece sobre cualquier traduccion en caso de contradiccion.",
            ],
          },
          {
            id: "2",
            title: "2. Ofertas de pago",
            paragraphs: ["Las ofertas de pago dan acceso a creditos y funciones adicionales para generar, conservar, descargar o compartir imagenes."],
            bullets: [
              { text: "Plan Descubrimiento: 250 creditos por ciclo de facturacion mensual." },
              { text: "Plan Esencial: 850 creditos por ciclo de facturacion mensual + 250 creditos de regalo." },
              { text: "Plan Ultimate: 2500 creditos por ciclo de facturacion mensual." },
              { text: "Acceso a plantillas y opciones disponibles segun la oferta activa." },
              { text: "Imagenes generadas accesibles en el historial mientras el servicio las conserve." },
              { text: "Los creditos no usados no son dinero, no se reembolsan en efectivo y pueden expirar al final del ciclo segun la oferta." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Precios",
            paragraphs: [
              "Los precios mostrados en la app y en checkout prevalecen en el momento del pedido.",
              "A titulo informativo, las ofertas actuales son 8,90 EUR, 19,90 EUR y 39,90 EUR por mes.",
              "IVA no aplicable segun el articulo 293 B del Codigo General de Impuestos frances, salvo cambio fiscal o indicacion contraria en checkout.",
              "Los precios pueden cambiar. Los cambios se aplican al siguiente ciclo o nuevos pedidos, nunca retroactivamente a un periodo ya pagado.",
            ],
          },
          {
            id: "4",
            title: "4. Suscripcion y renovacion",
            paragraphs: [
              "La suscripcion se realiza online mediante Stripe Checkout u otro flujo de pago mostrado en la app.",
              "Salvo indicacion contraria, la suscripcion se renueva automaticamente hasta su cancelacion por el usuario.",
              "Antes de pagar, el usuario puede revisar oferta, precio, periodo, creditos incluidos y corregir informacion.",
            ],
          },
          {
            id: "5",
            title: "5. Pago y facturas",
            paragraphs: [
              "Los pagos son procesados por Stripe. LarpKing no almacena datos completos de tarjeta.",
              "En caso de fallo de pago, el acceso a funciones de pago puede suspenderse hasta regularizacion.",
              "Facturas y recibos, cuando esten disponibles, se consultan en el portal de Stripe o pueden solicitarse a soporte.",
            ],
          },
          {
            id: "6",
            title: "6. Desistimiento y contenido digital",
            paragraphs: [
              "Para consumidores, se aplica el plazo legal de desistimiento de 14 dias salvo excepcion legal.",
              "Si el usuario inicia una generacion, consume creditos o solicita ejecucion inmediata de contenido digital antes de que termine el plazo, reconoce que la prestacion empieza de inmediato y que puede perder el derecho de desistimiento para la prestacion ya ejecutada.",
              "Si no se ha consumido ningun credito ni iniciado el servicio digital, puede enviarse una solicitud de desistimiento o reembolso dentro de los 14 dias siguientes a la suscripcion.",
            ],
          },
          {
            id: "7",
            title: "7. Cancelacion",
            paragraphs: [
              "El usuario puede cancelar su suscripcion desde la configuracion, el portal de Stripe o contactando con soporte.",
              "La cancelacion surte efecto al final del periodo pagado. El acceso permanece activo hasta entonces salvo incumplimiento.",
              "No se debe reembolso prorrateado por cancelacion anticipada, salvo obligacion legal o gesto comercial.",
            ],
          },
          {
            id: "8",
            title: "8. Reembolsos e incidencias",
            paragraphs: [
              `Las solicitudes sobre errores de facturacion, pagos no reconocidos, incidencias tecnicas graves o reembolsos deben enviarse a ${CONTACT_EMAIL}.`,
              "Cada solicitud se analiza caso por caso considerando uso de creditos, historial de pago y naturaleza de la incidencia.",
              "En caso de indisponibilidad prolongada imputable a LarpKing, puede proponerse compensacion en creditos, extension de acceso o reembolso parcial.",
            ],
          },
          {
            id: "9",
            title: "9. Soporte y mediacion",
            paragraphs: [
              `Para preguntas sobre pedidos, suscripciones, pagos o facturas: ${CONTACT_EMAIL}.`,
              "LarpKing intenta responder en 48 horas laborables.",
              "Para disputas de consumo no resueltas, el consumidor puede recurrir gratuitamente a un mediador competente segun los articulos L.611-1 y siguientes del Codigo de Consumo frances.",
            ],
          },
          {
            id: "10",
            title: "10. Ley aplicable",
            paragraphs: [
              "Estas Condiciones de Venta se rigen por la ley francesa.",
              "Los tribunales competentes se determinan por las reglas procesales aplicables, sin privar al consumidor de protecciones imperativas de su pais de residencia cuando apliquen.",
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
            bullets: COMPANY_DETAILS.es,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Datos recogidos",
            paragraphs: ["Al usar LarpKing, podemos recoger las siguientes categorias:"],
            bullets: [
              { label: "Cuenta", text: "email, ID de usuario, idioma preferido, estado de suscripcion, aceptacion de condiciones." },
              { label: "Contenido", text: "imagenes subidas, imagenes generadas, plantillas seleccionadas, prompts, ajustes e historial." },
              { label: "Pago", text: "IDs de cliente y suscripcion Stripe, estado de pago, facturas e informacion transaccional; los datos completos de tarjeta son tratados por Stripe." },
              { label: "Tecnico", text: "IP, logs, navegador, dispositivo, errores, eventos de seguridad y datos necesarios para operar el servicio." },
              { label: "Soporte", text: "mensajes de soporte e informacion necesaria para gestionar solicitudes." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Finalidades",
            bullets: [
              { text: "Crear y gestionar cuentas." },
              { text: "Proporcionar generaciones IA, plantillas, creditos, historial y descargas." },
              { text: "Gestionar pagos, suscripciones, reembolsos, facturas y soporte." },
              { text: "Prevenir abusos, fraude, usos prohibidos y proteger el servicio." },
              { text: "Diagnosticar errores, medir rendimiento y mejorar LarpKing." },
              { text: "Cumplir obligaciones legales, contables, fiscales y probatorias." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Bases legales",
            bullets: [
              { label: "Ejecucion del contrato", text: "prestacion del servicio, cuenta, generaciones, creditos, suscripciones y soporte." },
              { label: "Consentimiento", text: "acciones voluntarias, comunicaciones opcionales o cookies no esenciales si se activan." },
              { label: "Interes legitimo", text: "seguridad, prevencion de abusos, mejora del producto y defensa de derechos de LarpKing." },
              { label: "Obligacion legal", text: "facturacion, contabilidad, impuestos y respuesta a autoridades competentes." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Destinatarios y encargados",
            paragraphs: ["Los datos solo son accesibles a personas y proveedores que los necesitan para prestar, asegurar o administrar el servicio."],
            bullets: TECH_PROVIDERS.es,
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Transferencias fuera de la UE",
            paragraphs: [
              "Algunos proveedores pueden tratar datos fuera de la Union Europea.",
              "Cuando sea necesario, LarpKing se apoya en mecanismos de transferencia disponibles, incluidas clausulas contractuales tipo, garantias contractuales y medidas de seguridad de proveedores.",
            ],
          },
          {
            id: "7",
            title: "7. Conservacion",
            bullets: [
              { label: "Cuenta", text: "durante el uso de la cuenta, luego eliminacion o anonimizacion en plazo razonable salvo conservacion legal." },
              { label: "Imagenes y prompts", text: "mientras sea necesario para el servicio e historial, hasta eliminacion por el usuario o de la cuenta, salvo obligacion legal o necesidad de seguridad." },
              { label: "Facturacion", text: "hasta 10 anos para registros contables y justificantes." },
              { label: "Logs tecnicos", text: "hasta 12 meses, salvo investigacion de seguridad u obligacion legal." },
              { label: "Soporte", text: "hasta 3 anos tras el ultimo contacto util." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "8",
            title: "8. Cookies y almacenamiento local",
            paragraphs: [
              "LarpKing usa cookies o tecnologias similares necesarias para autenticacion, seguridad, sesion, idioma y funcionamiento.",
              "No se instala cookie publicitaria sin base legal adecuada. Si se anaden cookies no esenciales, se ofrecera un mecanismo de eleccion cuando sea requerido.",
            ],
          },
          {
            id: "9",
            title: "9. Derechos",
            paragraphs: [`Puede ejercer sus derechos escribiendo a ${CONTACT_EMAIL}. Responderemos dentro de los plazos del RGPD.`],
            bullets: [
              { text: "Acceso, rectificacion y supresion." },
              { text: "Limitacion y oposicion." },
              { text: "Portabilidad cuando aplique." },
              { text: "Retirada del consentimiento cuando el tratamiento se base en el." },
              { text: "Derecho a reclamar ante la CNIL: cnil.fr." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "10",
            title: "10. Seguridad",
            paragraphs: [
              "LarpKing aplica medidas tecnicas y organizativas razonables contra acceso no autorizado, perdida, alteracion o divulgacion.",
              "Ningun servicio online garantiza seguridad absoluta. El usuario debe proteger sus credenciales y avisar de incidentes sospechosos.",
            ],
          },
          {
            id: "11",
            title: "11. Tratamiento IA de imagenes",
            paragraphs: [
              "Las imagenes subidas pueden contener datos personales segun su contenido. Se tratan para producir la generacion solicitada.",
              "LarpKing no tiene como finalidad identificar personas, autenticar identidades ni tomar decisiones con efectos juridicos desde imagenes.",
              "Los contenidos pueden enviarse a proveedores IA estrictamente para ejecutar generaciones y operar el servicio, segun sus garantias contractuales aplicables.",
            ],
          },
          {
            id: "12",
            title: "12. Actualizaciones y contacto",
            paragraphs: [
              "Esta politica puede actualizarse por cambios del servicio, proveedores o regulacion.",
              `Para preguntas de privacidad: ${CONTACT_EMAIL}.`,
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
            paragraphs: [`El sitio ${SITE_DOMAIN} es editado por:`],
            bullets: COMPANY_DETAILS.es,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Director de publicacion",
            paragraphs: [`El director de publicacion es ${COMPANY_TRADE_NAME}, contactable en ${CONTACT_EMAIL}.`],
          },
          {
            id: "3",
            title: "3. Alojamiento",
            paragraphs: ["El sitio esta alojado por:"],
            bullets: HOSTING_DETAILS.es,
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Proveedores tecnicos",
            paragraphs: ["LarpKing se apoya en particular en los siguientes proveedores:"],
            bullets: TECH_PROVIDERS.es,
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Propiedad intelectual",
            paragraphs: [
              "Marcas, logos, textos, interfaces, plantillas, software, bases de datos y graficos de LarpKing estan protegidos.",
              "Se prohibe toda reproduccion, extraccion, adaptacion o explotacion no autorizada.",
              "Los usuarios conservan derechos sobre sus contenidos, sujeto a los derechos concedidos a LarpKing para prestar el servicio.",
            ],
          },
          {
            id: "6",
            title: "6. Responsabilidad",
            paragraphs: [
              "LarpKing ofrece un servicio de transformacion de imagenes con IA para fines creativos y lifestyle.",
              "El editor no garantiza exactitud, disponibilidad permanente ni adecuacion de resultados a un uso especifico.",
              "El usuario sigue siendo responsable de las imagenes que sube, genera, publica o comparte.",
            ],
          },
          {
            id: "7",
            title: "7. Datos personales y cookies",
            paragraphs: ["La informacion sobre datos personales, cookies y derechos se detalla en la Politica de Privacidad."],
          },
          {
            id: "8",
            title: "8. Contacto",
            paragraphs: [`Para preguntas sobre el aviso legal: ${CONTACT_EMAIL}.`],
          },
        ],
      },
    },
  },
  de: {
    backHome: "Zuruck zur Startseite",
    lastUpdated: "Letzte Aktualisierung: 31. Mai 2026",
    docs: {
      cgu: {
        title: "Nutzungsbedingungen",
        sections: [
          {
            id: "1",
            title: "1. Zweck",
            paragraphs: [
              `Diese Nutzungsbedingungen regeln den Zugang zu LarpKing und dessen Nutzung, verfugbar unter ${SITE_DOMAIN}.`,
              "LarpKing ist ein KI-Bildtransformationsdienst zur Erstellung von Lifestyle-, Social-, Mode-, Reise-, Restaurant-, Luxus- oder Kreativvisuals aus Bildern und/oder Prompts der Nutzer.",
              "Bei Widerspruchen ist die franzosische Fassung massgeblich.",
            ],
          },
          {
            id: "2",
            title: "2. Annahme und Zugang",
            paragraphs: [
              "Die Kontoerstellung, Anmeldung oder Nutzung des Dienstes bedeutet die vollstandige Annahme dieser Bedingungen.",
              "Nutzer mussen rechtsfahig sein. Die Nutzung durch Minderjahrige erfordert die Zustimmung eines gesetzlichen Vertreters.",
              "LarpKing kann den Zugang bei Verstoss, Missbrauch, Sicherheitsrisiko oder rechtlicher Anfrage aussetzen oder beschranken.",
            ],
          },
          {
            id: "3",
            title: "3. Funktionsweise",
            paragraphs: [
              "Nutzer konnen ein oder mehrere Bilder hochladen, ein Template auswahlen oder einen Prompt eingeben und eine KI-Generierung starten.",
              "Generierungen verbrauchen Credits. Die Kosten hangen von Typ, gewunschter Qualitat und verfugbaren Optionen ab.",
              "Ergebnisse konnen realistisch, stilisiert, unvollkommen oder unerwartet sein. LarpKing garantiert keine exakte Ubereinstimmung mit der Anfrage.",
            ],
          },
          {
            id: "4",
            title: "4. Nutzerkonto",
            paragraphs: [
              "Nutzer mussen richtige Informationen angeben, Zugangsdaten vertraulich halten und unbefugte Nutzung melden.",
              `Das Konto kann uber Einstellungen, sofern verfugbar, oder per Kontakt an ${CONTACT_EMAIL} geloscht werden.`,
              "Eine Loschung kann Verlauf, Inhalte und nicht genutzte Credits entfernen, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.",
            ],
          },
          {
            id: "5",
            title: "5. Nutzerinhalte",
            paragraphs: [
              "Nutzer behalten die Rechte, die sie an Bildern, Texten und sonstigen an LarpKing ubermittelten Inhalten besitzen.",
              "Mit der Ubermittlung gewahren Nutzer LarpKing eine nicht-exklusive, weltweite, unentgeltliche Lizenz, beschrankt auf Hosting, Verarbeitung, Transformation, Anzeige und Bereitstellung des angeforderten Dienstes.",
              "Nutzer sichern zu, alle erforderlichen Rechte, Erlaubnisse und Einwilligungen zu besitzen, insbesondere bei identifizierbaren Personen, privaten Orten, Marken oder geschutzten Werken.",
            ],
          },
          {
            id: "6",
            title: "6. Verbotene Nutzungen",
            paragraphs: ["LarpKing ist fur Lifestyle-Bilder und kreative Inhalte bestimmt. Verboten sind:"],
            bullets: [
              { label: "Keine Einwilligung", text: "Bilder identifizierbarer Personen ohne erforderliche Rechte oder Einwilligung hochzuladen oder zu transformieren." },
              { label: "Tauschung oder Betrug", text: "generierte oder bearbeitete Visuals als echte Beweise darzustellen, Identitaten vorzutauchen, unberechtigte Vorteile zu erlangen oder Plattformen, Arbeitgeber, Banken, Behorden oder Dritte zu tauschen." },
              { label: "Rufschadigung", text: "erniedrigende, verleumderische, bedrohende, belagigende oder schadigende Inhalte uber Personen oder Organisationen zu erstellen." },
              { label: "Nicht einvernehmliche sexuelle oder sensible Inhalte", text: "intime Inhalte, sexuelle Inhalte, Nacktheit, Minderjahrige, Gewalt, Hass, Extremismus oder illegale Kategorien zu generieren, zu bearbeiten oder zu teilen." },
              { label: "Geistiges Eigentum", text: "Marken, Werke, Logos, Fotos, Figuren oder geschutzte Elemente ohne Genehmigung zu verwenden." },
              { label: "Missbrauchliche Automatisierung", text: "den Dienst auszulesen, zu kopieren, zu storen, Credit-Limits zu umgehen, Spam, Scraping oder nicht autorisierte Auswertung vorzunehmen." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "7",
            title: "7. Generierte Bilder und Verantwortung",
            paragraphs: [
              "Nutzer sind allein verantwortlich fur Nutzung, Veroffentlichung und Teilen generierter Bilder.",
              "Bilder aus LarpKing mussen fair genutzt werden und durfen nicht zur Irrefuhrung, Rechtsverletzung oder Umgehung von Identitatsprufungen verwendet werden.",
              "Wenn der Kontext es erfordert, muss offengelegt werden, dass ein Bild durch KI generiert oder bearbeitet wurde.",
            ],
          },
          {
            id: "8",
            title: "8. Geistiges Eigentum von LarpKing",
            paragraphs: [
              "Oberflache, Texte, Grafiken, Logos, Software, Datenbanken, Templates und Kennzeichen von LarpKing sind rechtlich geschutzt.",
              "Nicht autorisierte Reproduktion, Anpassung, Extraktion, Verbreitung oder Nutzung ist verboten.",
            ],
          },
          {
            id: "9",
            title: "9. Verfugbarkeit und Gewahrleistung",
            paragraphs: [
              "Der Dienst wird mit angemessener Sorgfalt bereitgestellt, ohne Garantie kontinuierlicher Verfugbarkeit, exakter Ergebnisse, Fehlerfreiheit oder Eignung fur einen bestimmten Zweck.",
              "LarpKing kann Funktionen wegen Wartung, Sicherheit, Produktverbesserung oder Vorgaben Dritter andern, aussetzen oder einstellen.",
              `${SERVICE_NAME} haftet nicht fur mittelbare Schaden, Datenverlust, entgangene Chancen, Rufschaden oder Folgen nicht konformer Nutzung.`,
            ],
          },
          {
            id: "10",
            title: "10. Anderungen",
            paragraphs: [
              "Diese Bedingungen konnen bei Anderungen des Dienstes, der Rechtslage oder betrieblicher Ablaufe aktualisiert werden.",
              "Bei wesentlichen Anderungen kann LarpKing Nutzer uber geeignete Kanale informieren. Fortgesetzte Nutzung gilt als Annahme.",
            ],
          },
          {
            id: "11",
            title: "11. Recht und Kontakt",
            paragraphs: [
              "Diese Bedingungen unterliegen franzosischem Recht.",
              `Fragen zu diesen Bedingungen: ${CONTACT_EMAIL}.`,
              "Im Streitfall bemuhen sich die Parteien zunachst um eine einvernehmliche Losung. Zustande Gerichte werden nach den anwendbaren Verfahrensregeln bestimmt.",
            ],
          },
        ],
      },
      cgv: {
        title: "Verkaufsbedingungen",
        sections: [
          {
            id: "1",
            title: "1. Zweck",
            paragraphs: [
              "Diese Verkaufsbedingungen regeln Abonnements, Zahlungen und Nutzung kostenpflichtiger Angebote von LarpKing.",
              `Verkaufer ist ${COMPANY_TRADE_NAME}, Einzelunternehmer (SIRET: ${COMPANY_SIRET}), ${COMPANY_ADDRESS}.`,
              "Bei Widerspruchen ist die franzosische Fassung massgeblich.",
            ],
          },
          {
            id: "2",
            title: "2. Kostenpflichtige Angebote",
            paragraphs: ["Kostenpflichtige Angebote bieten Credits und zusatzliche Funktionen zum Generieren, Speichern, Herunterladen oder Teilen von Bildern."],
            bullets: [
              { text: "Discovery-Tarif: 250 Credits pro monatlichem Abrechnungszyklus." },
              { text: "Essentiel-Tarif: 850 Credits pro monatlichem Abrechnungszyklus + 250 Bonus-Credits." },
              { text: "Ultimate-Tarif: 2500 Credits pro monatlichem Abrechnungszyklus." },
              { text: "Zugang zu Templates und Optionen je nach aktivem Angebot." },
              { text: "Generierte Bilder bleiben im Kontoverlauf verfugbar, solange der Dienst sie speichert." },
              { text: "Nicht genutzte Credits sind keine Wahrung, nicht in Geld erstattbar und konnen je nach Angebot am Zyklusende verfallen." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Preise",
            paragraphs: [
              "Massgeblich sind die Preise, die in der App und beim Checkout zum Zeitpunkt der Bestellung angezeigt werden.",
              "Zur Information betragen die aktuellen Angebote 8,90 EUR, 19,90 EUR und 39,90 EUR pro Monat.",
              "Mehrwertsteuer nicht anwendbar gemass Artikel 293 B des franzosischen Steuergesetzbuchs, sofern sich der Steuerstatus nicht andert oder Checkout anderes angibt.",
              "Preise konnen geandert werden. Anderungen gelten fur den nachsten Abrechnungszyklus oder neue Bestellungen, nicht ruckwirkend fur bereits bezahlte Zeitraume.",
            ],
          },
          {
            id: "4",
            title: "4. Abonnement und Verlangerung",
            paragraphs: [
              "Abonnements werden online uber Stripe Checkout oder einen in der App angezeigten Zahlungsablauf abgeschlossen.",
              "Sofern nicht anders angegeben, verlangern sie sich automatisch bis zur Kundigung durch den Nutzer.",
              "Vor Zahlung konnen Nutzer Angebot, Preis, Zeitraum, enthaltene Credits und Angaben prufen und korrigieren.",
            ],
          },
          {
            id: "5",
            title: "5. Zahlung und Rechnungen",
            paragraphs: [
              "Zahlungen werden von Stripe verarbeitet. LarpKing speichert keine vollstandigen Kartendaten.",
              "Bei fehlgeschlagener Zahlung kann der Zugang zu kostenpflichtigen Funktionen bis zur Klarung ausgesetzt werden.",
              "Rechnungen und Belege konnen, sofern verfugbar, im Stripe-Kundenportal eingesehen oder beim Support angefordert werden.",
            ],
          },
          {
            id: "6",
            title: "6. Widerruf und digitale Inhalte",
            paragraphs: [
              "Fur Verbraucher gilt die gesetzliche Widerrufsfrist von 14 Tagen, sofern keine gesetzliche Ausnahme greift.",
              "Wenn ein Nutzer vor Ablauf der Frist eine Generierung startet, Credits verbraucht oder sofortige Ausfuhrung digitaler Inhalte verlangt, erkennt er an, dass die Leistung sofort beginnt und das Widerrufsrecht fur bereits erbrachte Leistungen verloren gehen kann.",
              "Wenn keine Credits verbraucht und keine digitale Leistung begonnen wurde, kann innerhalb von 14 Tagen ab Abonnement eine Widerrufs- oder Erstattungsanfrage gesendet werden.",
            ],
          },
          {
            id: "7",
            title: "7. Kundigung",
            paragraphs: [
              "Nutzer konnen ihr Abonnement jederzeit uber Einstellungen, das Stripe-Kundenportal oder den Support kundigen.",
              "Die Kundigung wirkt zum Ende des bezahlten Zeitraums. Bezahlter Zugang bleibt bis dahin aktiv, sofern kein Verstoss vorliegt.",
              "Eine anteilige Erstattung allein wegen vorzeitiger Kundigung ist nicht geschuldet, ausser gesetzlich vorgeschrieben oder freiwillig gewahrt.",
            ],
          },
          {
            id: "8",
            title: "8. Erstattungen und Vorfalle",
            paragraphs: [
              `Anfragen zu Abrechnungsfehlern, unbekannten Zahlungen, schweren technischen Vorfallen oder Erstattungen sind an ${CONTACT_EMAIL} zu senden.`,
              "Jede Anfrage wird einzelfallbezogen unter Berucksichtigung von Credit-Nutzung, Zahlungshistorie und Art des Vorfalls gepruft.",
              "Bei langerer Nichtverfugbarkeit, die LarpKing zuzurechnen ist, kann eine Kompensation als Credits, Zugangsverlangerung oder Teilerstattung angeboten werden.",
            ],
          },
          {
            id: "9",
            title: "9. Support und Mediation",
            paragraphs: [
              `Fragen zu Bestellung, Abonnement, Zahlung oder Rechnung: ${CONTACT_EMAIL}.`,
              "LarpKing bemuht sich, innerhalb von 48 Geschaftsstunden zu antworten.",
              "Bei ungelosten Verbraucherstreitigkeiten konnen Verbraucher nach Art. L.611-1 ff. des franzosischen Verbrauchergesetzbuchs kostenlos eine zustandige Verbraucherschlichtung nutzen.",
            ],
          },
          {
            id: "10",
            title: "10. Anwendbares Recht",
            paragraphs: [
              "Diese Verkaufsbedingungen unterliegen franzosischem Recht.",
              "Zustandige Gerichte bestimmen sich nach den anwendbaren Verfahrensregeln, ohne Verbraucher zwingender Schutzrechte ihres Wohnsitzlandes zu berauben, soweit diese gelten.",
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
            paragraphs: ["Verantwortlicher fur die Datenverarbeitung ist:"],
            bullets: COMPANY_DETAILS.de,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Erhobene Daten",
            paragraphs: ["Bei Nutzung von LarpKing konnen folgende Kategorien erhoben werden:"],
            bullets: [
              { label: "Konto", text: "E-Mail, Nutzer-ID, bevorzugte Sprache, Abonnementstatus, Zustimmung zu Bedingungen." },
              { label: "Inhalte", text: "hochgeladene Bilder, generierte Bilder, ausgewahlte Templates, Prompts, Einstellungen und Verlauf." },
              { label: "Zahlung", text: "Stripe-Kunden- und Abonnement-IDs, Zahlungsstatus, Rechnungen und Transaktionsdaten; vollstandige Kartendaten verarbeitet Stripe." },
              { label: "Technik", text: "IP-Adresse, Logs, Browser, Gerat, Fehler, Sicherheitsereignisse und fur den Betrieb notwendige Daten." },
              { label: "Support", text: "Support-Nachrichten und zur Bearbeitung notwendige Informationen." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "3",
            title: "3. Zwecke",
            bullets: [
              { text: "Erstellung und Verwaltung von Nutzerkonten." },
              { text: "Bereitstellung von KI-Generierungen, Templates, Credits, Verlauf und Downloads." },
              { text: "Verwaltung von Zahlungen, Abonnements, Erstattungen, Rechnungen und Support." },
              { text: "Missbrauch, Betrug und verbotene Nutzungen verhindern und den Dienst sichern." },
              { text: "Fehler diagnostizieren, Leistung messen und LarpKing verbessern." },
              { text: "Gesetzliche, buchhalterische, steuerliche und Nachweispflichten erfullen." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "4",
            title: "4. Rechtsgrundlagen",
            bullets: [
              { label: "Vertragserfullung", text: "Dienstleistung, Konto, Generierungen, Credits, Abonnements und Support." },
              { label: "Einwilligung", text: "freiwillige Nutzeraktionen, optionale Kommunikation oder nicht notwendige Cookies, wenn aktiviert." },
              { label: "Berechtigtes Interesse", text: "Sicherheit, Missbrauchspravention, Produktverbesserung und Verteidigung von Rechten." },
              { label: "Rechtliche Pflicht", text: "Abrechnung, Buchhaltung, Steuern und Antworten an zustandige Behorden." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Empfanger und Auftragsverarbeiter",
            paragraphs: ["Daten sind nur Personen und Anbietern zuganglich, die sie zur Bereitstellung, Sicherung oder Verwaltung des Dienstes benotigen."],
            bullets: TECH_PROVIDERS.de,
            bulletStyle: "disc",
          },
          {
            id: "6",
            title: "6. Ubermittlungen ausserhalb der EU",
            paragraphs: [
              "Einige Anbieter konnen Daten ausserhalb der Europaischen Union verarbeiten.",
              "Soweit erforderlich, nutzt LarpKing verfugbare Transfermechanismen, insbesondere Standardvertragsklauseln, vertragliche Garantien und Sicherheitsmassnahmen der Anbieter.",
            ],
          },
          {
            id: "7",
            title: "7. Aufbewahrung",
            bullets: [
              { label: "Konto", text: "fur die Dauer der Kontonutzung, danach Loschung oder Anonymisierung innerhalb angemessener Frist, sofern keine gesetzliche Aufbewahrungspflicht besteht." },
              { label: "Bilder und Prompts", text: "solange fur Dienst und Verlauf erforderlich, bis Nutzer- oder Kontoloschung, sofern keine gesetzliche Pflicht oder Sicherheitsnotwendigkeit besteht." },
              { label: "Abrechnung", text: "bis zu 10 Jahre fur Buchhaltungsunterlagen und Nachweise." },
              { label: "Technische Logs", text: "bis zu 12 Monate, sofern keine Sicherheitsuntersuchung oder rechtliche Pflicht langere Aufbewahrung erfordert." },
              { label: "Support", text: "bis zu 3 Jahre nach dem letzten nutzlichen Kontakt." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "8",
            title: "8. Cookies und lokaler Speicher",
            paragraphs: [
              "LarpKing nutzt Cookies oder ahnliche Technologien, die fur Authentifizierung, Sicherheit, Sitzung, Sprache und Betrieb erforderlich sind.",
              "Werbe-Cookies werden nicht ohne geeignete Rechtsgrundlage gesetzt. Werden nicht notwendige Cookies hinzugefugt, wird soweit erforderlich eine Auswahlmoglichkeit angeboten.",
            ],
          },
          {
            id: "9",
            title: "9. Rechte",
            paragraphs: [`Rechte konnen jederzeit per Nachricht an ${CONTACT_EMAIL} ausgeubt werden. Wir antworten innerhalb der DSGVO-Fristen.`],
            bullets: [
              { text: "Auskunft, Berichtigung und Loschung." },
              { text: "Einschrankung und Widerspruch." },
              { text: "Datenubertragbarkeit, soweit anwendbar." },
              { text: "Widerruf der Einwilligung, wenn die Verarbeitung darauf beruht." },
              { text: "Beschwerderecht bei der CNIL: cnil.fr." },
            ],
            bulletStyle: "disc",
          },
          {
            id: "10",
            title: "10. Sicherheit",
            paragraphs: [
              "LarpKing setzt angemessene technische und organisatorische Massnahmen gegen unbefugten Zugriff, Verlust, Anderung oder Offenlegung ein.",
              "Kein Online-Dienst kann absolute Sicherheit garantieren. Nutzer mussen Zugangsdaten schutzen und Verdachtsfalle melden.",
            ],
          },
          {
            id: "11",
            title: "11. KI-Bildverarbeitung",
            paragraphs: [
              "Hochgeladene Bilder konnen je nach Inhalt personenbezogene Daten enthalten. Sie werden verarbeitet, um die angeforderte Generierung zu erstellen.",
              "LarpKing bezweckt nicht, Personen zu identifizieren, Identitaten zu authentifizieren oder Entscheidungen mit rechtlicher Wirkung anhand von Bildern zu treffen.",
              "Inhalte konnen streng zur Generierung und zum Betrieb des Dienstes an KI-Anbieter ubermittelt werden, nach deren anwendbaren vertraglichen Garantien.",
            ],
          },
          {
            id: "12",
            title: "12. Updates und Kontakt",
            paragraphs: [
              "Diese Erklarung kann bei Anderungen des Dienstes, der Anbieter oder Regulierung aktualisiert werden.",
              `Fragen zum Datenschutz: ${CONTACT_EMAIL}.`,
            ],
          },
        ],
      },
      legalNotice: {
        title: "Impressum",
        sections: [
          {
            id: "1",
            title: "1. Herausgeber",
            paragraphs: [`Die Website ${SITE_DOMAIN} wird herausgegeben von:`],
            bullets: COMPANY_DETAILS.de,
            bulletStyle: "none",
          },
          {
            id: "2",
            title: "2. Verantwortlich fur die Veroffentlichung",
            paragraphs: [`Verantwortlich fur die Veroffentlichung ist ${COMPANY_TRADE_NAME}, erreichbar unter ${CONTACT_EMAIL}.`],
          },
          {
            id: "3",
            title: "3. Hosting",
            paragraphs: ["Die Website wird gehostet von:"],
            bullets: HOSTING_DETAILS.de,
            bulletStyle: "none",
          },
          {
            id: "4",
            title: "4. Technische Anbieter",
            paragraphs: ["LarpKing nutzt insbesondere folgende technische Anbieter:"],
            bullets: TECH_PROVIDERS.de,
            bulletStyle: "disc",
          },
          {
            id: "5",
            title: "5. Geistiges Eigentum",
            paragraphs: [
              "Marken, Logos, Texte, Oberflachen, Templates, Software, Datenbanken und Grafiken von LarpKing sind geschutzt.",
              "Nicht autorisierte Reproduktion, Extraktion, Anpassung oder Nutzung ist verboten.",
              "Nutzer behalten Rechte an ihren Inhalten, vorbehaltlich der LarpKing zur Leistungserbringung gewahrten Rechte.",
            ],
          },
          {
            id: "6",
            title: "6. Haftung",
            paragraphs: [
              "LarpKing bietet einen KI-Bildtransformationsdienst fur kreative und Lifestyle-Zwecke.",
              "Der Herausgeber garantiert weder Genauigkeit, dauerhafte Verfugbarkeit noch Eignung der Ergebnisse fur bestimmte Zwecke.",
              "Nutzer bleiben verantwortlich fur Bilder, die sie hochladen, generieren, veroffentlichen oder teilen.",
            ],
          },
          {
            id: "7",
            title: "7. Personenbezogene Daten und Cookies",
            paragraphs: ["Informationen zu personenbezogenen Daten, Cookies und Nutzerrechten stehen in der Datenschutzerklarung."],
          },
          {
            id: "8",
            title: "8. Kontakt",
            paragraphs: [`Fragen zum Impressum: ${CONTACT_EMAIL}.`],
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
