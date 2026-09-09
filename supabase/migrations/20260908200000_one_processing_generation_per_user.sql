-- One in-flight image/video generation per user — blocks duplicate OneShot jobs from race/double-click.
create unique index if not exists generations_one_processing_per_user_idx
  on public.generations (user_id)
  where status = 'processing';
