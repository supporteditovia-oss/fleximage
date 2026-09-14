const { createClient } = require("@supabase/supabase-js");

const CACHE_TTL_MS = 10 * 60 * 1000;

const TRUST_STATS_MIN_TOTAL = 500;
const TRUST_STATS_MIN_CREATORS = 100;
const TRUST_STATS_MIN_RECENT = 50;

/** @type {{ payload: import("../../shared/trust-stats").TrustStatsPayload | null, expiresAt: number }} */
let cache = { payload: null, expiresAt: 0 };

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error("Configuration Supabase manquante"), {
      status: 500,
    });
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

function floorTrustCount(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw < 100) return Math.floor(raw / 10) * 10;
  if (raw < 1_000) return Math.floor(raw / 50) * 50;
  if (raw < 10_000) return Math.floor(raw / 500) * 500;
  return Math.floor(raw / 1_000) * 1_000;
}

function buildTrustStatsDisplay(raw) {
  const totalGenerations = floorTrustCount(raw.totalGenerations);
  const recentGenerations = floorTrustCount(raw.recentGenerations);
  const creators = floorTrustCount(raw.creators);

  return {
    totalGenerations,
    recentGenerations,
    creators,
    showTotal:
      raw.totalGenerations >= TRUST_STATS_MIN_TOTAL && totalGenerations > 0,
    showRecent:
      raw.recentGenerations >= TRUST_STATS_MIN_RECENT && recentGenerations > 0,
    showCreators:
      raw.creators >= TRUST_STATS_MIN_CREATORS && creators > 0,
  };
}

function buildTrustStatsPayload(raw) {
  return {
    raw,
    display: buildTrustStatsDisplay(raw),
    asOf: new Date().toISOString(),
  };
}

async function fetchTrustStatsRaw(supabase) {
  const { data, error } = await supabase.rpc("admin_trust_stats");
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      totalGenerations: 0,
      recentGenerations: 0,
      creators: 0,
    };
  }

  return {
    totalGenerations: Number(row.total_generations) || 0,
    recentGenerations: Number(row.recent_generations) || 0,
    creators: Number(row.creators) || 0,
  };
}

async function fetchTrustStatsFallback(supabase) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const base = () =>
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("status", "succeeded")
      .eq("generation_type", "image");

  const [totalRes, recentRes] = await Promise.all([
    base(),
    base().gte("created_at", thirtyDaysAgo),
  ]);

  if (totalRes.error) throw totalRes.error;
  if (recentRes.error) throw recentRes.error;

  return {
    totalGenerations: totalRes.count ?? 0,
    recentGenerations: recentRes.count ?? 0,
    creators: 0,
  };
}

async function getTrustStatsPayload() {
  const now = Date.now();
  if (cache.payload && now < cache.expiresAt) {
    return cache.payload;
  }

  const supabase = getSupabaseAdmin();
  let raw;

  try {
    raw = await fetchTrustStatsRaw(supabase);
  } catch (rpcError) {
    console.warn("admin_trust_stats RPC unavailable, using fallback counts", rpcError);
    raw = await fetchTrustStatsFallback(supabase);
  }

  const payload = buildTrustStatsPayload(raw);
  cache = { payload, expiresAt: now + CACHE_TTL_MS };
  return payload;
}

module.exports = {
  getTrustStatsPayload,
  floorTrustCount,
  buildTrustStatsDisplay,
};
