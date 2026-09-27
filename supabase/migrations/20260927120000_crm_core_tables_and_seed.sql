-- Luxeflexia CRM — tables core + seed (RLS désactivé — accès service role API /admin)
-- Tables : crm_social_accounts, crm_warmup, crm_media, crm_music, crm_schedule, crm_analytics

create extension if not exists "pgcrypto";

do $$ begin
  create type crm_platform as enum ('tiktok', 'instagram', 'youtube');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm_account_status as enum ('active', 'paused', 'disconnected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm_warmup_phase as enum ('new', 'warming', 'active', 'rest');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type crm_schedule_status as enum ('draft', 'scheduled', 'published', 'failed');
exception when duplicate_object then null;
end $$;

-- 1. Comptes
create table if not exists public.crm_social_accounts (
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
  warmup_day int not null default 0,
  warmup_trust_score numeric(5, 2) not null default 0,
  warmup_interactions_total int not null default 0,
  followers bigint not null default 0,
  likes bigint not null default 0,
  views bigint not null default 0,
  oauth_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, username)
);

-- 2. Warm-up (historique + événements par compte)
create table if not exists public.crm_warmup (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.crm_social_accounts(id) on delete cascade,
  day_number int not null default 0,
  phase crm_warmup_phase not null default 'new',
  interactions_count int not null default 0,
  trust_score numeric(5, 2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists crm_warmup_account_idx on public.crm_warmup(account_id, created_at desc);

-- 3. Médias
create table if not exists public.crm_media (
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
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Musiques
create table if not exists public.crm_music (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  audio_url text not null,
  duration_seconds int not null default 0,
  country_code char(2),
  energy text,
  mood text,
  popularity int not null default 0,
  is_favorite boolean not null default false,
  source text not null default 'upload',
  created_at timestamptz not null default now()
);

-- 5. Agenda / publications
create table if not exists public.crm_schedule (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.crm_social_accounts(id) on delete cascade,
  platform crm_platform not null,
  scheduled_at timestamptz not null,
  status crm_schedule_status not null default 'scheduled',
  media_id uuid references public.crm_media(id) on delete set null,
  music_id uuid references public.crm_music(id) on delete set null,
  caption text,
  hashtags text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_schedule_at_idx on public.crm_schedule(scheduled_at);

-- 6. Analytics (lignes journalières compte + lignes par publication)
create table if not exists public.crm_analytics (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.crm_social_accounts(id) on delete cascade,
  post_id uuid references public.crm_schedule(id) on delete cascade,
  metric_date date,
  views bigint not null default 0,
  watch_time_seconds bigint not null default 0,
  watch_time_avg_seconds numeric(10, 2) not null default 0,
  retention_rate numeric(5, 2) not null default 0,
  retention_avg numeric(5, 2) not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  subscribers_gained int not null default 0,
  viral_score numeric(5, 2) not null default 0,
  performance_score numeric(5, 2) not null default 0,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists crm_analytics_date_idx on public.crm_analytics(metric_date desc);
create index if not exists crm_analytics_post_idx on public.crm_analytics(post_id);

-- RLS off (dev + service role CRM)
alter table public.crm_social_accounts disable row level security;
alter table public.crm_warmup disable row level security;
alter table public.crm_media disable row level security;
alter table public.crm_music disable row level security;
alter table public.crm_schedule disable row level security;
alter table public.crm_analytics disable row level security;

create table if not exists public.crm_pov_presets (
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

alter table public.crm_pov_presets disable row level security;

-- ========== SEED (idempotent) ==========
insert into public.crm_social_accounts (
  id, platform, username, display_name, country_code, language_code, timezone,
  warmup_phase, warmup_day, warmup_trust_score, warmup_interactions_total,
  followers, likes, views
)
values
  ('a1000000-0000-4000-8000-000000000001', 'tiktok', 'luxees', 'Luxe ES', 'ES', 'es', 'Europe/Madrid', 'warming', 5, 62.5, 48, 12400, 89000, 420000),
  ('a1000000-0000-4000-8000-000000000002', 'tiktok', 'luxefr', 'Luxe FR', 'FR', 'fr', 'Europe/Paris', 'active', 12, 88.0, 210, 45200, 210000, 980000),
  ('a1000000-0000-4000-8000-000000000003', 'instagram', 'luxeflexia', 'LuxeFlexIA', 'FR', 'fr', 'Europe/Paris', 'active', 0, 91.0, 0, 8900, 45000, 120000)
on conflict (platform, username) do nothing;

insert into public.crm_warmup (account_id, day_number, phase, interactions_count, trust_score, note)
select a.id, a.warmup_day, a.warmup_phase, 12, a.warmup_trust_score, 'Seed initial'
from public.crm_social_accounts a
where a.username in ('luxees', 'luxefr')
  and not exists (
    select 1 from public.crm_warmup w where w.account_id = a.id limit 1
  );

insert into public.crm_media (id, folder_key, name, media_type, thumbnail_url, tags, language_code, country_code, niche, status)
values
  ('b1000000-0000-4000-8000-000000000001', 'photos/snapchat', 'snap_trend_barre_grise.jpg', 'image', 'https://picsum.photos/seed/snap1/400/700', array['snapchat','trend'], 'es', 'ES', 'luxe', 'ready'),
  ('b1000000-0000-4000-8000-000000000002', 'videos/final', 'pov_dubai_final.mp4', 'video', 'https://picsum.photos/seed/vid1/400/225', array['pov','dubai'], 'fr', 'FR', 'luxe', 'ready'),
  ('b1000000-0000-4000-8000-000000000003', 'videos/recording', 'tuto_instagram_raw.mp4', 'video', 'https://picsum.photos/seed/vid2/400/225', array['tuto','instagram'], 'fr', 'FR', 'motivation', 'ready')
on conflict (id) do nothing;

insert into public.crm_music (id, title, artist, audio_url, duration_seconds, country_code, energy, mood, popularity, is_favorite)
values
  ('c1000000-0000-4000-8000-000000000001', 'Midnight Drive', 'Luxe Beats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 348, 'ES', 'Haute', 'Luxe', 78, true),
  ('c1000000-0000-4000-8000-000000000002', 'Paris Glow', 'Flex IA', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 272, 'FR', 'Moyenne', 'Motivation', 65, false)
on conflict (id) do nothing;

insert into public.crm_schedule (id, account_id, platform, scheduled_at, status, media_id, music_id, caption, hashtags)
values
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'tiktok', (current_date + time '18:30') at time zone 'Europe/Madrid', 'scheduled', 'b1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'POV luxe Madrid', array['luxe','pov','es']),
  ('d1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'tiktok', (current_date + interval '1 day' + time '20:00') at time zone 'Europe/Paris', 'scheduled', 'b1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 'Routine motivation', array['motivation','fr'])
on conflict (id) do nothing;

insert into public.crm_analytics (
  account_id, post_id, metric_date, views, watch_time_avg_seconds, retention_avg,
  likes, comments, shares, subscribers_gained, performance_score, viral_score
)
select
  'a1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000001',
  null,
  125000, 0, 0, 8200, 340, 120, 0, 0, 76.5
where not exists (
  select 1 from public.crm_analytics where post_id = 'd1000000-0000-4000-8000-000000000001'
);

insert into public.crm_analytics (
  account_id, metric_date, views, watch_time_avg_seconds, retention_avg,
  likes, comments, shares, subscribers_gained, performance_score
)
select
  acc.id,
  d::date,
  (80000 + (random() * 40000))::bigint,
  12 + (random() * 8),
  45 + (random() * 15),
  (5000 + random() * 3000)::bigint,
  (200 + random() * 100)::bigint,
  (50 + random() * 40)::bigint,
  (10 + random() * 20)::int,
  70 + (random() * 20)
from public.crm_social_accounts acc
cross join generate_series(current_date - 14, current_date, '1 day') as d
where acc.username = 'luxefr'
  and not exists (
    select 1 from public.crm_analytics a
    where a.account_id = acc.id and a.metric_date = d::date and a.post_id is null
  );
