const { getSupabaseAdmin } = require("../_lib/user-auth");
const { purgeExpiredGenerations } = require("../_lib/purge-generation");
const {
  purgeChurnedExSubscriberGenerations,
} = require("../_lib/purge-churned-users");

function authorizeCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/purge] CRON_SECRET missing");
    return false;
  }
  const auth = req.headers.authorization || req.headers.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token.length > 0 && token === secret;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!authorizeCron(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const limit = Math.min(
      Math.max(Number(req.query?.limit) || 200, 1),
      500,
    );
    const expired = await purgeExpiredGenerations(supabase, limit);
    const churned = await purgeChurnedExSubscriberGenerations(supabase, {
      userLimit: Math.min(Math.max(Number(req.query?.churnUsers) || 50, 1), 200),
      genBatch: limit,
    });
    const result = { expired, churned };
    console.info("[cron/purge-expired-generations]", result);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/purge-expired-generations]", error);
    res.status(500).json({
      ok: false,
      message: error?.message || "Purge failed",
    });
  }
};
