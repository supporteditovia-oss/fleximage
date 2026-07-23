const PLAN_MRR_CENTS = {
  discovery: 890,
  essential: 1990,
  ultimate: 3990,
};

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

function startOfTodayParis() {
  const now = new Date();
  const offset = getTimeZoneOffsetMs(now, "Europe/Paris");
  const local = new Date(now.getTime() + offset);
  const startLocalMs = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(startLocalMs - offset);
}

function resolveRange(range) {
  const now = new Date();
  if (range === "all") return { from: null, to: null, now };
  if (range === "7d") {
    return { from: new Date(now.getTime() - 7 * 86400000), to: now, now };
  }
  if (range === "30d") {
    return { from: new Date(now.getTime() - 30 * 86400000), to: now, now };
  }
  return { from: startOfTodayParis(), to: now, now };
}

function pct(n, d) {
  if (!d) return null;
  return Math.round((Number(n) / Number(d)) * 1000) / 10;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

function topCounts(map, limit = 8) {
  return Object.entries(map)
    .map(([key, count]) => ({ key: key || "(direct)", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function hourBucketParis(iso) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hourCycle: "h23",
  });
  return Number(dtf.format(new Date(iso)));
}

/** Paginate Supabase selects past the 1000-row default cap. */
async function fetchAllRows(buildQuery) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

async function fetchCommandCenter(supabase, range) {
  const { from, to, now } = resolveRange(range);
  const fromIso = from ? from.toISOString() : null;
  const toIso = to ? to.toISOString() : null;
  const todayStart = startOfTodayParis().toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const gte = (q, col = "created_at") =>
    fromIso ? q.gte(col, fromIso) : q;
  const lt = (q, col = "created_at") => (toIso ? q.lt(col, toIso) : q);

  // Core KPIs: exact SQL aggregates (no 1000-row truncation).
  const { data: core, error: coreErr } = await supabase.rpc(
    "admin_hq_core_stats",
    {
      p_from: fromIso,
      p_to: toIso,
      p_today_start: todayStart,
    },
  );
  if (coreErr) throw coreErr;

  const mrrCents = Number(core.mrr_cents) || 0;
  const activeCount = Number(core.active_subscribers) || 0;
  const cancelAtPeriodEnd = Number(core.cancel_at_period_end) || 0;
  const signupsCount = Number(core.signups_period) || 0;
  const signupsToday = Number(core.signups_today) || 0;
  const gensTotal = Number(core.gens_period) || 0;
  const gensSuccess = Number(core.gens_succeeded) || 0;
  const gensFailed = Number(core.gens_failed) || 0;
  const gensProcessing = Number(core.gens_processing) || 0;
  const gensToday = Number(core.gens_today) || 0;
  const creditsBurned = Number(core.credits_burned) || 0;
  const creditsGranted = Number(core.credits_granted) || 0;
  const floatingCredits = Number(core.floating_credits) || 0;
  const zeroCreditSubscribers = Number(core.zero_credit_subscribers) || 0;
  const stuckCount = Number(core.stuck_processing) || 0;
  const newSubsPeriod = Number(core.new_subs_period) || 0;
  const churnedPeriod = Number(core.churned_period) || 0;
  const totalUsers = Number(core.total_users) || 0;
  const totalSubscriptions = Number(core.total_subscriptions) || 0;
  const signupsPeriodSubscribers =
    Number(core.signups_period_subscribers) || 0;

  const byPlanRows = Array.isArray(core.by_plan) ? core.by_plan : [];
  const byPlan = byPlanRows.map((p) => ({
    plan: p.plan || "unknown",
    count: Number(p.count) || 0,
    mrrEur: Math.round(((Number(p.mrr_cents) || 0) / 100) * 100) / 100,
    priceEur: (PLAN_MRR_CENTS[p.plan] || 0) / 100,
  }));

  // Detail rows (paginated) for funnel / attribution / providers / pulse.
  const [
    funnelLanded,
    gensDetail,
    signupsDetail,
    canceledDetail,
    newSubsDetail,
    recentGens,
  ] = await Promise.all([
    fetchAllRows(() => {
      let q = supabase
        .from("funnel_events")
        .select("session_id, created_at, meta")
        .eq("step", "landing")
        .order("created_at", { ascending: true });
      return lt(gte(q));
    }),
    fetchAllRows(() => {
      let q = supabase
        .from("generations")
        .select(
          "id, status, provider, cost_time, fail_message, generation_type, created_at",
        )
        .order("created_at", { ascending: true });
      return lt(gte(q));
    }),
    fetchAllRows(() => {
      let q = supabase
        .from("profiles")
        .select(
          "id, created_at, is_subscriber, generation_count, preferred_locale, role",
        )
        .neq("role", "admin")
        .order("created_at", { ascending: true });
      return lt(gte(q));
    }),
    fetchAllRows(() => {
      let q = supabase
        .from("subscriptions")
        .select("id, plan_type, canceled_at, monthly_amount_cents")
        .not("canceled_at", "is", null)
        .order("canceled_at", { ascending: true });
      if (fromIso) q = q.gte("canceled_at", fromIso);
      if (toIso) q = q.lt("canceled_at", toIso);
      return q;
    }),
    fetchAllRows(() => {
      let q = supabase
        .from("subscriptions")
        .select("id, plan_type, created_at, monthly_amount_cents, status")
        .eq("status", "active")
        .order("created_at", { ascending: true });
      return lt(gte(q));
    }),
    supabase
      .from("generations")
      .select(
        "id, status, provider, fail_message, created_at, credit_cost, user_id",
      )
      .order("created_at", { ascending: false })
      .limit(25)
      .then((r) => {
        if (r.error) throw r.error;
        return r.data || [];
      }),
  ]);

  const landedSet = new Set(funnelLanded.map((r) => r.session_id));
  const landedIds = [...landedSet];
  const funnelEvents = [];
  for (let i = 0; i < landedIds.length; i += 100) {
    const chunk = landedIds.slice(i, i + 100);
    const chunkRows = await fetchAllRows(() =>
      supabase
        .from("funnel_events")
        .select("session_id, step, created_at, meta, user_id, path")
        .in("session_id", chunk)
        .order("created_at", { ascending: true }),
    );
    funnelEvents.push(...chunkRows);
  }

  const stepCounts = {
    landing: landedSet.size,
    signup: 0,
    upload: 0,
    generate: 0,
    preview: 0,
    paywall: 0,
    subscribed: 0,
  };
  const sessionSteps = new Map();
  for (const e of funnelEvents) {
    if (!sessionSteps.has(e.session_id)) sessionSteps.set(e.session_id, {});
    const bag = sessionSteps.get(e.session_id);
    if (!bag[e.step] || new Date(e.created_at) < new Date(bag[e.step])) {
      bag[e.step] = e.created_at;
    }
  }
  for (const [, bag] of sessionSteps) {
    for (const step of Object.keys(stepCounts)) {
      if (step !== "landing" && bag[step]) stepCounts[step] += 1;
    }
  }

  const FUNNEL_ORDER = [
    "landing",
    "signup",
    "upload",
    "generate",
    "preview",
    "paywall",
    "subscribed",
  ];
  const funnelSteps = FUNNEL_ORDER.map((step, index) => {
    const count = stepCounts[step] || 0;
    const prev = index === 0 ? null : stepCounts[FUNNEL_ORDER[index - 1]] || 0;
    const dropOffCount = prev == null ? 0 : Math.max(0, prev - count);
    return {
      step,
      count,
      pctOfLanding: pct(count, stepCounts.landing),
      pctOfPrevious: prev == null ? null : pct(count, prev),
      dropOffCount,
      dropOffPct: prev == null ? null : pct(dropOffCount, prev),
    };
  });

  const utmSource = {};
  const utmCampaign = {};
  const devices = {};
  const referrers = {};
  for (const row of funnelLanded) {
    const meta = row.meta || {};
    const src =
      String(meta.utm_source || meta.source || "").toLowerCase() || "(direct)";
    const camp = String(meta.utm_campaign || "").toLowerCase() || "(none)";
    const device = String(meta.device || "unknown");
    let refHost = "(direct)";
    try {
      if (meta.referrer)
        refHost = new URL(String(meta.referrer)).hostname || "(direct)";
    } catch {
      refHost = String(meta.referrer || "(direct)").slice(0, 80);
    }
    utmSource[src] = (utmSource[src] || 0) + 1;
    utmCampaign[camp] = (utmCampaign[camp] || 0) + 1;
    devices[device] = (devices[device] || 0) + 1;
    referrers[refHost] = (referrers[refHost] || 0) + 1;
  }

  const landToSignup = [];
  const signupToPaid = [];
  for (const [, bag] of sessionSteps) {
    if (bag.landing && bag.signup) {
      landToSignup.push(
        (new Date(bag.signup) - new Date(bag.landing)) / 3600000,
      );
    }
    if (bag.signup && bag.subscribed) {
      signupToPaid.push(
        (new Date(bag.subscribed) - new Date(bag.signup)) / 3600000,
      );
    }
  }

  const hourly = Array.from({ length: 24 }, () => 0);
  for (const row of funnelLanded) {
    if (new Date(row.created_at) >= new Date(todayStart)) {
      hourly[hourBucketParis(row.created_at)] += 1;
    }
  }

  const locales = {};
  for (const p of signupsDetail) {
    const loc = p.preferred_locale || "fr";
    locales[loc] = (locales[loc] || 0) + 1;
  }

  const byProvider = {};
  const failMsgs = {};
  const byType = {};
  const costTimes = [];
  for (const g of gensDetail) {
    const p = g.provider || "unknown";
    if (!byProvider[p]) byProvider[p] = { total: 0, success: 0, fail: 0 };
    byProvider[p].total += 1;
    if (g.status === "succeeded") byProvider[p].success += 1;
    if (g.status === "failed") {
      byProvider[p].fail += 1;
      const msg = String(g.fail_message || "unknown").slice(0, 120);
      failMsgs[msg] = (failMsgs[msg] || 0) + 1;
    }
    const t = g.generation_type || "image";
    byType[t] = (byType[t] || 0) + 1;
    const ct = Number(g.cost_time);
    if (Number.isFinite(ct) && ct > 0) costTimes.push(ct);
  }

  const newMrrCents = newSubsDetail.reduce(
    (s, x) => s + (Number(x.monthly_amount_cents) || PLAN_MRR_CENTS[x.plan_type] || 0),
    0,
  );
  const churnedMrrCents = canceledDetail.reduce(
    (s, x) => s + (Number(x.monthly_amount_cents) || PLAN_MRR_CENTS[x.plan_type] || 0),
    0,
  );

  const recentSignups = signupsDetail.filter(
    (p) => new Date(p.created_at) >= new Date(weekAgo),
  );
  const cohortPaid = recentSignups.filter((p) => p.is_subscriber).length;

  const paidInPeriod = stepCounts.subscribed;
  const failRate = pct(gensFailed, gensTotal);

  const alerts = [];
  if (failRate != null && failRate >= 15 && gensTotal >= 5) {
    alerts.push({
      level: "critical",
      code: "high_fail_rate",
      message: `Taux d'échec générations élevé: ${failRate}% (${gensFailed}/${gensTotal})`,
    });
  }
  if (stuckCount > 0) {
    alerts.push({
      level: "warning",
      code: "stuck_processing",
      message: `${stuckCount} génération(s) bloquée(s) en processing > 1h`,
    });
  }
  if (zeroCreditSubscribers > 0) {
    alerts.push({
      level: "warning",
      code: "zero_credit_subs",
      message: `${zeroCreditSubscribers} abonné(s) à 0 crédit`,
    });
  }
  const worstDrop = [...funnelSteps]
    .filter((s) => s.step !== "landing" && s.dropOffPct != null)
    .sort((a, b) => (b.dropOffPct || 0) - (a.dropOffPct || 0))[0];
  if (
    worstDrop &&
    (worstDrop.dropOffPct || 0) >= 50 &&
    stepCounts.landing >= 10
  ) {
    alerts.push({
      level: "info",
      code: "funnel_bottleneck",
      message: `Goulot: drop-off ${worstDrop.dropOffPct}% avant « ${worstDrop.step} »`,
    });
  }
  if (cancelAtPeriodEnd > 0) {
    alerts.push({
      level: "info",
      code: "pending_churn",
      message: `${cancelAtPeriodEnd} abo actifs avec résiliation en fin de période`,
    });
  }

  return {
    range,
    from: fromIso,
    to: toIso,
    generatedAt: now.toISOString(),
    dataQuality: {
      coreStats: "supabase_rpc_admin_hq_core_stats",
      mrr: "sum(subscriptions.monthly_amount_cents) where status=active",
      noMockData: true,
      clientCacheDisabled: true,
    },
    kpis: {
      mrrEur: Math.round((mrrCents / 100) * 100) / 100,
      arrEur: Math.round(((mrrCents * 12) / 100) * 100) / 100,
      activeSubscribers: activeCount,
      arpuEur:
        activeCount > 0
          ? Math.round((mrrCents / activeCount / 100) * 100) / 100
          : 0,
      signupsPeriod: signupsCount,
      signupsToday,
      paidPeriod: paidInPeriod,
      landingToPaidPct: pct(paidInPeriod, stepCounts.landing),
      signupToPaidPct: pct(signupsPeriodSubscribers, signupsCount),
      gensPeriod: gensTotal,
      genSuccessRate: pct(gensSuccess, gensTotal),
      creditsBurnedPeriod: creditsBurned,
      totalUsers,
      totalSubscriptions,
    },
    revenue: {
      mrrCents,
      mrrEur: Math.round((mrrCents / 100) * 100) / 100,
      arrEur: Math.round(((mrrCents * 12) / 100) * 100) / 100,
      byPlan,
      newSubscribersPeriod: newSubsPeriod,
      newMrrEur: Math.round((newMrrCents / 100) * 100) / 100,
      churnedPeriod,
      churnedMrrEur: Math.round((churnedMrrCents / 100) * 100) / 100,
      cancelAtPeriodEnd,
      netNewSubscribers: newSubsPeriod - churnedPeriod,
    },
    growth: {
      signupsPeriod: signupsCount,
      signupsToday,
      subscribersAmongSignups: signupsPeriodSubscribers,
      avgGenerationsAmongSignups:
        signupsCount > 0
          ? Math.round(
              (signupsDetail.reduce(
                (s, p) => s + (p.generation_count || 0),
                0,
              ) /
                signupsCount) *
                10,
            ) / 10
          : 0,
      locales: topCounts(locales),
      cohort7d: {
        signups: recentSignups.length,
        paid: cohortPaid,
        paidPct: pct(cohortPaid, recentSignups.length),
      },
    },
    product: {
      total: gensTotal,
      succeeded: gensSuccess,
      failed: gensFailed,
      processing: gensProcessing,
      successRate: pct(gensSuccess, gensTotal),
      todayCount: gensToday,
      byProvider: Object.entries(byProvider).map(([provider, v]) => ({
        provider,
        ...v,
        successRate: pct(v.success, v.total),
      })),
      medianCostTimeSec: median(costTimes),
      creditsBurned,
      creditsGranted,
      topFailMessages: topCounts(failMsgs, 6),
      byType: topCounts(byType),
    },
    economy: {
      creditsBurnedPeriod: creditsBurned,
      creditsGrantedPeriod: creditsGranted,
      floatingCreditsTotal: floatingCredits,
      revenuePer1kCreditsEur:
        creditsBurned > 0
          ? Math.round((mrrCents / 100 / (creditsBurned / 1000)) * 100) / 100
          : null,
      gensPerSubscriber:
        activeCount > 0
          ? Math.round((gensSuccess / activeCount) * 10) / 10
          : null,
    },
    funnel: {
      landing: stepCounts.landing,
      steps: funnelSteps,
    },
    attribution: {
      utmSources: topCounts(utmSource),
      utmCampaigns: topCounts(utmCampaign),
      devices: topCounts(devices),
      referrers: topCounts(referrers),
    },
    timing: {
      medianLandingToSignupHours: median(landToSignup),
      medianSignupToPaidHours: median(signupToPaid),
      samples: {
        landToSignup: landToSignup.length,
        signupToPaid: signupToPaid.length,
      },
    },
    pulse: {
      hourlyLandingsToday: hourly,
      recentGenerations: recentGens.map((g) => ({
        id: g.id,
        status: g.status,
        provider: g.provider,
        failMessage: g.fail_message,
        createdAt: g.created_at,
        creditCost: g.credit_cost,
      })),
    },
    health: {
      alerts,
      stuckProcessing: stuckCount,
      zeroCreditSubscribers,
      failRate,
    },
  };
}

module.exports = {
  fetchCommandCenter,
  PLAN_MRR_CENTS,
  resolveRange,
};
