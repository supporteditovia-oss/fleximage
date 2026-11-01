/** Messages client pour refus provider image (sans noms de modèle). */

function isImageProviderSafetyBlock(raw) {
  const text = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    text.includes("safety policy") ||
    text.includes("rejected by the model") ||
    text.includes("content policy") ||
    (text.includes("violat") && text.includes("policy")) ||
    text.includes("blocked by safety") ||
    text.includes("prompt flagge")
  );
}

function isMotorcycleScooterProviderRefusal(raw) {
  const text = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    (text.includes("motorcycle") || text.includes("scooter") || text.includes("motocicleta")) &&
    (text.includes("can't generate") ||
      text.includes("cannot generate") ||
      text.includes("can not generate") ||
      text.includes("unable to generate") ||
      text.includes("no puedo generar") ||
      text.includes("impossible de generer"))
  );
}

function mapImageProviderMessage(raw, locale = "fr") {
  const text = String(raw || "").trim();
  if (!text) return null;

  if (isMotorcycleScooterProviderRefusal(text)) {
    if (locale === "es") {
      return (
        "El laboratorio de IA ha rechazado esta petición — suele pasar si no detecta un reemplazo sobre tu foto. " +
        "Vuelve a intentarlo: sube la foto del scooter y escribe por ejemplo «Reemplaza el scooter por una BMW S 1000 RR negra y azul, misma escena». " +
        "Créditos reembolsados."
      );
    }
    if (locale === "en") {
      return (
        "The AI lab refused this request — it often happens when it does not read your prompt as an in-place swap on your photo. " +
        "Retry with your scooter photo and: «Replace the scooter with a BMW S 1000 RR, same scene». Credits refunded."
      );
    }
    return (
      "Le labo IA a refusé — souvent quand il ne comprend pas un remplacement sur ta photo existante. " +
      "Réessaie avec ta photo de scooter et : « Remplace le scooter par une BMW S 1000 RR, même scène ». Jetons remboursés."
    );
  }

  if (isImageProviderSafetyBlock(text)) {
    if (locale === "es") {
      return (
        "El laboratorio de IA (Google) ha rechazado esta escena — no es un bloqueo de LuxeFlexIA. " +
        "Rostros de políticos muy reconocibles o escenas sensibles (difamación, drogas…) suelen estar prohibidas. " +
        "Créditos reembolsados. Prueba el mismo decorado sin nombrar a la persona, o un prank con una estrella del catálogo (rap/deporte)."
      );
    }
    if (locale === "en") {
      return (
        "The AI lab (Google) rejected this scene — LuxeFlexIA did not block it. " +
        "Highly recognizable politicians or sensitive setups (defamation, drugs…) are often refused. " +
        "Credits refunded. Try the same setting without naming the person, or a catalog celebrity prank."
      );
    }
    return (
      "Le laboratoire IA (Google) a refusé cette scène — ce n’est pas LuxeFlexIA qui bloque. " +
      "Les visages de personnalités politiques très identifiables, ou certaines mises en scène sensibles (diffamation, drogue…), sont souvent interdites côté Google. " +
      "Tes jetons sont remboursés. Astuce : même décor sans nommer la personne, ou prank avec une célébrité sport/rap du catalogue."
    );
  }

  return null;
}

module.exports = {
  isImageProviderSafetyBlock,
  isMotorcycleScooterProviderRefusal,
  mapImageProviderMessage,
};
