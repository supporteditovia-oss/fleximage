-- Per-reference flag: whether generation must include the user's face capture asset

alter table public.template_reference_images
  add column if not exists requires_face_asset boolean not null default true;

comment on column public.template_reference_images.requires_face_asset is
  'When true, random selection for users with face capture includes this row and face URLs are sent to the image provider.';
