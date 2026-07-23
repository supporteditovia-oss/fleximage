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
  return Math.round((n / d) * 1000) / 10;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

function planMrrCents(planType) {
  return PLAN_MRR_CENTS[planType] || 0;
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

async function fetchCommandCenter(supabase, range) {
  const { from, to, now } = resolveRange(range);
  const fromIso = from ? from.toISOString() : null;
  const toIso = to ? to.toISOString() : null;
  const todayStart = startOfTodayParis().toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const gte = (q, col = "created_at") =>
    fromIso ? q.gte(col, fromIso) : q;
  const lt = (q, col = "created_at") => (toIso ? q.lt(col, toIso) : q);

  const [
    activeSubsRes,
    canceledPeriodRes,
    newSubsPeriodRes,
    signupsPeriodRes,
    signupsTodayRes,
    gensPeriodRes,
    gensTodayRes,
    ledgerPeriodRes,
    profilesTotalRes,
    subsTotalRes,
    funnelLandedRes,
    recentGensRes,
    stuckGensRes,
    zeroCreditSubsRes,
    creditBalanceRes,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_type, credits_per_cycle, status, cancel_at_period_end, created_at")
      .eq("status", "active"),
    (() => {
      let q = supabase
        .from("subscriptions")
        .select("id, plan_type, canceled_at")
        .not("canceled_at", "is", null);
      if (fromIso) q = q.gte("canceled_at", fromIso);
      if (toIso) q = q.lt("canceled_at", toIso);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("subscriptions")
        .select("id, plan_type, created_at, status")
        .eq("status", "active");
      return lt(gte(q));
    })(),
    (() => {
      let q = supabase
        .from("profiles")
        .select("id, created_at, is_subscriber, credits, generation_count, last_active_at, preferred_locale, role")
        .neq("role", "admin");
      return lt(gte(q));
    })(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .neq("role", "admin"),
    (() => {
      let q = supabase
        .from("generations")
        .select(
          "id, status, provider, credit_cost, cost_time, fail_message, created_at, completed_at, user_id, generation_type",
        );
      return lt(gte(q));
    })(),
    supabase
      .from("generations")
      .select("id, status", { count: "exact" })
      .gte("created_at", todayStart),
    (() => {
      let q = supabase
        .from("credit_ledger")
        .select("delta, reason, created_at");
      return lt(gte(q));
    })(),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("role", "admin"),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }),
    (() => {
      let q = supabase
        .from("funnel_events")
        .select("session_id, created_at, meta")
        .eq("step", "landing");
      return lt(gte(q));
    })(),
    supabase
      .from("generations")
      .select(
        "id, status, provider, fail_message, created_at, credit_cost, user_id",
      )
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("generations")
      .select("id, created_at, provider, status", { count: "exact" })
      .eq("status", "processing")
      .lt("created_at", new Date(now.getTime() - 60 * 60 * 1000).toISOString()),
    supabase
      .from("profiles")
      .select("id, email, credits")
      .eq("is_subscriber", true)
      .lte("credits", 0)
      .limit(20),
    supabase
      .from("profiles")
      .select("credits")
      .neq("role", "admin"),
  ]);

  const landed = funnelLandedRes.data || [];
  const landedSet = new Set(landed.map((r) => r.session_id));
  const landedIds = [...landedSet];
  const funnelEvents = [];
  for (let i = 0; i < landedIds.length; i += 100) {
    const chunk = landedIds.slice(i, i + 100);
    if (chunk.length === 0) break;
    const { data: chunkRows } = await supabase
      .from("funnel_events")
      .select("session_id, step, created_at, meta, user_id, path")
      .in("session_id", chunk);
    if (chunkRows) funnelEvents.push(...chunkRows);
  }

  const activeSubs = activeSubsRes.data || [];
  const mrrCents = activeSubs.reduce(
    (sum, s) => sum + planMrrCents(s.plan_type),
    0,
  );
  const byPlan = {};
  for (const s of activeSubs) {
    const key = s.plan_type || "unknown";
    if (!byPlan[key]) {
      byPlan[key] = { count: 0, mrrCents: 0, creditsPerCycle: 0 };
    }
    byPlan[key].count += 1;
    byPlan[key].mrrCents += planMrrCents(key);
    byPlan[key].creditsPerCycle += Number(s.credits_per_cycle) || 0;
  }

  const canceled = canceledPeriodRes.data || [];
  const newSubs = newSubsPeriodRes.data || [];
  const signups = signupsPeriodRes.data || [];
  const gens = gensPeriodRes.data || [];
  const ledger = ledgerPeriodRes.data || [];

  const gensSuccess = gens.filter((g) => g.status === "succeeded").length;
  const gensFailed = gens.filter((g) => g.status === "failed").length;
  const gensProcessing = gens.filter((g) => g.status === "processing").length;
  const byProvider = {};
  for (const g of gens) {
    const p = g.provider || "unknown";
    if (!byProvider[p]) byProvider[p] = { total: 0, success: 0, fail: 0 };
    byProvider[p].total += 1;
    if (g.status === "succeeded") byProvider[p].success += 1;
    if (g.status === "failed") byProvider[p].fail += 1;
  }

  const creditsBurned = ledger
    .filter((e) => e.reason === "generation_charge" && e.delta < 0)
    .reduce((s, e) => s + Math.abs(e.delta), 0);
  const creditsGranted = ledger
    .filter((e) => e.delta > 0)
    .reduce((s, e) => s + e.delta, 0);

  const costTimes = gens
    .map((g) => Number(g.cost_time))
    .filter((n) => Number.isFinite(n) && n > 0);

  // Funnel cohort from landings in period
  const stepCounts = {
    landing: 0,
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
  // Count landings from period query (authoritative)
  stepCounts.landing = landedSet.size;
  for (const [, bag] of sessionSteps) {
    for (const step of Object.keys(stepCounts)) {
      if (step !== "landing" && bag[step]) stepCounts[step] += 1;
    }
  }
  // If landing events weren't in the 8000 window, still count landedSet
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

  // Attribution from landing meta
  const utmSource = {};
  const utmCampaign = {};
  const devices = {};
  const referrers = {};
  for (const row of landed) {
    const meta = row.meta || {};
    const src = String(meta.utm_source || meta.source || "").toLowerCase() || "(direct)";
    const camp = String(meta.utm_campaign || "").toLowerCase() || "(none)";
    const device = String(meta.device || "unknown");
    let refHost = "(direct)";
    try {
      if (meta.referrer) refHost = new URL(String(meta.referrer)).hostname || "(direct)";
    } catch {
      refHost = String(meta.referrer || "(direct)").slice(0, 80);
    }
    utmSource[src] = (utmSource[src] || 0) + 1;
    utmCampaign[camp] = (utmCampaign[camp] || 0) + 1;
    devices[device] = (devices[device] || 0) + 1;
    referrers[refHost] = (referrers[refHost] || 0) + 1;
  }

  // Timing: landing → signup / signup → subscribed (hours)
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

  // Hourly pulse today (landings)
  const hourly = Array.from({ length: 24 }, () => 0);
  for (const row of landed) {
    if (new Date(row.created_at) >= new Date(todayStart)) {
      hourly[hourBucketParis(row.created_at)] += 1;
    }
  }

  // Locale mix of new signups
  const locales = {};
  for (const p of signups) {
    const loc = p.preferred_locale || "fr";
    locales[loc] = (locales[loc] || 0) + 1;
  }

  // Fail message top
  const failMsgs = {};
  for (const g of gens.filter((x) => x.status === "failed")) {
    const msg = String(g.fail_message || "unknown").slice(0, 120);
    failMsgs[msg] = (failMsgs[msg] || 0) + 1;
  }

  const creditBalances = creditBalanceRes.data || [];
  const totalCreditsFloat = creditBalances.reduce(
    (s, p) => s + (Number(p.credits) || 0),
    0,
  );

  const paidInPeriod = stepCounts.subscribed;
  const signupsCount = signups.length;
  const activeCount = activeSubs.length;
  const cancelAtPeriodEnd = activeSubs.filter((s) => s.cancel_at_period_end)
    .length;

  const alerts = [];
  const failRate = pct(gensFailed, gens.length);
  if (failRate != null && failRate >= 15 && gens.length >= 5) {
    alerts.push({
      level: "critical",
      code: "high_fail_rate",
      message: `Taux d'échec générations élevé: ${failRate}% (${gensFailed}/${gens.length})`,
    });
  }
  const stuckCount = stuckGensRes.count || (stuckGensRes.data || []).length;
  if (stuckCount > 0) {
    alerts.push({
      level: "warning",
      code: "stuck_processing",
      message: `${stuckCount} génération(s) bloquée(s) en processing > 1h`,
    });
  }
  const zeroCreds = zeroCreditSubsRes.data || [];
  if (zeroCreds.length > 0) {
    alerts.push({
      level: "warning",
      code: "zero_credit_subs",
      message: `${zeroCreds.length} abonné(s) à 0 crédit`,
    });
  }
  const worstDrop = [...funnelSteps]
    .filter((s) => s.step !== "landing" && s.dropOffPct != null)
    .sort((a, b) => (b.dropOffPct || 0) - (a.dropOffPct || 0))[0];
  if (worstDrop && (worstDrop.dropOffPct || 0) >= 50 && stepCounts.landing >= 10) {
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

  // Simple 7-day signup→paid cohort (from profiles created last 7d)
  const recentSignups = signups.filter(
    (p) => new Date(p.created_at) >= new Date(weekAgo),
  );
  const cohortPaid = recentSignups.filter((p) => p.is_subscriber).length;

  return {
    range,
    from: fromIso,
    to: toIso,
    generatedAt: now.toISOString(),
    kpis: {
      mrrEur: Math.round((mrrCents / 100) * 100) / 100,
      arrEur: Math.round((mrrCents * 12) / 100 * 100) / 100,
      activeSubscribers: activeCount,
      arpuEur:
        activeCount > 0
          ? Math.round((mrrCents / activeCount / 100) * 100) / 100
          : 0,
      signupsPeriod: signupsCount,
      signupsToday: signupsTodayRes.count || 0,
      paidPeriod: paidInPeriod,
      landingToPaidPct: pct(paidInPeriod, stepCounts.landing),
      signupToPaidPct: pct(
        signups.filter((p) => p.is_subscriber).length,
        signupsCount,
      ),
      gensPeriod: gens.length,
      genSuccessRate: pct(gensSuccess, gens.length),
      creditsBurnedPeriod: creditsBurned,
      totalUsers: profilesTotalRes.count || 0,
      totalSubscriptions: subsTotalRes.count || 0,
    },
    revenue: {
      mrrCents,
      mrrEur: Math.round((mrrCents / 100) * 100) / 100,
      arrEur: Math.round((mrrCents * 12) / 100 * 100) / 100,
      byPlan: Object.entries(byPlan).map(([plan, v]) => ({
        plan,
        count: v.count,
        mrrEur: Math.round((v.mrrCents / 100) * 100) / 100,
        priceEur: (PLAN_MRR_CENTS[plan] || 0) / 100,
      })),
      newSubscribersPeriod: newSubs.length,
      newMrrEur: Math.round(
        (newSubs.reduce((s, x) => s + planMrrCents(x.plan_type), 0) / 100) * 100,
      ) / 100,
      churnedPeriod: canceled.length,
      churnedMrrEur: Math.round(
        (canceled.reduce((s, x) => s + planMrrCents(x.plan_type), 0) / 100) *
          100,
      ) / 100,
      cancelAtPeriodEnd,
      netNewSubscribers: newSubs.length - canceled.length,
    },
    growth: {
      signupsPeriod: signupsCount,
      signupsToday: signupsTodayRes.count || 0,
      subscribersAmongSignups: signups.filter((p) => p.is_subscriber).length,
      avgGenerationsAmongSignups:
        signupsCount > 0
          ? Math.round(
              (signups.reduce((s, p) => s + (p.generation_count || 0), 0) /
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
      total: gens.length,
      succeeded: gensSuccess,
      failed: gensFailed,
      processing: gensProcessing,
      successRate: pct(gensSuccess, gens.length),
      todayCount: gensTodayRes.count || (gensTodayRes.data || []).length,
      byProvider: Object.entries(byProvider).map(([provider, v]) => ({
        provider,
        ...v,
        successRate: pct(v.success, v.total),
      })),
      medianCostTimeSec: median(costTimes),
      creditsBurned,
      creditsGranted,
      topFailMessages: topCounts(failMsgs, 6),
      byType: (() => {
        const map = {};
        for (const g of gens) {
          const t = g.generation_type || "image";
          map[t] = (map[t] || 0) + 1;
        }
        return topCounts(map);
      })(),
    },
    economy: {
      creditsBurnedPeriod: creditsBurned,
      creditsGrantedPeriod: creditsGranted,
      floatingCreditsTotal: totalCreditsFloat,
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
      recentGenerations: (recentGensRes.data || []).map((g) => ({
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
      zeroCreditSubscribers: zeroCreds.length,
      failRate,
    },
  };
}

module.exports = {
  fetchCommandCenter,
  PLAN_MRR_CENTS,
  resolveRange,
};
