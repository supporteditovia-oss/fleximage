const Stripe = require("stripe");
const {
  migrateDiscoverySubscriptionsTo990,
  resolveTargetDiscoveryPriceEur,
} = require("../stripe-discovery-reprice");

function assertCronAuth(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw Object.assign(new Error("CRON_SECRET not configured"), { status: 503 });
  }
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token !== secret) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
}

function wantsApply(req) {
  const q = req.query || {};
  const apply =
    q.apply === "1" ||
    q.apply === "true" ||
    (typeof q.dry_run === "string" && q.dry_run === "0");
  return Boolean(apply);
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

  try {
    assertCronAuth(req);
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      res.status(503).json({ message: "STRIPE_SECRET_KEY missing" });
      return;
    }

    const stripe = new Stripe(secretKey);
    const apply = wantsApply(req);
    const targetPriceId = await resolveTargetDiscoveryPriceEur(stripe);
    const report = await migrateDiscoverySubscriptionsTo990(stripe, {
      dryRun: !apply,
    });

    res.status(200).json({
      ok: true,
      apply,
      targetPriceId,
      hint: apply
        ? "Abonnements basculés sur 9,90 € au prochain cycle (proration none)."
        : "Dry-run. Relance avec ?apply=1 pour migrer.",
      ...report,
    });
  } catch (error) {
    console.error("cron-stripe-discovery-reprice error", error);
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || "Server error",
    });
  }
};
