begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'face-captures',
  'face-captures',
  false,
  10485760,
  array['image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

create table public.face_capture_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'completed'
    check (status in ('completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index face_capture_sessions_user_created_idx
  on public.face_capture_sessions(user_id, created_at desc);

create trigger set_face_capture_sessions_updated_at
before update on public.face_capture_sessions
for each row execute function app_private.touch_updated_at();

create table public.face_capture_assets (
  session_id uuid not null references public.face_capture_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pose_id text not null
    check (pose_id in ('frontal', 'profile-right', 'profile-left')),
  storage_bucket text not null default 'face-captures',
  storage_path text not null,
  content_type text not null default 'image/jpeg',
  byte_size integer not null check (byte_size > 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  primary key (session_id, pose_id)
);

create index face_capture_assets_user_created_idx
  on public.face_capture_assets(user_id, created_at desc);

create unique index face_capture_assets_storage_path_uidx
  on public.face_capture_assets(storage_bucket, storage_path);

alter table public.face_capture_sessions enable row level security;
alter table public.face_capture_assets enable row level security;

create policy face_capture_sessions_select_own_or_admin
  on public.face_capture_sessions for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.is_admin());

create policy face_capture_assets_select_own_or_admin
  on public.face_capture_assets for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.is_admin());

grant select on public.face_capture_sessions to authenticated;
grant select on public.face_capture_assets to authenticated;

grant all on public.face_capture_sessions to service_role;
grant all on public.face_capture_assets to service_role;

commit;
