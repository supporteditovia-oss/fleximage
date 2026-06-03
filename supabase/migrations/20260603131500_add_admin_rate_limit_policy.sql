begin;

drop policy if exists generation_rate_limits_admin_select
  on public.generation_rate_limits;

create policy generation_rate_limits_admin_select
  on public.generation_rate_limits
  for select
  to authenticated
  using (app_private.is_admin());

grant select on table public.generation_rate_limits to authenticated;

commit;
