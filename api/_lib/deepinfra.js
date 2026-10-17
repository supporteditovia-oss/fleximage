function getDeepInfraApiKey() {
  return (process.env.DEEPINFRA_API_KEY || "").trim();
}

function isDeepInfraConfigured() {
  return Boolean(getDeepInfraApiKey());
}

module.exports = {
  getDeepInfraApiKey,
  isDeepInfraConfigured,
};
