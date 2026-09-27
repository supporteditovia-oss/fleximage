function emptyDashboardPayload() {
  const now = new Date();
  return {
    dateLabel: now.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    }),
    stats: {
      totalViews: 0,
      avgWatchTimeSeconds: 0,
      avgRetention: 0,
      subscribersGained: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      videosPending: 0,
      publishedToday: 0,
      shortsInQueue: 0,
      connectedAccounts: 0,
      performanceScore: 0,
      platformCounts: { tiktok: 0, instagram: 0, youtube: 0 },
    },
    topVideos: [],
    topAccountWeek: null,
    chartSeries: [],
    recentActivity: [],
    upcomingPosts: [],
    schemaReady: false,
  };
}

module.exports = { emptyDashboardPayload };
