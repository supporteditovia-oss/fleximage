-- Transformation vidéo automobile PoYo (wan2.7-edit-video)
create table if not exists public.car_video_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id text,
  input_video_url text not null,
  input_video_duration_seconds numeric(4, 2) not null
    check (
      input_video_duration_seconds >= 2
      and input_video_duration_seconds <= 8
    ),
  reference_image_url text,
  plan_type text not null check (plan_type in ('exterior', 'interior')),
  selected_vehicle text not null,
  selected_interior_style text
    check (
      selected_interior_style is null
      or selected_interior_style in (
        'black_leather',
        'beige_leather',
        'carbon_sport'
      )
    ),
  prompt text not null,
  model text not null default 'wan2.7-edit-video'
    check (model = 'wan2.7-edit-video'),
  resolution text not null default '720p' check (resolution = '720p'),
  poyo_task_id text,
  status text not null default 'uploaded'
    check (
      status in (
        'uploaded',
        'validating',
        'queued',
        'processing',
        'completed',
        'failed'
      )
    ),
  output_video_url text,
  error_code text,
  error_message text,
  credits_estimated integer not null default 0 check (credits_estimated >= 0),
  credits_charged integer not null default 0 check (credits_charged >= 0),
  idempotency_key text,
  payment_verified boolean not null default false,
  poyo_submit_started boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists car_video_generations_idempotency_idx
  on public.car_video_generations (user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists car_video_generations_user_created_idx
  on public.car_video_generations (user_id, created_at desc);

create index if not exists car_video_generations_poyo_task_idx
  on public.car_video_generations (poyo_task_id)
  where poyo_task_id is not null;

create index if not exists car_video_generations_status_idx
  on public.car_video_generations (status);

create trigger set_car_video_generations_updated_at
before update on public.car_video_generations
for each row execute function app_private.touch_updated_at();

alter table public.car_video_generations enable row level security;

drop policy if exists car_video_generations_select_own on public.car_video_generations;
create policy car_video_generations_select_own
  on public.car_video_generations for select
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.car_video_generations to authenticated;
