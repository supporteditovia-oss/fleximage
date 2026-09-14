-- Aggregates for public trust stats (called from API with service role only).
CREATE OR REPLACE FUNCTION admin_trust_stats()
RETURNS TABLE (
  total_generations bigint,
  recent_generations bigint,
  creators bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT COUNT(*)
      FROM generations
      WHERE status = 'succeeded'
        AND generation_type = 'image'
    ),
    (
      SELECT COUNT(*)
      FROM generations
      WHERE status = 'succeeded'
        AND generation_type = 'image'
        AND created_at >= NOW() - INTERVAL '30 days'
    ),
    (
      SELECT COUNT(DISTINCT user_id)
      FROM generations
      WHERE status = 'succeeded'
        AND generation_type = 'image'
    );
$$;

REVOKE ALL ON FUNCTION admin_trust_stats() FROM PUBLIC;
