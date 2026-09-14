const { getTrustStatsPayload } = require("../trust-stats");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const payload = await getTrustStatsPayload();
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    res.status(200).json(payload);
  } catch (error) {
    console.error("trust-stats error", error);
    res.status(500).json({
      message:
        error && error.message ? String(error.message) : "Erreur serveur",
    });
  }
};
