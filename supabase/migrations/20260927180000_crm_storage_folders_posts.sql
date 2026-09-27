-- CRM : buckets Storage, dossiers, crm_posts (miroir schedule), contrainte multi-comptes, retrait demo

-- Buckets publics (lecture CDN Supabase)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'crm-media',
    'crm-media',
    true,
    524288000,
    array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']
  ),
  (
    'crm-music',
    'crm-music',
    true,
    104857600,
    array['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a','audio/m4a']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Dossiers bibliothèque (création utilisateur + défauts)
create table if not exists public.crm_media_folders (
  id uuid primary key default gen_random_uuid(),
  folder_key text not null unique,
  parent_group text not null check (parent_group in ('photos', 'videos')),
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.crm_media_folders disable row level security;

insert into public.crm_media_folders (folder_key, parent_group, label, sort_order)
values
  ('photos/normal', 'photos', 'Photos normales', 1),
  ('photos/snapchat', 'photos', 'Photos Snapchat', 2),
  ('videos/instagram', 'videos', 'Vidéos Instagram', 1),
  ('videos/recording', 'videos', 'Vidéos Enregistrement', 2),
  ('videos/final', 'videos', 'Vidéos Finales', 3)
on conflict (folder_key) do nothing;

-- Multi-comptes : même @ possible si pays différent
alter table public.crm_social_accounts drop constraint if exists crm_social_accounts_platform_username_key;
create unique index if not exists crm_social_accounts_platform_username_country_idx
  on public.crm_social_accounts (platform, username, country_code);

alter table public.crm_media add column if not exists storage_path text;
alter table public.crm_music add column if not exists storage_path text;
alter table public.crm_music alter column audio_url drop not null;

-- Publications : vue + table crm_posts (analytics / compat)
create table if not exists public.crm_posts (
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

create index if not exists crm_posts_scheduled_idx on public.crm_posts(scheduled_at);
alter table public.crm_posts disable row level security;

-- Sync schedule → posts (une seule source d’écriture côté API = crm_schedule, miroir posts)
create or replace function public.crm_sync_schedule_to_posts()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_posts (
      id, account_id, platform, scheduled_at, status, media_id, music_id,
      caption, hashtags, published_at, created_at, updated_at
    ) values (
      new.id, new.account_id, new.platform, new.scheduled_at, new.status,
      new.media_id, new.music_id, new.caption, new.hashtags, new.published_at,
      new.created_at, new.updated_at
    ) on conflict (id) do update set
      account_id = excluded.account_id,
      platform = excluded.platform,
      scheduled_at = excluded.scheduled_at,
      status = excluded.status,
      media_id = excluded.media_id,
      music_id = excluded.music_id,
      caption = excluded.caption,
      hashtags = excluded.hashtags,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at;
  elsif tg_op = 'UPDATE' then
    update public.crm_posts set
      account_id = new.account_id,
      platform = new.platform,
      scheduled_at = new.scheduled_at,
      status = new.status,
      media_id = new.media_id,
      music_id = new.music_id,
      caption = new.caption,
      hashtags = new.hashtags,
      published_at = new.published_at,
      updated_at = new.updated_at
    where id = new.id;
  elsif tg_op = 'DELETE' then
    delete from public.crm_posts where id = old.id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists crm_schedule_sync_posts on public.crm_schedule;
create trigger crm_schedule_sync_posts
  after insert or update or delete on public.crm_schedule
  for each row execute function public.crm_sync_schedule_to_posts();

-- Backfill posts depuis schedule existant
insert into public.crm_posts (
  id, account_id, platform, scheduled_at, status, media_id, music_id,
  caption, hashtags, published_at, created_at, updated_at
)
select
  id, account_id, platform, scheduled_at, status, media_id, music_id,
  caption, hashtags, published_at, created_at, updated_at
from public.crm_schedule s
where not exists (select 1 from public.crm_posts p where p.id = s.id);

-- Retirer les données de démonstration (aucun mock en prod)
delete from public.crm_analytics where account_id in (
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000003'
);
delete from public.crm_schedule where id in (
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000002'
);
delete from public.crm_posts where id in (
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000002'
);
delete from public.crm_media where id in (
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  'b1000000-0000-4000-8000-000000000003'::uuid
);
delete from public.crm_music where id in (
  'c1000000-0000-4000-8000-000000000001'::uuid,
  'c1000000-0000-4000-8000-000000000002'::uuid
);
delete from public.crm_warmup where account_id in (
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002'
);
delete from public.crm_social_accounts where id in (
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000003'
);
