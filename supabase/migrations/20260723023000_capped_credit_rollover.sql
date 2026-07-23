-- Capped subscription credit rollover (2x monthly quota) + 3-month lot expiry (FIFO).
-- Cancellation wipe stays via apply_credit_delta(system_adjustment) + lot clear.

-- ---------------------------------------------------------------------------------
-- 1) Lots + grant receipts
-- ---------------------------------------------------------------------------------

create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount_initial integer not null check (amount_initial >= 0),
  amount_remaining integer not null check (amount_remaining >= 0),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null default 'subscription_grant'
    check (source in (
      'subscription_grant',
      'admin_adjustment',
      'refund',
      'system_adjustment',
      'legacy_backfill'
    )),
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  check (amount_remaining <= amount_initial)
);

create index if not exists credit_lots_user_fifo_idx
  on public.credit_lots (user_id, expires_at asc, granted_at asc)
  where amount_remaining > 0;

create table if not exists public.credit_grant_receipts (
  idempotency_key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  monthly_quota integer not null check (monthly_quota >= 0),
  balance_cap integer not null check (balance_cap >= 0),
  requested integer not null check (requested >= 0),
  granted integer not null check (granted >= 0),
  expired integer not null default 0 check (expired >= 0),
  balance_before integer not null check (balance_before >= 0),
  balance_after integer not null check (balance_after >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists credit_grant_receipts_user_created_idx
  on public.credit_grant_receipts (user_id, created_at desc);

alter table public.credit_lots enable row level security;
alter table public.credit_grant_receipts enable row level security;

drop policy if exists credit_lots_select_own_or_admin on public.credit_lots;
create policy credit_lots_select_own_or_admin
  on public.credit_lots for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists credit_grant_receipts_select_own_or_admin on public.credit_grant_receipts;
create policy credit_grant_receipts_select_own_or_admin
  on public.credit_grant_receipts for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant select on public.credit_lots to authenticated;
grant select on public.credit_grant_receipts to authenticated;

-- Allow credit_expiry on ledger
alter table public.credit_ledger
  drop constraint if exists credit_ledger_reason_check;

alter table public.credit_ledger
  add constraint credit_ledger_reason_check
  check (reason in (
    'subscription_grant',
    'generation_charge',
    'admin_adjustment',
    'refund',
    'system_adjustment',
    'credit_expiry'
  ));

-- ---------------------------------------------------------------------------------
-- 2) Expire lots (FIFO write-off)
-- ---------------------------------------------------------------------------------

create or replace function public.expire_user_credit_lots(
  p_user_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expired integer := 0;
  v_lot record;
  v_balance integer;
  v_next integer;
begin
  for v_lot in
    select id, amount_remaining
    from public.credit_lots
    where user_id = p_user_id
      and amount_remaining > 0
      and expires_at <= now()
    order by expires_at asc, granted_at asc
    for update
  loop
    v_expired := v_expired + v_lot.amount_remaining;

    update public.credit_lots
    set amount_remaining = 0
    where id = v_lot.id;
  end loop;

  if v_expired <= 0 then
    return 0;
  end if;

  select credits into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found: %', p_user_id;
  end if;

  v_next := greatest(0, v_balance - v_expired);

  update public.profiles
  set credits = v_next,
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    -(v_balance - v_next),
    v_next,
    'credit_expiry',
    'credit_expiry:' || p_user_id::text || ':' || extract(epoch from now())::bigint::text || ':' || gen_random_uuid()::text,
    jsonb_build_object('expired_amount', v_balance - v_next)
  );

  return v_balance - v_next;
end;
$$;

-- ---------------------------------------------------------------------------------
-- 3) Replace apply_credit_delta (FIFO burn on spend + lot create on positive non-sub grants)
-- ---------------------------------------------------------------------------------

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
  v_to_burn integer;
  v_lot record;
  v_take integer;
  v_expired integer;
begin
  if p_delta = 0 then
    raise exception 'credit delta cannot be zero';
  end if;

  if p_reason not in (
    'subscription_grant',
    'generation_charge',
    'admin_adjustment',
    'refund',
    'system_adjustment',
    'credit_expiry'
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

  -- Expire before balance mutations (except pure expiry writes).
  if p_reason <> 'credit_expiry' then
    v_expired := public.expire_user_credit_lots(p_user_id);
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

  -- FIFO consume lots on spend / wipe.
  if p_delta < 0 and p_reason <> 'credit_expiry' then
    v_to_burn := -p_delta;
    for v_lot in
      select id, amount_remaining
      from public.credit_lots
      where user_id = p_user_id
        and amount_remaining > 0
      order by expires_at asc, granted_at asc
      for update
    loop
      exit when v_to_burn <= 0;
      v_take := least(v_lot.amount_remaining, v_to_burn);
      update public.credit_lots
      set amount_remaining = amount_remaining - v_take
      where id = v_lot.id;
      v_to_burn := v_to_burn - v_take;
    end loop;
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
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('expired_before', coalesce(v_expired, 0))
  )
  returning * into v_ledger;

  -- Positive admin/refund/system grants also create a 3-month lot (except subscription_grant:
  -- those go through grant_subscription_credits).
  if p_delta > 0 and p_reason in ('admin_adjustment', 'refund', 'system_adjustment') then
    insert into public.credit_lots (
      user_id,
      subscription_id,
      amount_initial,
      amount_remaining,
      granted_at,
      expires_at,
      source,
      idempotency_key,
      metadata
    )
    values (
      p_user_id,
      p_subscription_id,
      p_delta,
      p_delta,
      now(),
      now() + interval '3 months',
      p_reason,
      case when p_idempotency_key is null then null else p_idempotency_key || ':lot' end,
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

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

-- ---------------------------------------------------------------------------------
-- 4) Capped subscription grant (2x monthly quota)
-- ---------------------------------------------------------------------------------

