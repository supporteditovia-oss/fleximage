-- LarpKing database baseline
-- Intended for an empty Supabase project, or a deliberate reset.
-- This removes the old prank-named schema and creates the LarpKing schema.

begin;

-- =========================================================================================
-- 0. EXTENSIONS AND RESET
-- =========================================================================================

create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;

drop schema if exists app_private cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.apply_credit_delta(uuid, integer, text, uuid, uuid, text, jsonb) cascade;
drop function if exists public.deduct_credits(uuid, integer) cascade;
drop function if exists public.increment_generation_count(uuid) cascade;

drop table if exists public.credit_ledger cascade;
drop table if exists public.generation_rate_limits cascade;
drop table if exists public.generation_events cascade;
drop table if exists public.favorite_templates cascade;
drop table if exists public.generations cascade;
drop table if exists public.generated_pranks cascade;
drop table if exists public.generation_ips cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.templates cascade;
drop table if exists public.prompt_templates cascade;
drop table if exists public.template_categories cascade;
drop table if exists public.categories cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.profiles cascade;

create schema app_private;
revoke all on schema app_private from public;

-- Authenticated users need this only so RLS policies can evaluate app_private.is_admin().
-- The schema remains unexposed to the Supabase Data API.
grant usage on schema app_private to authenticated;
grant usage on schema app_private to service_role;

-- =========================================================================================
-- 1. PRIVATE HELPERS
-- =========================================================================================

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.touch_updated_at() from public;

-- =========================================================================================
-- 2. CORE IDENTITY
-- =========================================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  preferred_locale text not null default 'fr'
    check (preferred_locale in ('fr', 'en', 'es', 'de')),
  role text not null default 'user'
    check (role in ('user', 'admin')),
  is_subscriber boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  has_accepted_terms boolean not null default false,
  credits integer not null default 0 check (credits >= 0),
  generation_count integer not null default 0 check (generation_count >= 0),
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function app_private.touch_updated_at();

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

revoke all on function app_private.is_admin() from public;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_admin() to service_role;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  extracted_name text;
  extracted_avatar text;
  extracted_locale text;
  normalized_locale text;
  accepted_terms boolean;
begin
  extracted_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  extracted_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  extracted_locale := coalesce(
    new.raw_user_meta_data->>'preferred_locale',
    new.raw_user_meta_data->>'locale',
    new.raw_user_meta_data->>'language'
  );

  normalized_locale := split_part(
    split_part(lower(coalesce(extracted_locale, 'fr')), ';', 1),
    '-',
    1
  );

  if normalized_locale not in ('fr', 'en', 'es', 'de') then
    normalized_locale := 'fr';
  end if;

  accepted_terms := lower(coalesce(new.raw_user_meta_data->>'has_accepted_terms', 'false'))
    in ('true', '1', 'yes');

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    has_accepted_terms,
    preferred_locale
  )
  values (
    new.id,
    new.email,
    extracted_name,
    extracted_avatar,
    'user',
    accepted_terms,
    normalized_locale
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    preferred_locale = excluded.preferred_locale,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

revoke all on function app_private.handle_new_user() from public;

-- =========================================================================================
-- 3. TEMPLATES
-- =========================================================================================

create table public.template_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_template_categories_updated_at
before update on public.template_categories
for each row execute function app_private.touch_updated_at();

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.template_categories(id) on delete set null,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text,
  prompt_text text not null,
  generation_type text not null default 'image'
    check (generation_type in ('image', 'video', 'both')),
  input_schema jsonb not null default '{}'::jsonb
    check (jsonb_typeof(input_schema) = 'object'),
  example_before_url text,
  example_after_url text,
  cover_url text,
  keywords text[] not null default '{}'::text[],
  icon text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index templates_category_id_idx on public.templates(category_id);
create index templates_active_display_idx on public.templates(is_active, display_order, created_at desc);
create index templates_featured_idx on public.templates(is_featured) where is_featured = true;
create index templates_keywords_idx on public.templates using gin(keywords);
create index templates_input_schema_idx on public.templates using gin(input_schema);

create trigger set_templates_updated_at
before update on public.templates
for each row execute function app_private.touch_updated_at();

create table public.favorite_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, template_id)
);

