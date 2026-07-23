const FUNNEL_STEPS = [
  "landing",
  "signup",
  "upload",
  "generate",
  "preview",
  "paywall",
  "subscribed",
];

const STEP_SET = new Set(FUNNEL_STEPS);

function isValidStep(step) {
  return typeof step === "string" && STEP_SET.has(step);
}

function isValidSessionId(sessionId) {
  if (typeof sessionId !== "string") return false;
  const trimmed = sessionId.trim();
  return trimmed.length >= 8 && trimmed.length <= 128;
}

/**
 * Insert a funnel event once per (session_id, step).
 * Returns { inserted: boolean }.
 */
async function recordFunnelEvent(supabase, params) {
  const sessionId = String(params.sessionId || "").trim();
  const step = params.step;
  if (!isValidSessionId(sessionId) || !isValidStep(step)) {
    return { inserted: false, reason: "invalid" };
  }

  const row = {
    session_id: sessionId,
    step,
    user_id: params.userId || null,
    path:
      typeof params.path === "string" ? params.path.slice(0, 500) : null,
    meta:
      params.meta && typeof params.meta === "object" && !Array.isArray(params.meta)
        ? params.meta
        : {},
  };

  const { error } = await supabase.from("funnel_events").upsert(row, {
    onConflict: "session_id,step",
    ignoreDuplicates: true,
  });

  if (error) {
    // Unique race / ignoreDuplicates edge cases — treat as non-fatal.
    if (error.code === "23505") {
      return { inserted: false, reason: "duplicate" };
    }
    throw error;
  }

  // Best-effort: attach user_id on later steps if we now know it
  // and the first insert had no user.
  if (params.userId) {
    await supabase
      .from("funnel_events")
      .update({ user_id: params.userId })
      .eq("session_id", sessionId)
      .is("user_id", null);
  }

  return { inserted: true };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

function startOfTodayInTimeZone(timeZone) {
  const now = new Date();
  const offset = getTimeZoneOffsetMs(now, timeZone);
  const local = new Date(now.getTime() + offset);
  const startLocalMs = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(startLocalMs - offset);
}

function resolveFunnelRange(range) {
  const now = new Date();
  const to = now;
  if (range === "all") {
    return { from: null, to: null };
  }
  if (range === "7d") {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to };
  }
  if (range === "30d") {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to };
  }
  // today — calendar day in Europe/Paris (TikTok ops)
  return { from: startOfTodayInTimeZone("Europe/Paris"), to };
}

function buildFunnelPayload(rows) {
  const counts = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, 0]));
  for (const row of rows || []) {
    if (row && isValidStep(row.step)) {
      counts[row.step] = Number(row.sessions) || 0;
    }
  }

  const landing = counts.landing;
  const steps = FUNNEL_STEPS.map((step, index) => {
    const count = counts[step];
    const prevStep = index === 0 ? null : FUNNEL_STEPS[index - 1];
    const prevCount = prevStep ? counts[prevStep] : null;
    const pctOfLanding =
      landing > 0 ? Math.round((count / landing) * 1000) / 10 : null;
    const pctOfPrevious =
      prevCount != null && prevCount > 0
        ? Math.round((count / prevCount) * 1000) / 10
        : null;
    const dropOffCount =
      prevCount != null ? Math.max(0, prevCount - count) : 0;
    const dropOffPct =
      prevCount != null && prevCount > 0
        ? Math.round((dropOffCount / prevCount) * 1000) / 10
        : null;

    return {
      step,
      count,
      pctOfLanding,
      pctOfPrevious,
      dropOffCount,
      dropOffPct,
    };
  });

  return {
    landing,
    steps,
  };
}

async function fetchFunnelStats(supabase, range) {
  const { from, to } = resolveFunnelRange(range);
  const { data, error } = await supabase.rpc("admin_funnel_stats", {
    p_from: from ? from.toISOString() : null,
    p_to: to ? to.toISOString() : null,
  });
  if (error) throw error;
  return {
    range: range || "today",
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
    ...buildFunnelPayload(data),
  };
}

module.exports = {
  FUNNEL_STEPS,
  isValidStep,
  isValidSessionId,
  recordFunnelEvent,
  resolveFunnelRange,
  buildFunnelPayload,
  fetchFunnelStats,
};
