-- Voice studio: cloned voices + audio generations (Fish Audio backend)

create table if not exists public.voice_clones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  fish_reference_id text not null,
  fish_state text not null default 'trained',
  source_type text not null default 'import'
    check (source_type in ('record', 'import', 'catalog')),
  source_label text,
  duration_sec numeric(8, 2) check (duration_sec is null or duration_sec >= 0),
  sample_r2_key text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_clones_user_created_idx
  on public.voice_clones(user_id, created_at desc);

create trigger set_voice_clones_updated_at
before update on public.voice_clones
for each row execute function app_private.touch_updated_at();

create table if not exists public.voice_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  voice_clone_id uuid references public.voice_clones(id) on delete set null,
  text text not null check (char_length(trim(text)) > 0),
  status text not null default 'processing'
    check (status in ('processing', 'succeeded', 'failed')),
  provider text not null default 'fish_audio'
    check (provider in ('fish_audio')),
  fish_reference_id text,
  audio_url text,
  audio_r2_key text,
  credit_cost integer not null default 0 check (credit_cost >= 0),
  fail_message text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists voice_generations_user_created_idx
  on public.voice_generations(user_id, created_at desc);
create index if not exists voice_generations_status_idx
  on public.voice_generations(status);

create trigger set_voice_generations_updated_at
before update on public.voice_generations
for each row execute function app_private.touch_updated_at();

alter table public.voice_clones enable row level security;
alter table public.voice_generations enable row level security;

drop policy if exists voice_clones_select_own on public.voice_clones;
create policy voice_clones_select_own
  on public.voice_clones for select
  using (auth.uid() = user_id);

drop policy if exists voice_clones_insert_own on public.voice_clones;
create policy voice_clones_insert_own
  on public.voice_clones for insert
  with check (auth.uid() = user_id);

drop policy if exists voice_clones_delete_own on public.voice_clones;
create policy voice_clones_delete_own
  on public.voice_clones for delete
  using (auth.uid() = user_id);

drop policy if exists voice_generations_select_own on public.voice_generations;
create policy voice_generations_select_own
  on public.voice_generations for select
  using (auth.uid() = user_id);

grant select, insert, delete on table public.voice_clones to authenticated;
grant select on table public.voice_generations to authenticated;
