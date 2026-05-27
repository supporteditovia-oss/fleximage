import type { Request } from "express";
import {
  DEFAULT_LOCALE,
  type AppLocale,
  normalizeLocale,
  resolvePreferredLocale,
} from "@shared/locales";

export type BackendMessageKey =
  | "auth.missingToken"
  | "auth.invalidToken"
  | "auth.adminOnly"
  | "validation.failed"
  | "limits.profileNotFound"
  | "limits.noCreditsSubscriber"
  | "limits.noCreditsNonSubscriber"
  | "profiles.notFound"
  | "templates.notFound"
  | "templates.notFoundOrInactive"
  | "pranks.taskCreateFailed"
  | "pranks.creditDeductionFailed"
  | "pranks.taskNotFound"
  | "pranks.invalidImageIndex"
  | "pranks.notFound"
  | "pranks.invalidUrls"
  | "pranks.imageNotFound"
  | "pranks.fetchImageFailed"
  | "stripe.alreadySubscribed"
  | "stripe.noStripeSubscription"
  | "stripe.videoPlanRequired"
  | "favorites.added"
  | "favorites.removed"
  | "common.internalServerError"
  | "pranks.pollingError"
  | "pranks.fallbackFailed"
  | "pranks.policyViolation"
  | "rateLimit.tooManyRequests"
  | "rateLimit.tooManyGenerationRequests";

