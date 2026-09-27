export type CrmPlatform = "tiktok" | "instagram" | "youtube";
export type CrmWarmupPhase = "new" | "warming" | "active" | "rest";
export type CrmPostStatus = "draft" | "scheduled" | "published" | "failed";

export type CrmAccount = {
  id: string;
  platform: CrmPlatform;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  country_code: string;
  language_code: string;
  timezone: string;
  status: string;
  warmup_phase: CrmWarmupPhase;
  warmup_day: number;
  warmup_trust_score: number;
  warmup_interactions_total: number;
  followers: number;
  likes: number;
  views: number;
  provider_account_id?: string | null;
};

export type CrmDashboard = {
  dateLabel: string;
  stats: {
    totalViews: number;
    avgWatchTimeSeconds: number;
    avgRetention: number;
    subscribersGained: number;
    likes: number;
    comments: number;
    shares: number;
    videosPending: number;
    publishedToday: number;
    shortsInQueue: number;
    connectedAccounts: number;
    performanceScore: number;
    platformCounts: Record<CrmPlatform, number>;
  };
  topVideos: Array<{
    rank: number;
    views: number;
    viralScore: number;
    post: { id: string; caption: string | null; platform: string; account?: { username: string } };
  }>;
  topAccountWeek: {
    account: CrmAccount;
    views: number;
    avgScore: number;
  } | null;
  chartSeries: Array<{ date: string; views: number; likes: number; retention: number }>;
  recentActivity: Array<{ id: string; message: string; created_at: string }>;
  upcomingPosts: Array<{
    id: string;
    scheduledAt: string;
    platform: string;
    account?: { username: string; display_name: string | null };
  }>;
};

export type CrmMedia = {
  id: string;
  folder_key: string;
  name: string;
  media_type: "image" | "video";
  file_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  language_code: string | null;
  country_code: string | null;
  niche: string | null;
  is_favorite: boolean;
  status: string;
  created_at: string;
};

export type CrmMusic = {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  duration_seconds: number;
  country_code: string | null;
  energy: string | null;
  mood: string | null;
  popularity: number;
  is_favorite: boolean;
};

export type CrmPost = {
  id: string;
  account_id: string;
  platform: CrmPlatform;
  scheduled_at: string;
  status: CrmPostStatus;
  media_id: string | null;
  music_id: string | null;
  caption: string | null;
  hashtags: string[];
  account?: CrmAccount;
  media?: { id: string; name: string; thumbnail_url: string | null };
  music?: { id: string; title: string };
};

export type CrmPovPreset = {
  id: string;
  hook: string | null;
  niche: string | null;
  emotion: string | null;
  language_code: string | null;
  country_code: string | null;
  pov_style: string | null;
  character: string | null;
  ambiance: string | null;
  duration_seconds: number | null;
  platform: CrmPlatform | null;
};
