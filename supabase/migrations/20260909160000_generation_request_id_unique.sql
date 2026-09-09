-- Idempotency key for user-initiated image generations (1 click = 1 job = 1 API call).
alter table public.generations
  add column if not exists generation_request_id text;

create unique index if not exists generations_generation_request_id_unique_idx
  on public.generations (generation_request_id)
  where generation_request_id is not null;