const backendMessages: Record<AppLocale, Record<BackendMessageKey, string>> = {
  fr: {
    "auth.missingToken": "Token d'authentification manquant",
    "auth.invalidToken": "Token invalide ou expiré",
    "auth.adminOnly": "Accès réservé aux administrateurs",
    "validation.failed": "Validation echouee",
    "limits.profileNotFound": "Profil introuvable",
    "limits.noCreditsSubscriber":
      "Tu n'as plus de crédits. Tes crédits seront rechargés au prochain renouvellement.",
    "limits.noCreditsNonSubscriber":
      "Crédits insuffisants. Abonne-toi pour obtenir des crédits et générer des pranks.",
    "profiles.notFound": "Profil introuvable",
    "templates.notFound": "Template introuvable",
    "templates.notFoundOrInactive": "Template introuvable ou inactif",
    "pranks.taskCreateFailed":
      "Erreur lors de la creation de la tache de generation",
    "pranks.creditDeductionFailed": "Erreur lors de la deduction des credits",
    "pranks.taskNotFound": "Tache introuvable",
    "pranks.invalidImageIndex": "Index d'image invalide",
    "pranks.notFound": "Prank introuvable",
    "pranks.invalidUrls": "URLs invalides",
    "pranks.imageNotFound": "Image introuvable",
    "pranks.fetchImageFailed": "Impossible de recuperer l'image",
    "stripe.alreadySubscribed": "Tu as deja un abonnement actif.",
    "stripe.noStripeSubscription": "Aucun abonnement Stripe trouve.",
    "stripe.videoPlanRequired": "La génération vidéo nécessite un abonnement actif.",
    "favorites.added": "Favori ajoute",
    "favorites.removed": "Favori retire",
    "common.internalServerError":
      "Une erreur inattendue est survenue. Veuillez reessayer.",
    "pranks.pollingError": "Erreur lors du suivi de la generation",
    "pranks.fallbackFailed":
      "La generation a echoue apres la tentative de secours",
    "pranks.policyViolation":
      "Votre prank enfreint les règles de création.",
    "rateLimit.tooManyRequests":
      "Trop de requetes. Veuillez reessayer plus tard.",
    "rateLimit.tooManyGenerationRequests":
      "Trop de requetes de generation. Veuillez reessayer plus tard.",
  },
  en: {
    "auth.missingToken": "Authentication token is missing",
    "auth.invalidToken": "Invalid or expired token",
    "auth.adminOnly": "Admin access required",
    "validation.failed": "Validation failed",
    "limits.profileNotFound": "Profile not found",
    "limits.noCreditsSubscriber":
      "You are out of credits. Your credits will be reloaded at your next renewal.",
    "limits.noCreditsNonSubscriber":
      "Insufficient credits. Subscribe to get credits and generate pranks.",
    "profiles.notFound": "Profile not found",
    "templates.notFound": "Template not found",
    "templates.notFoundOrInactive": "Template not found or inactive",
    "pranks.taskCreateFailed": "Failed to create generation task",
    "pranks.creditDeductionFailed": "Failed to deduct credits",
    "pranks.taskNotFound": "Task not found",
    "pranks.invalidImageIndex": "Invalid image index",
    "pranks.notFound": "Prank not found",
    "pranks.invalidUrls": "Invalid URLs",
    "pranks.imageNotFound": "Image not found",
    "pranks.fetchImageFailed": "Unable to fetch image",
    "stripe.alreadySubscribed": "You already have an active subscription.",
    "stripe.noStripeSubscription": "No Stripe subscription found.",
    "stripe.videoPlanRequired": "Video generation requires an active subscription.",
    "favorites.added": "Favorite added",
    "favorites.removed": "Favorite removed",
    "common.internalServerError":
      "An unexpected error occurred. Please try again.",
    "pranks.pollingError": "Failed to check generation status",
    "pranks.fallbackFailed": "Generation failed after fallback",
    "pranks.policyViolation": "Your prank violates the creation rules.",
    "rateLimit.tooManyRequests": "Too many requests. Please try again later.",
    "rateLimit.tooManyGenerationRequests":
      "Too many generation requests. Please try again later.",
  },
  es: {
    "auth.missingToken": "Falta el token de autenticación",
    "auth.invalidToken": "Token inválido o expirado",
    "auth.adminOnly": "Acceso reservado para administradores",
    "validation.failed": "Validación fallida",
    "limits.profileNotFound": "Perfil no encontrado",
    "limits.noCreditsSubscriber":
      "No te quedan créditos. Tus créditos se recargarán en la próxima renovación.",
    "limits.noCreditsNonSubscriber":
      "Créditos insuficientes. Suscríbete para obtener créditos y generar bromas.",
    "profiles.notFound": "Perfil no encontrado",
    "templates.notFound": "Plantilla no encontrada",
    "templates.notFoundOrInactive": "Plantilla no encontrada o inactiva",
    "pranks.taskCreateFailed": "Error al crear la tarea de generacion",
    "pranks.creditDeductionFailed": "Error al descontar creditos",
    "pranks.taskNotFound": "Tarea no encontrada",
    "pranks.invalidImageIndex": "Indice de imagen invalido",
    "pranks.notFound": "Broma no encontrada",
    "pranks.invalidUrls": "URLs invalidas",
    "pranks.imageNotFound": "Imagen no encontrada",
    "pranks.fetchImageFailed": "No se pudo recuperar la imagen",
    "stripe.alreadySubscribed": "Ya tienes una suscripcion activa.",
    "stripe.noStripeSubscription": "No se encontro una suscripcion de Stripe.",
    "stripe.videoPlanRequired": "La generación de video requiere una suscripción activa.",
    "favorites.added": "Favorito agregado",
    "favorites.removed": "Favorito eliminado",
    "common.internalServerError":
      "Se produjo un error inesperado. Intentalo de nuevo.",
    "pranks.pollingError":
      "Error al comprobar el estado de la generacion",
    "pranks.fallbackFailed":
      "La generacion fallo despues del modo de respaldo",
    "pranks.policyViolation":
      "Tu broma infringe las reglas de creacion.",
    "rateLimit.tooManyRequests":
      "Demasiadas solicitudes. Intentalo de nuevo mas tarde.",
    "rateLimit.tooManyGenerationRequests":
      "Demasiadas solicitudes de generacion. Intentalo de nuevo mas tarde.",
  },
  de: {
    "auth.missingToken": "Authentifizierungs-Token fehlt",
    "auth.invalidToken": "Ungültiges oder abgelaufenes Token",
    "auth.adminOnly": "Zugriff nur für Administratoren",
    "validation.failed": "Validierung fehlgeschlagen",
    "limits.profileNotFound": "Profil nicht gefunden",
    "limits.noCreditsSubscriber":
      "Du hast keine Credits mehr. Deine Credits werden bei der nächsten Verlängerung aufgeladen.",
    "limits.noCreditsNonSubscriber":
      "Nicht genügend Credits. Abonniere, um Credits zu erhalten und Streiche zu generieren.",
    "profiles.notFound": "Profil nicht gefunden",
    "templates.notFound": "Vorlage nicht gefunden",
    "templates.notFoundOrInactive": "Vorlage nicht gefunden oder inaktiv",
    "pranks.taskCreateFailed": "Generierungsaufgabe konnte nicht erstellt werden",
    "pranks.creditDeductionFailed": "Credits konnten nicht abgezogen werden",
    "pranks.taskNotFound": "Aufgabe nicht gefunden",
    "pranks.invalidImageIndex": "Ungueltiger Bildindex",
    "pranks.notFound": "Streich nicht gefunden",
    "pranks.invalidUrls": "Ungueltige URLs",
    "pranks.imageNotFound": "Bild nicht gefunden",
    "pranks.fetchImageFailed": "Bild konnte nicht geladen werden",
    "stripe.alreadySubscribed": "Du hast bereits ein aktives Abonnement.",
    "stripe.noStripeSubscription": "Kein Stripe-Abonnement gefunden.",
    "stripe.videoPlanRequired": "Videogenerierung erfordert ein aktives Abonnement.",
    "favorites.added": "Favorit hinzugefugt",
    "favorites.removed": "Favorit entfernt",
    "common.internalServerError":
      "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.",
    "pranks.pollingError":
      "Der Generierungsstatus konnte nicht gepruft werden",
    "pranks.fallbackFailed": "Die Generierung ist nach dem Fallback fehlgeschlagen",
    "pranks.policyViolation":
      "Dein Streich verstoesst gegen die Erstellungsregeln.",
    "rateLimit.tooManyRequests":
      "Zu viele Anfragen. Bitte versuche es spaeter erneut.",
    "rateLimit.tooManyGenerationRequests":
      "Zu viele Generierungsanfragen. Bitte versuche es spaeter erneut.",
  },
};

