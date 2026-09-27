-- CRM OAuth : identifiants plateforme + tokens chiffrés (service role uniquement)

alter table public.crm_social_accounts
  add column if not exists provider_account_id text;

create unique index if not exists crm_social_accounts_platform_provider_idx
  on public.crm_social_accounts (platform, provider_account_id)
  where provider_account_id is not null;

comment on column public.crm_social_accounts.provider_account_id is
  'ID officiel plateforme (open_id TikTok, channel id YouTube, ig user id…)';

create table if not exists public.crm_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.crm_social_accounts(id) on delete cascade,
  platform crm_platform not null,
  provider_account_id text not null,
  access_token_enc text not null,
  refresh_token_enc text,
  token_type text not null default 'Bearer',
  scope text,
  expires_at timestamptz,
  raw_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, provider_account_id)
);

create index if not exists crm_oauth_tokens_account_idx on public.crm_oauth_tokens(account_id);

alter table public.crm_oauth_tokens disable row level security;

-- Comptes manuels legacy : provider = username@country si absent
update public.crm_social_accounts
set provider_account_id = platform || ':' || username || ':' || country_code
where provider_account_id is null and username is not null;
