/** @typedef {import('stripe').Stripe} Stripe */

const DISCOVERY_EUR_CENTS = 990;
const DISCOVERY_LOOKUP_KEY = "luxeflexia_discovery_eur_monthly_v20261017";

const KNOWN_LEGACY_DISCOVERY_EUR = "price_1TuYXR46E9Di7XBgxmpSdu7s";

function splitPriceIds(value) {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Price IDs that should be migrated off (8,90 € discovery and legacy weekly/image). */
function listDiscoveryLegacyPriceIds(env = process.env) {
  const ids = new Set([
    KNOWN_LEGACY_DISCOVERY_EUR,
    ...splitPriceIds(env.STRIPE_DISCOVERY_LEGACY_PRICE_IDS),
    ...splitPriceIds(env.STRIPE_WEEKLY_LEGACY_PRICE_IDS),
    ...splitPriceIds(env.STRIPE_IMAGE_LEGACY_PRICE_IDS),
  ]);
  if (env.STRIPE_WEEKLY_PRICE_ID?.trim()) {
    ids.add(env.STRIPE_WEEKLY_PRICE_ID.trim());
  }
  if (env.STRIPE_IMAGE_PRICE_ID?.trim()) {
    ids.add(env.STRIPE_IMAGE_PRICE_ID.trim());
  }
  const configured = env.STRIPE_DISCOVERY_PRICE_ID?.trim();
  if (configured) ids.add(configured);
  return [...ids];
}

function isLegacyDiscoveryPrice(price, legacySet, targetPriceId) {
  const priceId = price.id;
  if (priceId === targetPriceId) return false;
  if (legacySet.has(priceId)) return true;
  if (price.currency !== "eur" || price.unit_amount !== 890) return false;
  if (price.recurring?.interval !== "month") return false;
  const plan =
    price.metadata?.luxeflexia_plan ||
    price.metadata?.plan_type ||
    price.metadata?.larpking_plan ||
    "";
  if (!plan || plan === "discovery" || plan === "weekly" || plan === "image") {
    return true;
  }
  return false;
}

/**
 * Resolve EUR Discovery price at 9,90 € (990 centimes).
 * @param {Stripe} stripe
 * @param {NodeJS.ProcessEnv} env
 */
async function resolveTargetDiscoveryPriceEur(stripe, env = process.env) {
  const configured = env.STRIPE_DISCOVERY_PRICE_ID?.trim();
  if (configured) {
    const price = await stripe.prices.retrieve(configured);
    if (
      price.unit_amount === DISCOVERY_EUR_CENTS &&
      price.currency === "eur"
    ) {
      return configured;
    }
  }

  const listed = await stripe.prices.list({
    lookup_keys: [DISCOVERY_LOOKUP_KEY],
    limit: 1,
  });
  const found = listed.data[0];
  if (
    found &&
    found.unit_amount === DISCOVERY_EUR_CENTS &&
    found.currency === "eur"
  ) {
    return found.id;
  }

  throw new Error(
    "Aucun Price Stripe Découverte à 9,90 € EUR. Lance: bun run stripe:plans puis mets à jour STRIPE_DISCOVERY_PRICE_ID (Vercel prod).",
  );
}

/**
 * @param {Stripe} stripe
 * @param {{ dryRun?: boolean, env?: NodeJS.ProcessEnv }} options
 */
async function migrateDiscoverySubscriptionsTo990(stripe, options = {}) {
  const env = options.env || process.env;
  const dryRun = options.dryRun !== false;

  const targetPriceId = await resolveTargetDiscoveryPriceEur(stripe, env);
  const legacySet = new Set(listDiscoveryLegacyPriceIds(env));
  legacySet.delete(targetPriceId);

  const statuses = ["active", "trialing", "past_due"];
  const results = {
    dryRun,
    targetPriceId,
    legacyPriceIds: [...legacySet],
    scanned: 0,
    migrated: 0,
    skippedAlready990: 0,
    errors: [],
    subscriptions: [],
  };

  for (const status of statuses) {
    let startingAfter;
    for (;;) {
      const page = await stripe.subscriptions.list({
        status,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const sub of page.data) {
        results.scanned += 1;
        let match = null;

        for (const item of sub.items.data) {
          const price =
            typeof item.price === "object" && item.price
              ? item.price
              : await stripe.prices.retrieve(String(item.price));
          if (isLegacyDiscoveryPrice(price, legacySet, targetPriceId)) {
            match = { itemId: item.id, fromPriceId: price.id };
            break;
          }
        }

        if (!match) {
          const onlyTarget = sub.items.data.every((item) => {
            const id =
              typeof item.price === "string" ? item.price : item.price?.id;
            return id === targetPriceId;
          });
          if (onlyTarget && sub.items.data.length > 0) {
            results.skippedAlready990 += 1;
          }
          continue;
        }

        const entry = {
          subscriptionId: sub.id,
          customerId:
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          fromPriceId: match.fromPriceId,
          status: sub.status,
        };

        if (dryRun) {
          results.migrated += 1;
          results.subscriptions.push({ ...entry, action: "would_migrate" });
          continue;
        }

        try {
          await stripe.subscriptions.update(sub.id, {
            items: [{ id: match.itemId, price: targetPriceId }],
            proration_behavior: "none",
            metadata: {
              ...sub.metadata,
              plan_type: "discovery",
              price_id: targetPriceId,
              luxeflexia_plan: "discovery",
            },
          });
          results.migrated += 1;
          results.subscriptions.push({ ...entry, action: "migrated" });
        } catch (err) {
          results.errors.push({
            subscriptionId: sub.id,
            message: err && err.message ? String(err.message) : String(err),
          });
        }
      }

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter) break;
    }
  }

  return results;
}

module.exports = {
  DISCOVERY_EUR_CENTS,
  DISCOVERY_LOOKUP_KEY,
  KNOWN_LEGACY_DISCOVERY_EUR,
  listDiscoveryLegacyPriceIds,
  resolveTargetDiscoveryPriceEur,
  migrateDiscoverySubscriptionsTo990,
  isLegacyDiscoveryPrice,
};
