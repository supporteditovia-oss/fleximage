-- Allow the LarpKing monthly subscription tiers while keeping old rows valid.

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_type_check;

alter table public.subscriptions
  alter column plan_type set default 'discovery';

alter table public.subscriptions
  alter column credits_per_cycle set default 250;

alter table public.subscriptions
  alter column billing_interval set default 'month';

alter table public.subscriptions
  add constraint subscriptions_plan_type_check
  check (
    plan_type in (
      'discovery',
      'essential',
      'ultimate',
      'weekly',
      'monthly',
      'image',
      'video'
    )
  );

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_interval_check;

alter table public.subscriptions
  add constraint subscriptions_billing_interval_check
  check (billing_interval in ('week', 'month'));
