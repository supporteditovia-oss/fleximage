export const resources = {
  fr: {
    common: {
      actions: {
        save: "Enregistrer",
        cancel: "Annuler",
        delete: "Supprimer",
        signOut: "Déconnexion",
        redirecting: "Redirection...",
      },
      states: {
        active: "Actif",
        canceled: "Annulé",
        inactive: "Inactif",
      },
      labels: {
        email: "Email",
      },
      messages: {
        error: "Erreur",
        requiredAction: "Action requise",
        validationIncorrect: "Validation incorrecte",
      },
      privacy: {
        gdpr: "Les données sont traitées conformément au RGPD.",
      },
      loading: {
        platform: "Chargement de la plateforme...",
      },
    },
    settings: {
      title: "Paramètres",
      sections: {
        profile: "Profil",
        subscription: "Abonnement",
        account: "Compte",
        language: "Langue",
      },
      profile: {
        namePlaceholder: "Ton nom",
        updatedTitle: "Profil mis à jour",
        updatedDescription: "Tes modifications ont été enregistrées.",
        emailImmutable: "Non modifiable",
      },
      language: {
        fieldLabel: "Langue de l'interface",
        currentLabel: "Langue actuelle",
        updatedTitle: "Langue mise à jour",
        updatedDescription: "La langue a été appliquée immédiatement.",
        options: {
          fr: "Français",
          en: "Anglais",
          es: "Espagnol",
          de: "Allemand",
        },
      },
      subscription: {
        title: "Abonnement",
        price: "4,90€/semaine",
        videoPrice: "9,90€/semaine",
        noneActive: "Aucun abonnement actif",
        manage: "Gérer mon abonnement",
        reactivate: "Réactiver mon abonnement",
      },
      account: {
        deleteAccount: "Supprimer mon compte",
      },
      deleteDialog: {
        title: "Suppression définitive",
        description: "Cette action est irréversible",
        question: "Es-tu sûr de vouloir supprimer ton compte ?",
        subscriberWarning:
          "Tu as un abonnement actif. Résilie-le d'abord depuis la section Abonnement.",
        irreversibleText:
          "Toutes tes données seront supprimées conformément au RGPD. Cette action ne peut pas être annulée.",
        confirmLabel: "Saisis \"SUPPRIMER\" pour confirmer",
        confirmPlaceholder: "SUPPRIMER",
        validationDescription:
          "Saisis 'SUPPRIMER' exactement en majuscules pour confirmer.",
        subscriberActionDescription:
          "Résilie d'abord ton abonnement actif avant de supprimer ton compte.",
        deletedTitle: "Compte supprimé",
        deletedDescription:
          "Ton compte et tes données ont été définitivement supprimés.",
      },
    },
    auth: {
      welcomeBack: "Bon retour parmi nous",
      createAccount: "Créer un compte",
      subtitleLogin: "Entrez vos identifiants pour vous connecter",
      subtitleRegister: "Entrez votre email pour commencer",
      googleLogin: "Se connecter avec Google",
      googleSignup: "S'inscrire avec Google",
      separator: "ou",
      fields: {
        email: "Email",
        password: "Mot de passe",
      },
      emailPlaceholder: "nom@exemple.com",
      invalidEmailTitle: "Email invalide",
      invalidEmailDescription: "Veuillez entrer une adresse email valide.",
      passwordStrength: "Robustesse:",
      strength: {
        short: "Trop court",
        weak: "Faible",
        medium: "Moyenne",
        strong: "Forte",
        excellent: "Excellente",
      },
      acceptTermsPrefix: "En vous inscrivant, vous acceptez nos",
      termsLink: "CGU",
      submit: {
        login: "Se connecter",
        register: "S'inscrire",
      },
      toggle: {
        noAccount: "Pas encore de compte ? S'inscrire",
        hasAccount: "Déjà un compte ? Se connecter",
      },
      signInSuccessTitle: "Bon retour !",
      signInSuccessDescription: "Connexion réussie.",
    },
    paywall: {
      imageAlt: "Prank généré",
      title: "Révèle-le maintenant !",
      subtitle: "Ton prank est prêt.",
      upgradeTitle: "Débloque la génération vidéo !",
      benefits: {
        noWatermark: "Sans filigrane",
        instantResult: "Résultat instantané",
        allTemplates: "Tous les templates image inclus",
        imageIncluded: "Images incluses aussi",
        videoIncluded: "Débloque aussi la vidéo",
        fast: "Génération rapide",
        ultraFast: "Ultra rapide",
        upTo20Images: "Jusqu'à 20 images",
        upTo40Images: "Jusqu'à 40 images",
        videoTemplates: "Vidéos incluses + tous les templates",
      },
      plans: {
        image: {
          name: "Image",
          price: "4,90€",
          credits: "100 crédits",
        },
        video: {
          name: "Image + Video",
          badge: "Meilleur choix",
          price: "9,90€",
          credits: "200 crédits",
          priceLine: "9,90€/semaine · Résiliable à tout moment",
        },
      },
      monthlySent: "🔥 {{count}} pranks envoyés ce mois",
      upgradeHelper: "Ton plan actuel garde les images. Upgrade pour lancer les vidéos.",
      unlockCta: "Debloquer mon prank",
      upgradeCta: "Upgrade et lancer ma vidéo",
      priceLine: "4,90€/semaine · Résiliable à tout moment",
    },
    errors: {
      generic: {
        title: "Une erreur est survenue",
        description:
          "Une erreur inattendue s'est produite. Veuillez contacter le support si le problème persiste.",
        serverDefault: "Erreur serveur",
      },
      auth: {
        invalidLoginCredentials: {
          title: "Identifiants invalides",
          description:
            "L'email ou le mot de passe est incorrect. Veuillez réessayer.",
        },
        userAlreadyRegistered: {
          title: "Compte existant",
          description:
            "Un utilisateur est déjà inscrit avec cette adresse email.",
        },
        passwordTooShort: {
          title: "Mot de passe trop court",
          description:
            "Le mot de passe doit contenir au moins 6 caractères.",
        },
        emailNotConfirmed: {
          title: "Email non confirmé",
          description:
            "Veuillez vérifier votre boîte de réception et confirmer votre email.",
        },
        networkFailed: {
          title: "Erreur réseau",
          description:
            "Impossible de contacter le serveur. Vérifiez votre connexion internet.",
        },
        tooManyRequests: {
          title: "Trop de tentatives",
          description: "Veuillez patienter un moment avant de réessayer.",
        },
        signupDisabled: {
          title: "Inscriptions fermées",
          description:
            "Les nouvelles inscriptions sont temporairement désactivées.",
        },
        rateLimitExceeded: {
          title: "Limite atteinte",
          description:
            "Vous avez effectué trop de tentatives. Veuillez réessayer plus tard.",
        },
        userNotFound: {
          title: "Utilisateur introuvable",
          description: "Aucun compte n'est associé à cette adresse email.",
        },
        invalidEmail: {
          title: "Email invalide",
          description: "Le format de l'adresse email n'est pas correct.",
        },
        databaseError: {
          title: "Erreur de base de données",
          description:
            "Un problème est survenu lors de l'enregistrement de vos données. Veuillez réessayer.",
        },
        anonymousDisabled: {
          title: "Connexion anonyme désactivée",
          description:
            "Les connexions anonymes ne sont pas autorisées sur cette application.",
        },
        confirmationTokenNotFound: {
          title: "Lien expiré",
          description:
            "Le lien de confirmation a expiré ou a déjà été utilisé.",
        },
        providerDisabled: {
          title: "Service indisponible",
          description:
            "La connexion via ce fournisseur (ex: Google) est actuellement désactivée.",
        },
      },
    },
    meta: {
      appName: "TurboPrank",
      titles: {
        home: "TurboPrank — Crée des pranks personnalisés avec l'IA",
        login: "Connexion — TurboPrank",
        register: "Inscription — TurboPrank",
        generate: "Crée ton prank — TurboPrank",
        history: "Historique — TurboPrank",
        settings: "Paramètres — TurboPrank",
        admin: "Admin — TurboPrank",
        adminUsers: "Utilisateurs — TurboPrank",
        adminTemplates: "Templates — TurboPrank",
        legal: "Mentions légales — TurboPrank",
        cgu: "CGU — TurboPrank",
        cgv: "CGV — TurboPrank",
        privacy: "Politique de confidentialité — TurboPrank",
      },
    },
  },
  en: {
    common: {
      actions: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        signOut: "Sign out",
        redirecting: "Redirecting...",
      },
      states: {
        active: "Active",
        canceled: "Canceled",
        inactive: "Inactive",
      },
      labels: {
        email: "Email",
      },
      messages: {
        error: "Error",
        requiredAction: "Action required",
        validationIncorrect: "Invalid confirmation",
      },
      privacy: {
        gdpr: "Data is processed in compliance with GDPR.",
      },
      loading: {
        platform: "Loading platform...",
      },
    },
    settings: {
      title: "Settings",
      sections: {
        profile: "Profile",
        subscription: "Subscription",
        account: "Account",
        language: "Language",
      },
      profile: {
        namePlaceholder: "Your name",
        updatedTitle: "Profile updated",
        updatedDescription: "Your changes have been saved.",
        emailImmutable: "Read-only",
      },
      language: {
        fieldLabel: "Interface language",
        currentLabel: "Current language",
        updatedTitle: "Language updated",
        updatedDescription: "Language was applied immediately.",
        options: {
          fr: "French",
          en: "English",
          es: "Spanish",
          de: "German",
        },
      },
      subscription: {
        title: "Subscription",
        price: "€4.90/week",
        videoPrice: "€9.90/week",
        noneActive: "No active subscription",
        manage: "Manage my subscription",
        reactivate: "Reactivate my subscription",
      },
      account: {
        deleteAccount: "Delete my account",
      },
      deleteDialog: {
        title: "Permanent deletion",
        description: "This action is irreversible",
        question: "Are you sure you want to delete your account?",
        subscriberWarning:
          "You still have an active subscription. Cancel it first in the Subscription section.",
        irreversibleText:
          "All your data will be deleted in accordance with GDPR. This action cannot be undone.",
        confirmLabel: "Type \"SUPPRIMER\" to confirm",
        confirmPlaceholder: "SUPPRIMER",
        validationDescription:
          "Type 'SUPPRIMER' exactly in uppercase to confirm.",
        subscriberActionDescription:
          "Please cancel your active subscription before deleting your account.",
        deletedTitle: "Account deleted",
        deletedDescription:
          "Your account and data were permanently deleted.",
      },
    },
    auth: {
      welcomeBack: "Welcome back",
      createAccount: "Create an account",
      subtitleLogin: "Enter your credentials to sign in",
      subtitleRegister: "Enter your email to get started",
      googleLogin: "Sign in with Google",
      googleSignup: "Sign up with Google",
      separator: "or",
      fields: {
        email: "Email",
        password: "Password",
      },
      emailPlaceholder: "name@example.com",
      invalidEmailTitle: "Invalid email",
      invalidEmailDescription: "Please enter a valid email address.",
      passwordStrength: "Strength:",
      strength: {
        short: "Too short",
        weak: "Weak",
        medium: "Medium",
        strong: "Strong",
        excellent: "Excellent",
      },
      acceptTermsPrefix: "By signing up, you accept our",
      termsLink: "Terms",
      submit: {
        login: "Sign in",
        register: "Sign up",
      },
      toggle: {
        noAccount: "No account yet? Sign up",
        hasAccount: "Already have an account? Sign in",
      },
      signInSuccessTitle: "Welcome back!",
      signInSuccessDescription: "Signed in successfully.",
    },
    paywall: {
      imageAlt: "Generated prank",
      title: "Reveal it now",
      subtitle: "Your prank is ready!",
      upgradeTitle: "Unlock video generation",
      benefits: {
        noWatermark: "No watermark",
        instantResult: "Instant result",
        allTemplates: "All image templates included",
        imageIncluded: "Images included too",
        videoIncluded: "Also unlocks video",
        fast: "Fast generation",
        ultraFast: "Ultra fast",
        upTo20Images: "Up to 20 images",
        upTo40Images: "Up to 40 images",
        videoTemplates: "Videos included + all templates",
      },
      plans: {
        image: {
          name: "Image",
          price: "€4.90",
          credits: "100 credits",
        },
        video: {
          name: "Image + Video",
          badge: "Best choice",
          price: "€9.90",
          credits: "200 credits",
          priceLine: "€9.90/week · Cancel anytime",
        },
      },
      monthlySent: "🔥 {{count}} pranks sent this month",
      upgradeHelper: "Your current plan keeps images. Upgrade to launch videos.",
      unlockCta: "Unlock my prank",
      upgradeCta: "Upgrade and launch my video",
      priceLine: "€4.90/week · Cancel anytime",
    },
    errors: {
      generic: {
        title: "Something went wrong",
        description:
          "An unexpected error occurred. Please contact support if the issue persists.",
        serverDefault: "Server error",
      },
      auth: {
        invalidLoginCredentials: {
          title: "Invalid credentials",
          description:
            "The email or password is incorrect. Please try again.",
        },
        userAlreadyRegistered: {
          title: "Account already exists",
          description: "A user is already registered with this email.",
        },
        passwordTooShort: {
          title: "Password too short",
          description: "Password must be at least 6 characters long.",
        },
        emailNotConfirmed: {
          title: "Email not confirmed",
          description:
            "Please check your inbox and confirm your email address.",
        },
        networkFailed: {
          title: "Network error",
          description:
            "Unable to reach the server. Check your internet connection.",
        },
        tooManyRequests: {
          title: "Too many attempts",
          description: "Please wait a moment before trying again.",
        },
        signupDisabled: {
          title: "Signups closed",
          description: "New registrations are temporarily disabled.",
        },
        rateLimitExceeded: {
          title: "Rate limit reached",
          description:
            "You made too many attempts. Please try again later.",
        },
        userNotFound: {
          title: "User not found",
          description: "No account is associated with this email address.",
        },
        invalidEmail: {
          title: "Invalid email",
          description: "Email address format is not valid.",
        },
        databaseError: {
          title: "Database error",
          description:
            "A problem occurred while saving your data. Please try again.",
        },
        anonymousDisabled: {
          title: "Anonymous sign-in disabled",
          description: "Anonymous sign-ins are not allowed on this app.",
        },
        confirmationTokenNotFound: {
          title: "Expired link",
          description: "The confirmation link has expired or was already used.",
        },
        providerDisabled: {
          title: "Service unavailable",
          description:
            "Sign-in with this provider (for example Google) is currently disabled.",
        },
      },
    },
    meta: {
      appName: "TurboPrank",
      titles: {
        home: "TurboPrank — Create custom AI pranks",
        login: "Sign in — TurboPrank",
        register: "Sign up — TurboPrank",
        generate: "Create your prank — TurboPrank",
        history: "History — TurboPrank",
        settings: "Settings — TurboPrank",
        admin: "Admin — TurboPrank",
        adminUsers: "Users — TurboPrank",
        adminTemplates: "Templates — TurboPrank",
        legal: "Legal notice — TurboPrank",
        cgu: "Terms — TurboPrank",
        cgv: "Sales terms — TurboPrank",
        privacy: "Privacy policy — TurboPrank",
      },
    },
  },
  es: {
    common: {
      actions: {
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        signOut: "Cerrar sesión",
        redirecting: "Redirigiendo...",
      },
      states: {
        active: "Activo",
        canceled: "Cancelado",
        inactive: "Inactivo",
      },
      labels: {
        email: "Correo electrónico",
      },
      messages: {
        error: "Error",
        requiredAction: "Acción requerida",
        validationIncorrect: "Confirmación inválida",
      },
      privacy: {
        gdpr: "Los datos se procesan conforme al RGPD.",
      },
      loading: {
        platform: "Cargando plataforma...",
      },
    },
    settings: {
      title: "Configuración",
      sections: {
        profile: "Perfil",
        subscription: "Suscripción",
        account: "Cuenta",
        language: "Idioma",
      },
      profile: {
        namePlaceholder: "Tu nombre",
        updatedTitle: "Perfil actualizado",
        updatedDescription: "Tus cambios se han guardado.",
        emailImmutable: "No modificable",
      },
      language: {
        fieldLabel: "Idioma de la interfaz",
        currentLabel: "Idioma actual",
        updatedTitle: "Idioma actualizado",
        updatedDescription: "El idioma se aplicó de inmediato.",
        options: {
          fr: "Francés",
          en: "Inglés",
          es: "Español",
          de: "Alemán",
        },
      },
      subscription: {
        title: "Suscripción",
        price: "4,90€/semana",
        videoPrice: "9,90€/semana",
        noneActive: "Sin suscripción activa",
        manage: "Gestionar mi suscripción",
        reactivate: "Reactivar mi suscripción",
      },
      account: {
        deleteAccount: "Eliminar mi cuenta",
      },
      deleteDialog: {
        title: "Eliminación definitiva",
        description: "Esta acción es irreversible",
        question: "¿Seguro que quieres eliminar tu cuenta?",
        subscriberWarning:
          "Tienes una suscripción activa. Cancélala primero en la sección Suscripción.",
        irreversibleText:
          "Todos tus datos se eliminarán de acuerdo con el RGPD. Esta acción no se puede deshacer.",
        confirmLabel: "Escribe \"SUPPRIMER\" para confirmar",
        confirmPlaceholder: "SUPPRIMER",
        validationDescription:
          "Escribe 'SUPPRIMER' exactamente en mayúsculas para confirmar.",
        subscriberActionDescription:
          "Cancela primero tu suscripción activa antes de eliminar tu cuenta.",
        deletedTitle: "Cuenta eliminada",
        deletedDescription:
          "Tu cuenta y tus datos se eliminaron de forma definitiva.",
      },
    },
    auth: {
      welcomeBack: "Bienvenido de nuevo",
      createAccount: "Crear una cuenta",
      subtitleLogin: "Introduce tus credenciales para iniciar sesión",
      subtitleRegister: "Introduce tu correo para empezar",
      googleLogin: "Iniciar sesión con Google",
      googleSignup: "Registrarse con Google",
      separator: "o",
      fields: {
        email: "Correo electrónico",
        password: "Contraseña",
      },
      emailPlaceholder: "nombre@ejemplo.com",
      invalidEmailTitle: "Correo inválido",
      invalidEmailDescription:
        "Introduce una dirección de correo válida.",
      passwordStrength: "Seguridad:",
      strength: {
        short: "Demasiado corta",
        weak: "Débil",
        medium: "Media",
        strong: "Fuerte",
        excellent: "Excelente",
      },
      acceptTermsPrefix: "Al registrarte, aceptas nuestros",
      termsLink: "Términos",
      submit: {
        login: "Iniciar sesión",
        register: "Registrarse",
      },
      toggle: {
        noAccount: "¿Aún no tienes cuenta? Regístrate",
        hasAccount: "¿Ya tienes cuenta? Inicia sesión",
      },
      signInSuccessTitle: "¡Bienvenido de nuevo!",
      signInSuccessDescription: "Sesión iniciada correctamente.",
    },
    paywall: {
      imageAlt: "Broma generada",
      title: "Revélala ahora",
      subtitle: "¡Tu broma está lista!",
      upgradeTitle: "Desbloquea la generación de video",
      benefits: {
        noWatermark: "Sin marca de agua",
        instantResult: "Resultado instantáneo",
        allTemplates: "Todas las plantillas de imagen incluidas",
        imageIncluded: "Imágenes también incluidas",
        videoIncluded: "También desbloquea video",
        fast: "Generación rápida",
        ultraFast: "Ultra rápida",
        upTo20Images: "Hasta 20 imágenes",
        upTo40Images: "Hasta 40 imágenes",
        videoTemplates: "Videos incluidos + todas las plantillas",
      },
      plans: {
        image: {
          name: "Imagen",
          price: "4,90€",
          credits: "100 créditos",
        },
        video: {
          name: "Imagen + Video",
          badge: "Mejor opción",
          price: "9,90€",
          credits: "200 créditos",
          priceLine: "9,90€/semana · Cancela cuando quieras",
        },
      },
      monthlySent: "🔥 {{count}} bromas enviadas este mes",
      upgradeHelper: "Tu plan actual mantiene las imágenes. Mejora para lanzar videos.",
      unlockCta: "Desbloquear mi broma",
      upgradeCta: "Mejorar y lanzar mi video",
      priceLine: "4,90€/semana · Cancela cuando quieras",
    },
    errors: {
      generic: {
        title: "Se produjo un error",
        description:
          "Se produjo un error inesperado. Contacta con soporte si el problema continúa.",
        serverDefault: "Error del servidor",
      },
      auth: {
        invalidLoginCredentials: {
          title: "Credenciales inválidas",
          description:
            "El correo o la contraseña no son correctos. Inténtalo de nuevo.",
        },
        userAlreadyRegistered: {
          title: "La cuenta ya existe",
          description: "Ya hay un usuario registrado con este correo.",
        },
        passwordTooShort: {
          title: "Contraseña demasiado corta",
          description: "La contraseña debe tener al menos 6 caracteres.",
        },
        emailNotConfirmed: {
          title: "Correo sin confirmar",
          description:
            "Revisa tu bandeja de entrada y confirma tu dirección de correo.",
        },
        networkFailed: {
          title: "Error de red",
          description:
            "No se pudo contactar con el servidor. Revisa tu conexión a internet.",
        },
        tooManyRequests: {
          title: "Demasiados intentos",
          description: "Espera un momento antes de volver a intentarlo.",
        },
        signupDisabled: {
          title: "Registros cerrados",
          description:
            "Los nuevos registros están desactivados temporalmente.",
        },
        rateLimitExceeded: {
          title: "Límite alcanzado",
          description:
            "Has realizado demasiados intentos. Inténtalo de nuevo más tarde.",
        },
        userNotFound: {
          title: "Usuario no encontrado",
          description: "No hay ninguna cuenta asociada a este correo.",
        },
        invalidEmail: {
          title: "Correo inválido",
          description: "El formato del correo no es correcto.",
        },
        databaseError: {
          title: "Error de base de datos",
          description:
            "Se produjo un problema al guardar tus datos. Inténtalo de nuevo.",
        },
        anonymousDisabled: {
          title: "Inicio anónimo desactivado",
          description:
            "Los inicios de sesión anónimos no están permitidos en esta app.",
        },
        confirmationTokenNotFound: {
          title: "Enlace caducado",
          description:
            "El enlace de confirmación ha caducado o ya fue usado.",
        },
        providerDisabled: {
          title: "Servicio no disponible",
          description:
            "El inicio de sesión con este proveedor (por ejemplo Google) está desactivado.",
        },
      },
    },
    meta: {
      appName: "TurboPrank",
      titles: {
        home: "TurboPrank — Crea bromas personalizadas con IA",
        login: "Iniciar sesión — TurboPrank",
        register: "Registrarse — TurboPrank",
        generate: "Crea tu broma — TurboPrank",
        history: "Historial — TurboPrank",
        settings: "Configuración — TurboPrank",
        admin: "Admin — TurboPrank",
        adminUsers: "Usuarios — TurboPrank",
        adminTemplates: "Plantillas — TurboPrank",
        legal: "Aviso legal — TurboPrank",
        cgu: "Términos — TurboPrank",
        cgv: "Condiciones de venta — TurboPrank",
        privacy: "Política de privacidad — TurboPrank",
      },
    },
  },
  de: {
    common: {
      actions: {
        save: "Speichern",
        cancel: "Abbrechen",
        delete: "Löschen",
        signOut: "Abmelden",
        redirecting: "Weiterleitung...",
      },
      states: {
        active: "Aktiv",
        canceled: "Gekündigt",
        inactive: "Inaktiv",
      },
      labels: {
        email: "E-Mail",
      },
      messages: {
        error: "Fehler",
        requiredAction: "Aktion erforderlich",
        validationIncorrect: "Ungültige Bestätigung",
      },
      privacy: {
        gdpr: "Daten werden gemäß DSGVO verarbeitet.",
      },
      loading: {
        platform: "Plattform wird geladen...",
      },
    },
    settings: {
      title: "Einstellungen",
      sections: {
        profile: "Profil",
        subscription: "Abonnement",
        account: "Konto",
        language: "Sprache",
      },
      profile: {
        namePlaceholder: "Dein Name",
        updatedTitle: "Profil aktualisiert",
        updatedDescription: "Deine Änderungen wurden gespeichert.",
        emailImmutable: "Nicht änderbar",
      },
      language: {
        fieldLabel: "Sprache der Benutzeroberfläche",
        currentLabel: "Aktuelle Sprache",
        updatedTitle: "Sprache aktualisiert",
        updatedDescription: "Die Sprache wurde sofort angewendet.",
        options: {
          fr: "Französisch",
          en: "Englisch",
          es: "Spanisch",
          de: "Deutsch",
        },
      },
      subscription: {
        title: "Abonnement",
        price: "4,90€/Woche",
        videoPrice: "9,90€/Woche",
        noneActive: "Kein aktives Abonnement",
        manage: "Mein Abonnement verwalten",
        reactivate: "Mein Abonnement reaktivieren",
      },
      account: {
        deleteAccount: "Mein Konto löschen",
      },
      deleteDialog: {
        title: "Endgültige Löschung",
        description: "Diese Aktion ist unwiderruflich",
        question: "Möchtest du dein Konto wirklich löschen?",
        subscriberWarning:
          "Du hast noch ein aktives Abonnement. Kündige es zuerst im Bereich Abonnement.",
        irreversibleText:
          "Alle deine Daten werden gemäß DSGVO gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
        confirmLabel: "Gib \"SUPPRIMER\" zur Bestätigung ein",
        confirmPlaceholder: "SUPPRIMER",
        validationDescription:
          "Gib 'SUPPRIMER' exakt in Großbuchstaben ein, um zu bestätigen.",
        subscriberActionDescription:
          "Bitte kündige zuerst dein aktives Abonnement, bevor du dein Konto löschst.",
        deletedTitle: "Konto gelöscht",
        deletedDescription: "Dein Konto und deine Daten wurden dauerhaft gelöscht.",
      },
    },
    auth: {
      welcomeBack: "Willkommen zurück",
      createAccount: "Konto erstellen",
      subtitleLogin: "Melde dich mit deinen Zugangsdaten an",
      subtitleRegister: "Gib deine E-Mail ein, um zu starten",
      googleLogin: "Mit Google anmelden",
      googleSignup: "Mit Google registrieren",
      separator: "oder",
      fields: {
        email: "E-Mail",
        password: "Passwort",
      },
      emailPlaceholder: "name@beispiel.com",
      invalidEmailTitle: "Ungültige E-Mail",
      invalidEmailDescription: "Bitte gib eine gültige E-Mail-Adresse ein.",
      passwordStrength: "Stärke:",
      strength: {
        short: "Zu kurz",
        weak: "Schwach",
        medium: "Mittel",
        strong: "Stark",
        excellent: "Sehr stark",
      },
      acceptTermsPrefix: "Mit der Registrierung akzeptierst du unsere",
      termsLink: "AGB",
      submit: {
        login: "Anmelden",
        register: "Registrieren",
      },
      toggle: {
        noAccount: "Noch kein Konto? Registrieren",
        hasAccount: "Schon ein Konto? Anmelden",
      },
      signInSuccessTitle: "Willkommen zurück!",
      signInSuccessDescription: "Erfolgreich angemeldet.",
    },
    paywall: {
      imageAlt: "Generierter Streich",
      title: "Jetzt enthüllen",
      subtitle: "Dein Streich ist fertig!",
      upgradeTitle: "Videogenerierung freischalten",
      benefits: {
        noWatermark: "Ohne Wasserzeichen",
        instantResult: "Sofortiges Ergebnis",
        allTemplates: "Alle Bildvorlagen inklusive",
        imageIncluded: "Bilder ebenfalls inklusive",
        videoIncluded: "Schaltet auch Video frei",
        fast: "Schnelle Generierung",
        ultraFast: "Ultra schnell",
        upTo20Images: "Bis zu 20 Bilder",
        upTo40Images: "Bis zu 40 Bilder",
        videoTemplates: "Videos inklusive + alle Vorlagen",
      },
      plans: {
        image: {
          name: "Bild",
          price: "4,90€",
          credits: "100 Credits",
        },
        video: {
          name: "Bild + Video",
          badge: "Beste Wahl",
          price: "9,90€",
          credits: "200 Credits",
          priceLine: "9,90€/Woche · Jederzeit kündbar",
        },
      },
      monthlySent: "🔥 {{count}} Streiche diesen Monat verschickt",
      upgradeHelper: "Dein aktueller Plan behält Bilder. Upgrade, um Videos zu starten.",
      unlockCta: "Meinen Streich freischalten",
      upgradeCta: "Upgraden und mein Video starten",
      priceLine: "4,90€/Woche · Jederzeit kündbar",
    },
    errors: {
      generic: {
        title: "Ein Fehler ist aufgetreten",
        description:
          "Es ist ein unerwarteter Fehler aufgetreten. Bitte kontaktiere den Support, falls das Problem bestehen bleibt.",
        serverDefault: "Serverfehler",
      },
      auth: {
        invalidLoginCredentials: {
          title: "Ungültige Zugangsdaten",
          description:
            "E-Mail oder Passwort sind falsch. Bitte versuche es erneut.",
        },
        userAlreadyRegistered: {
          title: "Konto existiert bereits",
          description:
            "Mit dieser E-Mail-Adresse ist bereits ein Nutzer registriert.",
        },
        passwordTooShort: {
          title: "Passwort zu kurz",
          description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
        },
        emailNotConfirmed: {
          title: "E-Mail nicht bestätigt",
          description:
            "Bitte prüfe dein Postfach und bestätige deine E-Mail-Adresse.",
        },
        networkFailed: {
          title: "Netzwerkfehler",
          description:
            "Der Server konnte nicht erreicht werden. Prüfe deine Internetverbindung.",
        },
        tooManyRequests: {
          title: "Zu viele Versuche",
          description:
            "Bitte warte einen Moment, bevor du es erneut versuchst.",
        },
        signupDisabled: {
          title: "Registrierung geschlossen",
          description:
            "Neue Registrierungen sind vorübergehend deaktiviert.",
        },
        rateLimitExceeded: {
          title: "Limit erreicht",
          description:
            "Du hast zu viele Versuche durchgeführt. Bitte versuche es später erneut.",
        },
        userNotFound: {
          title: "Nutzer nicht gefunden",
          description:
            "Für diese E-Mail-Adresse wurde kein Konto gefunden.",
        },
        invalidEmail: {
          title: "Ungültige E-Mail",
          description: "Das E-Mail-Format ist nicht korrekt.",
        },
        databaseError: {
          title: "Datenbankfehler",
          description:
            "Beim Speichern deiner Daten ist ein Problem aufgetreten. Bitte versuche es erneut.",
        },
        anonymousDisabled: {
          title: "Anonyme Anmeldung deaktiviert",
          description:
            "Anonyme Anmeldungen sind in dieser App nicht erlaubt.",
        },
        confirmationTokenNotFound: {
          title: "Link abgelaufen",
          description:
            "Der Bestätigungslink ist abgelaufen oder wurde bereits verwendet.",
        },
        providerDisabled: {
          title: "Dienst nicht verfügbar",
          description:
            "Die Anmeldung über diesen Anbieter (z. B. Google) ist derzeit deaktiviert.",
        },
      },
    },
    meta: {
      appName: "TurboPrank",
      titles: {
        home: "TurboPrank — Erstelle individuelle KI-Streiche",
        login: "Anmeldung — TurboPrank",
        register: "Registrierung — TurboPrank",
        generate: "Erstelle deinen Streich — TurboPrank",
        history: "Verlauf — TurboPrank",
        settings: "Einstellungen — TurboPrank",
        admin: "Admin — TurboPrank",
        adminUsers: "Benutzer — TurboPrank",
        adminTemplates: "Vorlagen — TurboPrank",
        legal: "Impressum — TurboPrank",
        cgu: "Nutzungsbedingungen — TurboPrank",
        cgv: "Verkaufsbedingungen — TurboPrank",
        privacy: "Datenschutzrichtlinie — TurboPrank",
      },
    },
  },
} as const;
