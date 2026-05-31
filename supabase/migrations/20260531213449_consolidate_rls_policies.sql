begin;

-- Consolidate overlapping authenticated SELECT/UPDATE policies. This keeps the
-- same access model while avoiding multiple permissive policy evaluation.

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_admin_select_all on public.profiles;
create policy profiles_select_self_or_admin
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or app_private.is_admin());

drop policy if exists profiles_update_own_safe_columns on public.profiles;
drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_update_self_or_admin
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or app_private.is_admin())
  with check (id = (select auth.uid()) or app_private.is_admin());

drop policy if exists template_categories_public_read_active on public.template_categories;
drop policy if exists template_categories_admin_select_all on public.template_categories;
create policy template_categories_anon_read_active
  on public.template_categories for select
  to anon
  using (is_active = true);
create policy template_categories_authenticated_read_active_or_admin
  on public.template_categories for select
  to authenticated
  using (is_active = true or app_private.is_admin());

drop policy if exists templates_public_read_active on public.templates;
drop policy if exists templates_admin_select_all on public.templates;
create policy templates_anon_read_active
  on public.templates for select
  to anon
  using (is_active = true);
create policy templates_authenticated_read_active_or_admin
  on public.templates for select
  to authenticated
  using (is_active = true or app_private.is_admin());

drop policy if exists favorite_templates_select_own on public.favorite_templates;
drop policy if exists favorite_templates_admin_select_all on public.favorite_templates;
create policy favorite_templates_select_own_or_admin
  on public.favorite_templates for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists generations_select_own on public.generations;
drop policy if exists generations_admin_select_all on public.generations;
create policy generations_select_own_or_admin
  on public.generations for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists generation_events_select_own on public.generation_events;
drop policy if exists generation_events_admin_select_all on public.generation_events;
create policy generation_events_select_own_or_admin
  on public.generation_events for select
  to authenticated
  using (
    app_private.is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1
      from public.generations
      where generations.id = generation_events.generation_id
        and generations.user_id = (select auth.uid())
    )
  );

drop policy if exists subscriptions_select_own on public.subscriptions;
drop policy if exists subscriptions_admin_select_all on public.subscriptions;
create policy subscriptions_select_own_or_admin
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists credit_ledger_select_own on public.credit_ledger;
drop policy if exists credit_ledger_admin_select_all on public.credit_ledger;
create policy credit_ledger_select_own_or_admin
  on public.credit_ledger for select
  to authenticated
  using (user_id = (select auth.uid()) or app_private.is_admin());

commit;
