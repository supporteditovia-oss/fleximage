-- Luxeflexia CRM V3 — tables privées (accès service role via API /admin uniquement)

create type crm_platform as enum ('tiktok', 'instagram', 'youtube');
create type crm_account_status as enum ('active', 'paused', 'disconnected');
create type crm_warmup_phase as enum ('new', 'warming', 'active', 'rest');
create type crm_media_status as enum ('ready', 'pending', 'analysis');
create type crm_post_status as enum ('draft', 'scheduled', 'published', 'failed');

create table if not exists crm_social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform crm_platform not null,
  username text not null,
  display_name text,
  avatar_url text,
  banner_url text,
  country_code char(2) not null default 'FR',
  language_code text not null default 'fr',
  timezone text not null default 'Europe/Paris',
  status crm_account_status not null default 'active',
  warmup_phase crm_warmup_phase not null default 'new',
  warmup_day int not null default 0 check (warmup_day >= 0),
  warmup_trust_score numeric(5, 2) not null default 0 check (warmup_trust_score >= 0 and warmup_trust_score <= 100),
  warmup_interactions_total int not null default 0,
  followers bigint not null default 0,
  likes bigint not null default 0,
  views bigint not null default 0,
  oauth_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, username)
);

create table if not exists crm_warmup_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references crm_social_accounts(id) on delete cascade,
  day_number int not null,
  interactions_count int not null default 0,
  trust_score numeric(5, 2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists crm_warmup_logs_account_idx on crm_warmup_logs(account_id, created_at desc);

create table if not exists crm_media (
  id uuid primary key default gen_random_uuid(),
  folder_key text not null,
  name text not null,
  media_type text not null check (media_type in ('image', 'video')),
  file_url text,
  thumbnail_url text,
  tags text[] not null default '{}',
  language_code text,
  country_code char(2),
  niche text,
  is_favorite boolean not null default false,
  status crm_media_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_media_folder_idx on crm_media(folder_key);
create index if not exists crm_media_tags_gin on crm_media using gin(tags);

create table if not exists crm_music (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  audio_url text not null,
  duration_seconds int not null default 0,
  country_code char(2),
  energy text,
  mood text,
  popularity int not null default 0 check (popularity >= 0 and popularity <= 100),
  is_favorite boolean not null default false,
  source text not null default 'upload',
  created_at timestamptz not null default now()
);

create table if not exists crm_posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references crm_social_accounts(id) on delete cascade,
  platform crm_platform not null,
  scheduled_at timestamptz not null,
  status crm_post_status not null default 'draft',
  media_id uuid references crm_media(id) on delete set null,
  music_id uuid references crm_music(id) on delete set null,
  caption text,
  hashtags text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_posts_scheduled_idx on crm_posts(scheduled_at);
create index if not exists crm_posts_account_idx on crm_posts(account_id);

create table if not exists crm_post_analytics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references crm_posts(id) on delete cascade,
  account_id uuid not null references crm_social_accounts(id) on delete cascade,
  views bigint not null default 0,
  watch_time_seconds bigint not null default 0,
  retention_rate numeric(5, 2) not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  viral_score numeric(5, 2) not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists crm_post_analytics_post_idx on crm_post_analytics(post_id);
create index if not exists crm_post_analytics_views_idx on crm_post_analytics(views desc);

create table if not exists crm_account_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references crm_social_accounts(id) on delete cascade,
  metric_date date not null,
  views bigint not null default 0,
  watch_time_avg_seconds numeric(10, 2) not null default 0,
  retention_avg numeric(5, 2) not null default 0,
  subscribers_gained int not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  performance_score numeric(5, 2) not null default 0,
  unique (account_id, metric_date)
);

create index if not exists crm_account_daily_metrics_date_idx on crm_account_daily_metrics(metric_date desc);

create table if not exists crm_pov_presets (
  id uuid primary key default gen_random_uuid(),
  hook text,
  niche text,
  emotion text,
  language_code text,
  country_code char(2),
  pov_style text,
  character text,
  ambiance text,
  duration_seconds int,
  platform crm_platform,
  is_draft boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_activity_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_activity_log_created_idx on crm_activity_log(created_at desc);

alter table crm_social_accounts enable row level security;
alter table crm_warmup_logs enable row level security;
alter table crm_media enable row level security;
alter table crm_music enable row level security;
alter table crm_posts enable row level security;
alter table crm_post_analytics enable row level security;
alter table crm_account_daily_metrics enable row level security;
alter table crm_pov_presets enable row level security;
alter table crm_activity_log enable row level security;

comment on table crm_social_accounts is 'CRM admin — comptes sociaux multi-plateformes';