create or replace function public.grant_subscription_credits(
  p_user_id uuid,
  p_monthly_quota integer,
  p_subscription_id uuid default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_cap_multiplier integer default 2
)
returns public.credit_grant_receipts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing public.credit_grant_receipts;
  v_expired integer := 0;
  v_balance_before integer;
  v_balance_after integer;
  v_cap integer;
  v_granted integer;
  v_receipt public.credit_grant_receipts;
begin
  if p_monthly_quota < 0 then
    raise exception 'monthly quota must be >= 0';
  end if;

  if p_cap_multiplier < 1 then
    raise exception 'cap multiplier must be >= 1';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.credit_grant_receipts
    where idempotency_key = p_idempotency_key;

    if found then
      return v_existing;
    end if;
  end if;

  v_expired := public.expire_user_credit_lots(p_user_id);

  select credits into v_balance_before
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'profile not found: %', p_user_id;
  end if;

  v_cap := p_monthly_quota * p_cap_multiplier;
  v_granted := least(p_monthly_quota, greatest(0, v_cap - v_balance_before));
  v_balance_after := v_balance_before + v_granted;

  if v_granted > 0 then
    update public.profiles
    set credits = v_balance_after,
        updated_at = now()
    where id = p_user_id;

    insert into public.credit_ledger (
      user_id,
      subscription_id,
      delta,
      balance_after,
      reason,
      idempotency_key,
      metadata
    )
    values (
      p_user_id,
      p_subscription_id,
      v_granted,
      v_balance_after,
      'subscription_grant',
      case
        when p_idempotency_key is null then null
        else p_idempotency_key || ':ledger'
      end,
      coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'monthly_quota', p_monthly_quota,
        'balance_cap', v_cap,
        'requested', p_monthly_quota,
        'granted', v_granted,
        'skipped_over_cap', p_monthly_quota - v_granted,
        'expired_before', v_expired
      )
    );

    insert into public.credit_lots (
      user_id,
      subscription_id,
      amount_initial,
      amount_remaining,
      granted_at,
      expires_at,
      source,
      idempotency_key,
      metadata
    )
    values (
      p_user_id,
      p_subscription_id,
      v_granted,
      v_granted,
      now(),
      now() + interval '3 months',
      'subscription_grant',
      case
        when p_idempotency_key is null then null
        else p_idempotency_key || ':lot'
      end,
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  insert into public.credit_grant_receipts (
    idempotency_key,
    user_id,
    subscription_id,
    monthly_quota,
    balance_cap,
    requested,
    granted,
    expired,
    balance_before,
    balance_after,
    metadata
  )
  values (
    coalesce(p_idempotency_key, 'grant:' || p_user_id::text || ':' || gen_random_uuid()::text),
    p_user_id,
    p_subscription_id,
    p_monthly_quota,
    v_cap,
    p_monthly_quota,
    v_granted,
    v_expired,
    v_balance_before,
    v_balance_after,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_receipt;

  return v_receipt;
exception
  when unique_violation then
    if p_idempotency_key is not null then
      select * into v_existing
      from public.credit_grant_receipts
      where idempotency_key = p_idempotency_key;
      if found then
        return v_existing;
      end if;
    end if;
    raise;
end;
$$;

-- Clear all lots helper (cancellation)
create or replace function public.clear_user_credit_lots(
  p_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.credit_lots
  set amount_remaining = 0
  where user_id = p_user_id
    and amount_remaining > 0;
end;
$$;

revoke all on function public.expire_user_credit_lots(uuid)
  from public, anon, authenticated;
revoke all on function public.grant_subscription_credits(uuid, integer, uuid, text, jsonb, integer)
  from public, anon, authenticated;
revoke all on function public.clear_user_credit_lots(uuid)
  from public, anon, authenticated;
revoke all on function public.apply_credit_delta(uuid, integer, text, uuid, uuid, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.expire_user_credit_lots(uuid) to service_role;
grant execute on function public.grant_subscription_credits(uuid, integer, uuid, text, jsonb, integer) to service_role;
grant execute on function public.clear_user_credit_lots(uuid) to service_role;
grant execute on function public.apply_credit_delta(uuid, integer, text, uuid, uuid, text, jsonb) to service_role;

-- Backfill existing balances into a 3-month lot so FIFO works going forward.
insert into public.credit_lots (
  user_id,
  amount_initial,
  amount_remaining,
  granted_at,
  expires_at,
  source,
  idempotency_key,
  metadata
)
select
  p.id,
  p.credits,
  p.credits,
  now(),
  now() + interval '3 months',
  'legacy_backfill',
  'legacy_backfill:' || p.id::text,
  jsonb_build_object('note', 'initial backfill for capped rollover')
from public.profiles p
where p.credits > 0
  and not exists (
    select 1 from public.credit_lots l where l.user_id = p.id and l.amount_remaining > 0
  );
