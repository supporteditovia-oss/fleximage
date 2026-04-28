alter table subscriptions
  add column if not exists plan_type text not null default 'image',
  add column if not exists credits_per_cycle integer not null default 100,
  add column if not exists billing_interval text not null default 'week';

alter table subscriptions
  drop constraint if exists subscriptions_plan_type_check,
  add constraint subscriptions_plan_type_check check (plan_type in ('image', 'video'));

alter table subscriptions
  drop constraint if exists subscriptions_billing_interval_check,
  add constraint subscriptions_billing_interval_check check (billing_interval in ('week', 'month'));
