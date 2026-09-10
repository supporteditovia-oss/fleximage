/** Rétention des médias générés (images/vidéos) dans l'historique. */
const RETENTION_DAYS = 7;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function computeGenerationExpiresAt(completedAt, createdAt, now = Date.now()) {
  const baseIso = completedAt || createdAt;
  if (!baseIso) {
    return new Date(now + RETENTION_MS).toISOString();
  }
  const baseMs = new Date(baseIso).getTime();
  if (!Number.isFinite(baseMs)) {
    return new Date(now + RETENTION_MS).toISOString();
  }
  return new Date(baseMs + RETENTION_MS).toISOString();
}

module.exports = {
  RETENTION_DAYS,
  RETENTION_MS,
  computeGenerationExpiresAt,
};
