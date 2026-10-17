const { getOneshotApiConfig } = require("./oneshot");

function isOneshotCreditsExhaustedError(err) {
  const status = err && err.status;
  if (status === 402 || status === 429) return true;
  const text = String(
    (err && err.message) || (err && err.body) || err || "",
  ).toLowerCase();
  return (
    /insufficient.*credit/.test(text) ||
    /out of credit/.test(text) ||
    /not enough credit/.test(text) ||
    /credit.*depleted/.test(text) ||
    /quota.*exceed/.test(text) ||
    /payment required/.test(text) ||
    /billing/.test(text)
  );
}

/**
 * All image generations use OneShot; every supplied reference image is uploaded
 * and passed to the same job.
 */
async function resolveImageGenerationProvider() {
  const config = getOneshotApiConfig();
  if (!config.url || !config.key) {
    throw Object.assign(
      new Error("OneShot non configuré (ONESHOT_API_URL / ONESHOT_API_KEY)."),
      { code: "ONESHOT_NOT_CONFIGURED" },
    );
  }

  return { provider: "oneshot" };
}

module.exports = {
  isOneshotCreditsExhaustedError,
  resolveImageGenerationProvider,
};
