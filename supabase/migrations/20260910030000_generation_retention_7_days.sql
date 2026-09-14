-- Rétention automatique des médias générés : 7 jours après complétion.
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS generations_expires_at_idx
  ON public.generations (expires_at)
  WHERE expires_at IS NOT NULL;

-- Backfill : générations terminées avec sortie → expiration dans 7j depuis complétion/création.
UPDATE public.generations
SET expires_at = COALESCE(completed_at, created_at) + interval '7 days'
WHERE expires_at IS NULL
  AND status = 'succeeded'
  AND (
    (output_assets IS NOT NULL AND output_assets::text NOT IN ('[]', 'null'))
    OR (watermarked_assets IS NOT NULL AND watermarked_assets::text NOT IN ('[]', 'null'))
  );

COMMENT ON COLUMN public.generations.expires_at IS
  'UTC timestamp when output assets become eligible for automatic purge (7-day retention).';
