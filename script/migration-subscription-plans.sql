alter table subscriptions
  add column if not exists plan_type text not null default 'discovery',
  add column if not exists credits_per_cycle integer not null default 2500,
  add column if not exists billing_interval text not null default 'month';

alter table subscriptions
  alter column plan_type set default 'discovery';

alter table subscriptions
  drop constraint if exists subscriptions_plan_type_check,
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

alter table subscriptions
  drop constraint if exists subscriptions_billing_interval_check,
  add constraint subscriptions_billing_interval_check check (billing_interval in ('week', 'month'));
