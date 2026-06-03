begin;

-- Store generation duration as a numeric value that can be sorted, averaged,
-- and aggregated without runtime casts in analytics queries.
alter table public.generations
  alter column cost_time type integer
  using case
    when cost_time is null or btrim(cost_time) = '' then null
    when cost_time ~ '^[0-9]+(\.[0-9]+)?$' then round(cost_time::numeric)::integer
    else null
  end;

alter table public.generations
  drop constraint if exists generations_cost_time_nonnegative;

alter table public.generations
  add constraint generations_cost_time_nonnegative
  check (cost_time is null or cost_time >= 0);

comment on column public.generations.cost_time is
  'Generation duration in seconds, rounded to the nearest integer.';

-- Cover the templates.created_by foreign key flagged by Supabase advisors.
create index if not exists templates_created_by_idx
  on public.templates(created_by);

-- Face capture rows are written only by the backend service role. Keep client
-- exposure to the read path enforced by the existing RLS SELECT policies.
revoke all on table public.face_capture_sessions from anon;
revoke all on table public.face_capture_assets from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.face_capture_sessions
  from authenticated;

revoke insert, update, delete, truncate, references, trigger
  on table public.face_capture_assets
  from authenticated;

grant select on table public.face_capture_sessions to authenticated;
grant select on table public.face_capture_assets to authenticated;
grant all on table public.face_capture_sessions to service_role;
grant all on table public.face_capture_assets to service_role;

comment on table public.generation_rate_limits is
  'Backend-only rate limit counters. Intentionally has no anon/authenticated RLS policies; access is through service_role only.';

commit;
