begin;

alter table public.templates
  add column if not exists name_en text;

alter table public.template_categories
  add column if not exists name_en text;

comment on column public.templates.name is
  'French template title.';

comment on column public.templates.name_en is
  'English template title. Falls back to name when null.';

comment on column public.template_categories.name is
  'French category name.';

comment on column public.template_categories.name_en is
  'English category name. Falls back to name when null.';

commit;
