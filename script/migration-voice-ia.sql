-- Voix IA (Fish Audio) : clones utilisateur + historique des générations.
-- À exécuter dans Supabase → SQL Editor.

create table if not exists public.voice_clones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  fish_reference_id text not null,
  source_type text not null default 'import',
  source_label text,
  duration_sec numeric,
  created_at timestamptz not null default now()
);

create index if not exists voice_clones_user_idx
  on public.voice_clones (user_id, created_at desc);

create table if not exists public.voice_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  voice_clone_id uuid references public.voice_clones(id) on delete set null,
  voice_name text,
  fish_reference_id text,
  text text not null,
  audio_url text not null,
  credits_spent integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists voice_generations_user_idx
  on public.voice_generations (user_id, created_at desc);

alter table public.voice_clones enable row level security;
alter table public.voice_generations enable row level security;

-- Chaque utilisateur ne voit que ses propres voix et rendus.
drop policy if exists "voice_clones_owner" on public.voice_clones;
create policy "voice_clones_owner" on public.voice_clones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "voice_generations_owner" on public.voice_generations;
create policy "voice_generations_owner" on public.voice_generations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
