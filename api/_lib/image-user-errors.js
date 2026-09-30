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

function mapImageProviderMessage(raw, locale = "fr") {
  const text = String(raw || "").trim();
  if (!text) return null;

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
  mapImageProviderMessage,
};
