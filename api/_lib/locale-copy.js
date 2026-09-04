/** UI locale helpers for API user-facing copy (FR / EN). */

function normalizeUiLocale(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw.startsWith("en") || raw === "us" || raw === "usd") return "en";
  if (raw.startsWith("fr") || raw === "eur" || raw === "eu") return "fr";
  return "fr";
}

function resolveRequestLocale(req, body) {
  const header =
    (req && req.headers && (req.headers["x-locale"] || req.headers["X-Locale"])) ||
    "";
  if (header) return normalizeUiLocale(header);
  if (body && (body.locale || body.lang)) {
    return normalizeUiLocale(body.locale || body.lang);
  }
  return "fr";
}

function copy(locale, fr, en) {
  return locale === "en" ? en : fr;
}

module.exports = {
  normalizeUiLocale,
  resolveRequestLocale,
  copy,
};
