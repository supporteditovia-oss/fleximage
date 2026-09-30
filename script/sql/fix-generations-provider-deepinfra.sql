-- À exécuter une fois dans Supabase SQL Editor (prod) si tu veux la valeur literal `deepinfra` en colonne.
-- L'API fonctionne déjà sans ça (fallback + metadata.deepinfra_sync).
-- Fichier canonique : supabase/migrations/20260926023000_generations_provider_video_v2v.sql

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
