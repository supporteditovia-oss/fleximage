-- Preview lock tracking (emails relance après expiration)
create table if not exists public.funnel_preview_locks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  funnel_session_id text,
  expires_at timestamptz not null,
  reminder_sent_at timestamptz,
  recovered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists funnel_preview_locks_expiry_idx
  on public.funnel_preview_locks (expires_at)
  where reminder_sent_at is null and recovered_at is null;

create unique index if not exists funnel_preview_locks_active_user_idx
  on public.funnel_preview_locks (user_id)
  where recovered_at is null;

alter table public.funnel_preview_locks enable row level security;

-- Quiz onboarding par compte (sync multi-appareils)
alter table public.profiles
  add column if not exists onboarding_quiz jsonb;