function resolveLocaleFromHeader(value: string | string[] | undefined): AppLocale | null {
  if (!value) return null;

  const raw = Array.isArray(value) ? value.join(",") : value;
  if (!raw) return null;

  const segments = raw.split(",");
  for (const segment of segments) {
    const locale = normalizeLocale(segment);
    if (locale) {
      return locale;
    }
  }

  return null;
}

export function resolveLocaleFromRequest(req: Pick<Request, "headers">): AppLocale {
  const localeFromCustomHeader = resolveLocaleFromHeader(req.headers["x-locale"]);
  if (localeFromCustomHeader) {
    return localeFromCustomHeader;
  }

  const localeFromAcceptLanguage = resolveLocaleFromHeader(
    req.headers["accept-language"],
  );
  if (localeFromAcceptLanguage) {
    return localeFromAcceptLanguage;
  }

  return DEFAULT_LOCALE;
}

export function resolveLocaleFromProfile(value: string | null | undefined): AppLocale {
  return resolvePreferredLocale(value, DEFAULT_LOCALE);
}

export function tBackend(locale: AppLocale, key: BackendMessageKey): string {
  const localeCatalog = backendMessages[locale] ?? backendMessages[DEFAULT_LOCALE];
  return localeCatalog[key] ?? backendMessages[DEFAULT_LOCALE][key];
}