create index favorite_templates_user_idx on public.favorite_templates(user_id);
create index favorite_templates_template_idx on public.favorite_templates(template_id);

-- =========================================================================================
-- 4. GENERATIONS
-- =========================================================================================

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  generation_type text not null
    check (generation_type in ('image', 'video')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'succeeded', 'failed')),
  prompt text not null,
  final_prompt text not null,
  provider text
    check (provider is null or provider in ('kie', 'runway', 'fallback')),
  provider_task_id text,
  provider_attempts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(provider_attempts) = 'array'),
  aspect_ratio text,
  input_assets jsonb not null default '[]'::jsonb
    check (jsonb_typeof(input_assets) = 'array'),
  output_assets jsonb not null default '[]'::jsonb
    check (jsonb_typeof(output_assets) = 'array'),
  watermarked_assets jsonb not null default '[]'::jsonb
    check (jsonb_typeof(watermarked_assets) = 'array'),
  fail_message text,
  cost_time text,
  credit_cost integer not null default 0 check (credit_cost >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index generations_user_created_idx on public.generations(user_id, created_at desc);
create index generations_template_idx on public.generations(template_id);
create index generations_status_idx on public.generations(status);
create index generations_provider_task_idx on public.generations(provider_task_id);
create index generations_metadata_idx on public.generations using gin(metadata);

create trigger set_generations_updated_at
before update on public.generations
for each row execute function app_private.touch_updated_at();

create table public.generation_events (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid references public.generations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  provider text
    check (provider is null or provider in ('kie', 'runway', 'fallback')),
  provider_task_id text,
  status_from text,
  status_to text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index generation_events_generation_idx on public.generation_events(generation_id, created_at desc);
create index generation_events_user_idx on public.generation_events(user_id, created_at desc);
create index generation_events_type_idx on public.generation_events(event_type);

create table public.generation_rate_limits (
  subject_type text not null check (subject_type in ('ip', 'user')),
  subject_hash text not null,
  window_start timestamptz not null,
  window_seconds integer not null check (window_seconds > 0),
  request_count integer not null default 0 check (request_count >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (subject_type, subject_hash, window_start, window_seconds)
);

create index generation_rate_limits_last_seen_idx on public.generation_rate_limits(last_seen_at);

-- =========================================================================================
-- 5. BILLING AND CREDITS
-- =========================================================================================

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  status text not null default 'active',
  price_id text not null,
  plan_type text not null default 'weekly'
    check (plan_type in ('weekly', 'monthly', 'image', 'video')),
  credits_per_cycle integer not null default 100 check (credits_per_cycle >= 0),
  billing_interval text not null default 'week'
    check (billing_interval in ('week', 'month')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions(user_id);
create index subscriptions_customer_idx on public.subscriptions(stripe_customer_id);
create index subscriptions_status_idx on public.subscriptions(status);

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function app_private.touch_updated_at();

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  generation_id uuid references public.generations(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null
    check (reason in (
      'subscription_grant',
      'generation_charge',
      'admin_adjustment',
      'refund',
      'system_adjustment'
    )),
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index credit_ledger_user_created_idx on public.credit_ledger(user_id, created_at desc);
create index credit_ledger_generation_idx on public.credit_ledger(generation_id);
create index credit_ledger_subscription_idx on public.credit_ledger(subscription_id);

-- =========================================================================================
-- 6. SETTINGS
-- =========================================================================================

create table public.app_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function app_private.touch_updated_at();

-- =========================================================================================
-- 7. CREDIT RPCS
-- Public schema is used so the backend can call Supabase RPC.
-- These functions are not SECURITY DEFINER and execute is granted only to service_role.
-- =========================================================================================

create or replace function public.apply_credit_delta(
  p_user_id uuid,
  p_delta integer,
  p_reason text,
  p_generation_id uuid default null,
  p_subscription_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.credit_ledger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_balance integer;
  v_next_balance integer;
  v_existing public.credit_ledger;
  v_ledger public.credit_ledger;
begin
  if p_delta = 0 then
    raise exception 'credit delta cannot be zero';
  end if;

  if p_reason not in (
    'subscription_grant',
    'generation_charge',
    'admin_adjustment',
    'refund',
    'system_adjustment'
  ) then
    raise exception 'invalid credit ledger reason: %', p_reason;
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  if p_idempotency_key is not null then
    select *
    into v_existing
    from public.credit_ledger
    where idempotency_key = p_idempotency_key;

    if found then
      return v_existing;
    end if;
  end if;

  select credits
  into v_current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found: %', p_user_id;
  end if;

  v_next_balance := v_current_balance + p_delta;

  if v_next_balance < 0 then
    raise exception 'insufficient credits for profile %', p_user_id;
  end if;

  update public.profiles
  set credits = v_next_balance,
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_ledger (
    user_id,
    generation_id,
    subscription_id,
    delta,
    balance_after,
    reason,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    p_generation_id,
    p_subscription_id,
    p_delta,
    v_next_balance,
    p_reason,
    p_idempotency_key,
    p_metadata
  )
  returning * into v_ledger;

  return v_ledger;
exception
  when unique_violation then
    if p_idempotency_key is not null then
      select *
      into v_existing
      from public.credit_ledger
      where idempotency_key = p_idempotency_key;

      if found then
        return v_existing;
      end if;
    end if;

    raise;
end;
$$;

create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer
)
returns public.credit_ledger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_amount <= 0 then
    raise exception 'deduction amount must be positive';
  end if;

  return public.apply_credit_delta(
    p_user_id,
    -p_amount,
    'generation_charge',
    null,
    null,
    null,
    jsonb_build_object('source', 'deduct_credits')
  );
end;
$$;

create or replace function public.increment_generation_count(
  p_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.profiles
  set generation_count = generation_count + 1,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.apply_credit_delta(uuid, integer, text, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.deduct_credits(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.increment_generation_count(uuid)
  from public, anon, authenticated;

grant execute on function public.apply_credit_delta(uuid, integer, text, uuid, uuid, text, jsonb)
  to service_role;
grant execute on function public.deduct_credits(uuid, integer)
  to service_role;
grant execute on function public.increment_generation_count(uuid)
  to service_role;

-- =========================================================================================
-- 8. ROW LEVEL SECURITY
-- =========================================================================================

alter table public.profiles enable row level security;
alter table public.template_categories enable row level security;
alter table public.templates enable row level security;
alter table public.favorite_templates enable row level security;
alter table public.generations enable row level security;
alter table public.generation_events enable row level security;
alter table public.generation_rate_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.app_settings enable row level security;

-- Profiles
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_admin_select_all
  on public.profiles for select
  to authenticated
  using (app_private.is_admin());

create policy profiles_update_own_safe_columns
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_update_all
  on public.profiles for update
  to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

-- Template categories
create policy template_categories_public_read_active
  on public.template_categories for select
  to anon, authenticated
  using (is_active = true);

create policy template_categories_admin_select_all
  on public.template_categories for select
  to authenticated
  using (app_private.is_admin());

create policy template_categories_admin_insert
  on public.template_categories for insert
  to authenticated
  with check (app_private.is_admin());

create policy template_categories_admin_update
  on public.template_categories for update
  to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

create policy template_categories_admin_delete
  on public.template_categories for delete
  to authenticated
  using (app_private.is_admin());

-- Templates
create policy templates_public_read_active
  on public.templates for select
  to anon, authenticated
  using (is_active = true);

create policy templates_admin_select_all
  on public.templates for select
  to authenticated
  using (app_private.is_admin());

create policy templates_admin_insert
  on public.templates for insert
  to authenticated
  with check (app_private.is_admin());

create policy templates_admin_update
  on public.templates for update
  to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

create policy templates_admin_delete
  on public.templates for delete
  to authenticated
  using (app_private.is_admin());

-- Favorite templates
create policy favorite_templates_select_own
  on public.favorite_templates for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy favorite_templates_insert_own
  on public.favorite_templates for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy favorite_templates_delete_own
  on public.favorite_templates for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy favorite_templates_admin_select_all
  on public.favorite_templates for select
  to authenticated
  using (app_private.is_admin());

-- Generations
create policy generations_select_own
  on public.generations for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy generations_admin_select_all
  on public.generations for select
  to authenticated
  using (app_private.is_admin());

-- Generation events
create policy generation_events_select_own
  on public.generation_events for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.generations
      where generations.id = generation_events.generation_id
        and generations.user_id = (select auth.uid())
    )
  );

create policy generation_events_admin_select_all
  on public.generation_events for select
  to authenticated
  using (app_private.is_admin());

-- Subscriptions
create policy subscriptions_select_own
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy subscriptions_admin_select_all
  on public.subscriptions for select
  to authenticated
  using (app_private.is_admin());

-- Credit ledger
create policy credit_ledger_select_own
  on public.credit_ledger for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy credit_ledger_admin_select_all
  on public.credit_ledger for select
  to authenticated
  using (app_private.is_admin());

-- App settings
create policy app_settings_admin_select
  on public.app_settings for select
  to authenticated
  using (app_private.is_admin());

create policy app_settings_admin_insert
  on public.app_settings for insert
  to authenticated
  with check (app_private.is_admin());

create policy app_settings_admin_update
  on public.app_settings for update
  to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

create policy app_settings_admin_delete
  on public.app_settings for delete
  to authenticated
  using (app_private.is_admin());

-- generation_rate_limits intentionally has no anon/auth policies.
-- It is service_role-only even though RLS is enabled.

-- =========================================================================================
-- 9. GRANTS
-- =========================================================================================

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.template_categories to anon, authenticated;
grant select on public.templates to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (
  full_name,
  avatar_url,
  preferred_locale,
  has_accepted_terms,
  last_active_at,
  updated_at
) on public.profiles to authenticated;

grant insert, update, delete on public.template_categories to authenticated;
grant insert, update, delete on public.templates to authenticated;

grant select, insert, delete on public.favorite_templates to authenticated;
grant select on public.generations to authenticated;
grant select on public.generation_events to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.credit_ledger to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;

grant all on all tables in schema public to service_role;
grant usage on schema public to anon, authenticated, service_role;

-- =========================================================================================
-- 10. SEED DATA
-- =========================================================================================

insert into public.template_categories (slug, name, description, display_order, is_active)
values
  ('luxury-lifestyle', 'Luxury lifestyle', 'Luxury shopping, restaurants, travel, and premium lifestyle scenes.', 10, true),
  ('supercars', 'Supercars', 'Luxury cars, dashboards, garages, and driving scenes.', 20, true),
  ('travel-tourism', 'Travel and tourism', 'Hotels, airports, resorts, villas, and destination flexes.', 30, true),
  ('business-hustle', 'Business and hustle', 'Revenue dashboards, traction screenshots, deals, offices, and status symbols.', 40, true),
  ('social-proof', 'Social proof', 'Dating, parties, nightlife, group photos, and social scenes.', 50, true),
  ('custom-larp', 'Custom LARP', 'Freeform image generations and user-defined scenarios.', 60, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.app_settings (key, value, description)
values
  ('force_kie_ai', 'false', 'Force the image pipeline to use Kie.ai when enabled.'),
  ('fallback_timeout_ms', '105000', 'Timeout before attempting the fallback image provider.'),
  ('default_image_credit_cost', '5', 'Default credit cost for one image generation.'),
  ('default_video_credit_cost', '30', 'Default credit cost for one video generation.')
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

commit;
