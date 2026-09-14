const { RETENTION_DAYS } = require("./generation-retention");
const { purgeGenerationRow, deleteR2Keys } = require("./purge-generation");
const { listR2Objects } = require("./r2");

/** Jours sans retour sur le site après résiliation avant purge totale de l'historique. */
const CHURN_INACTIVITY_DAYS =
  Number(process.env.CHURN_INACTIVITY_DAYS) || RETENTION_DAYS;

const CHURN_SUBSCRIPTION_STATUSES = new Set([
  "canceled",
  "past_due",
  "unpaid",
]);

function isInactiveSince(profile, cutoffMs) {
  if (!profile?.last_active_at) return true;
  const lastMs = new Date(profile.last_active_at).getTime();
  return Number.isFinite(lastMs) && lastMs < cutoffMs;
}

function isCancelledLongAgo(subRows, cutoffMs) {
  if (!subRows?.length) return false;
  return subRows.some((sub) => {
    if (sub.status !== "canceled") return false;
    if (!sub.canceled_at) return true;
    const canceledMs = new Date(sub.canceled_at).getTime();
    return Number.isFinite(canceledMs) && canceledMs < cutoffMs;
  });
}

async function fetchChurnedExSubscriberProfiles(supabase, limit = 50) {
  const cutoffMs = Date.now() - CHURN_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  const { data: subs, error: subErr } = await supabase
    .from("subscriptions")
    .select("user_id, status, canceled_at")
    .eq("status", "canceled")
    .or(`canceled_at.is.null,canceled_at.lt.${cutoffIso}`)
    .limit(Math.max(limit * 4, 200));

  if (subErr) throw subErr;

  const userIds = [...new Set((subs ?? []).map((row) => row.user_id).filter(Boolean))];
  if (!userIds.length) return [];

  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "id, is_subscriber, subscription_status, stripe_customer_id, last_active_at, role",
    )
    .in("id", userIds)
    .eq("role", "user")
    .eq("is_subscriber", false);

  if (profileErr) throw profileErr;

  const subsByUser = new Map();
  for (const row of subs ?? []) {
    if (!subsByUser.has(row.user_id)) subsByUser.set(row.user_id, []);
    subsByUser.get(row.user_id).push(row);
  }

  const churned = [];
  for (const profile of profiles ?? []) {
    if (profile.is_subscriber) continue;
    if (!isInactiveSince(profile, cutoffMs)) continue;

    const userSubs = subsByUser.get(profile.id) ?? [];
    const hadSubscription =
      userSubs.length > 0 ||
      CHURN_SUBSCRIPTION_STATUSES.has(profile.subscription_status);
    if (!hadSubscription) continue;

    const cancelledLongAgo =
      isCancelledLongAgo(userSubs, cutoffMs) ||
      CHURN_SUBSCRIPTION_STATUSES.has(profile.subscription_status);

    if (!cancelledLongAgo) continue;
    churned.push({ profile, subs: userSubs });
  }

  return churned.slice(0, limit);
}

async function purgeUserInputPrefix(userId) {
  const prefix = `inputs/${userId}/`;

  try {
    const listed = await listR2Objects(prefix, 5000);
    const keys = listed.map((obj) => obj.key).filter(Boolean);
    return deleteR2Keys(keys);
  } catch (err) {
    console.warn("[purge-churned] list inputs failed", userId, err?.message);
    return 0;
  }
}

async function purgeAllGenerationsForUser(supabase, userId, batchSize = 200) {
  let purged = 0;
  let keys = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("generations")
      .select("id, user_id, input_assets, output_assets, watermarked_assets")
      .eq("user_id", userId)
      .limit(batchSize);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const result = await purgeGenerationRow(supabase, row);
      if (result.deletedRow) purged += 1;
      keys += result.deletedKeys;
    }

    if (data.length < batchSize) break;
  }

  keys += await purgeUserInputPrefix(userId);
  return { purged, keys };
}

async function purgeChurnedExSubscriberGenerations(supabase, options = {}) {
  const userLimit = options.userLimit ?? 50;
  const genBatch = options.genBatch ?? 200;
  const targets = await fetchChurnedExSubscriberProfiles(supabase, userLimit);

  let usersPurged = 0;
  let generationsPurged = 0;
  let keys = 0;
  const userIds = [];

  for (const { profile } of targets) {
    const result = await purgeAllGenerationsForUser(
      supabase,
      profile.id,
      genBatch,
    );
    if (result.purged > 0 || result.keys > 0) {
      usersPurged += 1;
      userIds.push(profile.id);
    }
    generationsPurged += result.purged;
    keys += result.keys;
  }

  return {
    usersPurged,
    generationsPurged,
    keys,
    scannedUsers: targets.length,
    userIds,
    inactivityDays: CHURN_INACTIVITY_DAYS,
  };
}

module.exports = {
  CHURN_INACTIVITY_DAYS,
  CHURN_SUBSCRIPTION_STATUSES,
  isInactiveSince,
  isCancelledLongAgo,
  fetchChurnedExSubscriberProfiles,
  purgeAllGenerationsForUser,
  purgeChurnedExSubscriberGenerations,
};
