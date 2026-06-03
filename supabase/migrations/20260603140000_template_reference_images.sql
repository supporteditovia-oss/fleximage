-- Per-reference-image prompts (image + optional video) for templates

create table public.template_reference_images (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  url text not null,
  image_prompt text not null,
  video_prompt text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index template_reference_images_template_idx
  on public.template_reference_images(template_id, display_order);

create trigger set_template_reference_images_updated_at
before update on public.template_reference_images
for each row execute function app_private.touch_updated_at();

-- Backfill from legacy input_schema.reference_images (string URLs)
insert into public.template_reference_images (
  template_id,
  url,
  image_prompt,
  video_prompt,
  display_order
)
select
  t.id,
  ref.url,
  t.prompt_text,
  nullif(trim(coalesce(t.input_schema->>'video_prompt_text', '')), ''),
  ref.ordinality - 1
from public.templates t
cross join lateral jsonb_array_elements_text(
  coalesce(t.input_schema->'reference_images', '[]'::jsonb)
) with ordinality as ref(url, ordinality)
where jsonb_typeof(t.input_schema->'reference_images') = 'array'
  and ref.url like 'http%';

alter table public.template_reference_images enable row level security;

create policy template_reference_images_admin_select
  on public.template_reference_images for select
  to authenticated
  using (app_private.is_admin());

create policy template_reference_images_admin_insert
  on public.template_reference_images for insert
  to authenticated
  with check (app_private.is_admin());

create policy template_reference_images_admin_update
  on public.template_reference_images for update
  to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

create policy template_reference_images_admin_delete
  on public.template_reference_images for delete
  to authenticated
  using (app_private.is_admin());

grant select, insert, update, delete on public.template_reference_images to authenticated;
