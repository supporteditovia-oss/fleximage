const { getCrmSupabase } = require("./supabase");
const { isCrmSchemaMissingError } = require("./schema-errors");
const { emptyDashboardPayload } = require("./empty");

function startOfDayUtc(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x.toISOString();
}

function endOfDayUtc(d) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x.toISOString();
}

async function fetchDashboard() {
  const sb = getCrmSupabase();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const monthAgoStr = monthAgo.toISOString().slice(0, 10);

  const [
    accountsRes,
    dailyRes,
    postsPendingRes,
    postsTodayRes,
    shortsQueueRes,
    upcomingRes,
    topPostsRes,
    topAccountRes,
  ] = await Promise.all([
    sb.from("crm_social_accounts").select("id, platform", { count: "exact" }),
    sb
      .from("crm_analytics")
      .select("*")
      .not("metric_date", "is", null)
      .gte("metric_date", monthAgoStr),
    sb
      .from("crm_schedule")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "scheduled"]),
    sb
      .from("crm_schedule")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", startOfDayUtc(now))
      .lte("published_at", endOfDayUtc(now)),
    sb
      .from("crm_schedule")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .eq("platform", "youtube"),
    sb
      .from("crm_schedule")
      .select(
        "id, scheduled_at, status, platform, account:crm_social_accounts(display_name, username)",
      )
      .gte("scheduled_at", now.toISOString())
      .in("status", ["scheduled", "draft"])
      .order("scheduled_at", { ascending: true })
      .limit(6),
    sb
      .from("crm_analytics")
      .select(
        "views, viral_score, post:crm_schedule(id, caption, platform, account:crm_social_accounts(username, display_name))",
      )
      .not("post_id", "is", null)
      .order("views", { ascending: false })
      .limit(5),
    sb
      .from("crm_analytics")
      .select(
        "account_id, views, performance_score, account:crm_social_accounts(id, username, display_name, platform, country_code)",
      )
      .not("metric_date", "is", null)
      .gte("metric_date", weekAgoStr),
  ]);

  const firstErr = [
    accountsRes.error,
    dailyRes.error,
    postsPendingRes.error,
  ].find(Boolean);
  if (isCrmSchemaMissingError(firstErr)) {
    return emptyDashboardPayload();
  }

  const daily = dailyRes.data || [];
  const totals = daily.reduce(
    (acc, row) => {
      acc.views += Number(row.views) || 0;
      acc.likes += Number(row.likes) || 0;
      acc.comments += Number(row.comments) || 0;
      acc.shares += Number(row.shares) || 0;
      acc.subscribersGained += Number(row.subscribers_gained) || 0;
      acc.watchTimeSum += Number(row.watch_time_avg_seconds) || 0;
      acc.retentionSum += Number(row.retention_avg) || 0;
      acc.scoreSum += Number(row.performance_score) || 0;
      acc.days += 1;
      return acc;
    },
    {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      subscribersGained: 0,
      watchTimeSum: 0,
      retentionSum: 0,
      scoreSum: 0,
      days: 0,
    },
  );

  const days = totals.days || 1;
  const performanceScore =
    daily.length > 0
      ? Math.round((totals.scoreSum / days) * 10) / 10
      : 0;

  const byDate = new Map();
  for (const row of daily) {
    const key = row.metric_date;
    if (!byDate.has(key)) {
      byDate.set(key, { date: key, views: 0, likes: 0, retention: 0, n: 0 });
    }
    const b = byDate.get(key);
    b.views += Number(row.views) || 0;
    b.likes += Number(row.likes) || 0;
    b.retention += Number(row.retention_avg) || 0;
    b.n += 1;
  }
  const chartSeries = [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({
      date: b.date,
      views: b.views,
      likes: b.likes,
      retention: b.n ? Math.round((b.retention / b.n) * 10) / 10 : 0,
    }));

  const accountScores = new Map();
  for (const row of topAccountRes.data || []) {
    const id = row.account_id;
    if (!accountScores.has(id)) {
      accountScores.set(id, {
        account: row.account,
        views: 0,
        score: 0,
        n: 0,
      });
    }
    const a = accountScores.get(id);
    a.views += Number(row.views) || 0;
    a.score += Number(row.performance_score) || 0;
    a.n += 1;
  }
  let topAccountWeek = null;
  for (const [, v] of accountScores) {
    const avg = v.n ? v.score / v.n : 0;
    if (
      !topAccountWeek ||
      v.views > topAccountWeek.views ||
      (v.views === topAccountWeek.views && avg > topAccountWeek.avgScore)
    ) {
      topAccountWeek = {
        account: v.account,
        views: v.views,
        avgScore: Math.round(avg * 10) / 10,
      };
    }
  }

  const platformCounts = { tiktok: 0, instagram: 0, youtube: 0 };
  for (const a of accountsRes.data || []) {
    if (platformCounts[a.platform] !== undefined) {
      platformCounts[a.platform] += 1;
    }
  }

  return {
    dateLabel: now.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    }),
    schemaReady: true,
    stats: {
      totalViews: totals.views,
      avgWatchTimeSeconds:
        days > 0 ? Math.round(totals.watchTimeSum / days) : 0,
      avgRetention:
        days > 0 ? Math.round((totals.retentionSum / days) * 10) / 10 : 0,
      subscribersGained: totals.subscribersGained,
      likes: totals.likes,
      comments: totals.comments,
      shares: totals.shares,
      videosPending: postsPendingRes.count ?? 0,
      publishedToday: postsTodayRes.count ?? 0,
      shortsInQueue: shortsQueueRes.count ?? 0,
      connectedAccounts: accountsRes.count ?? 0,
      performanceScore,
      platformCounts,
    },
    topVideos: (topPostsRes.data || []).map((row, i) => ({
      rank: i + 1,
      views: row.views,
      viralScore: row.viral_score,
      post: row.post,
    })),
    topAccountWeek,
    chartSeries,
    recentActivity: [],
    upcomingPosts: (upcomingRes.data || []).map((p) => ({
      id: p.id,
      scheduledAt: p.scheduled_at,
      status: p.status,
      platform: p.platform,
      account: p.account,
    })),
  };
}

module.exports = { fetchDashboard };
