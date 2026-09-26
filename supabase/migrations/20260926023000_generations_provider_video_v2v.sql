-- Allow video V2V provider labels + deepinfra (image) on generations / events.

alter table public.generations
  drop constraint if exists generations_provider_check;

alter table public.generations
  add constraint generations_provider_check
  check (
    provider is null
    or provider in (
      'kie',
      'runway',
      'oneshot',
      'fallback',
      'deepinfra',
      'runway_aleph',
      'kling_motion'
    )
  );

alter table public.generation_events
  drop constraint if exists generation_events_provider_check;

alter table public.generation_events
  add constraint generation_events_provider_check
  check (
    provider is null
    or provider in (
      'kie',
      'runway',
      'oneshot',
      'fallback',
      'deepinfra',
      'runway_aleph',
      'kling_motion'
    )
  );
