-- Migration: Refactor template image system + Add categories table
-- Run this in the Supabase SQL Editor
-- ✅ Fully idempotent — safe to re-run multiple times.

-- =========================================================================================
-- 1. CATEGORIES TABLE
-- =========================================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies (drop-if-exists then create to avoid "already exists" errors)
DROP POLICY IF EXISTS "Anyone can read active categories" ON public.categories;
CREATE POLICY "Anyone can read active categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can read all categories" ON public.categories;
CREATE POLICY "Admins can read all categories"
  ON public.categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

GRANT ALL ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO service_role;

-- Seed existing categories
INSERT INTO public.categories (name, slug, is_active, display_order) VALUES
  ('Humour', 'humour', true, 1),
  ('Absurde', 'absurde', true, 2),
  ('Célébrité', 'celebrite', true, 3),
  ('Situation', 'situation', true, 4),
  ('Personnalisé', 'personnalise', true, 5)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================================
-- 2. MIGRATE prompt_templates: old image columns → image_slots
-- =========================================================================================

-- Add the new column
ALTER TABLE public.prompt_templates
  ADD COLUMN IF NOT EXISTS image_slots TEXT;

-- Migrate existing data ONLY if old columns still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prompt_templates'
      AND column_name = 'required_images'
  ) THEN
    UPDATE public.prompt_templates
    SET image_slots = (
      SELECT json_agg(
        json_build_object(
          'label', COALESCE(label_val, ''),
          'required', idx < COALESCE(required_images, 0)
        )
      )::TEXT
      FROM (
        SELECT
          idx,
          CASE
            WHEN image_labels IS NOT NULL AND image_labels != ''
            THEN (
              SELECT elem
              FROM json_array_elements_text(image_labels::json) WITH ORDINALITY AS t(elem, ord)
              WHERE t.ord = idx + 1
            )
            ELSE NULL
          END AS label_val
        FROM generate_series(0, GREATEST(COALESCE(required_images, 0) + COALESCE(optional_images, 0) - 1, -1)) AS idx
      ) sub
    )
    WHERE COALESCE(required_images, 0) + COALESCE(optional_images, 0) > 0;
  END IF;
END $$;

-- Drop old columns (safe even if already dropped)
ALTER TABLE public.prompt_templates
  DROP COLUMN IF EXISTS required_images,
  DROP COLUMN IF EXISTS optional_images,
  DROP COLUMN IF EXISTS output_label,
  DROP COLUMN IF EXISTS image_labels;

-- =========================================================================================
-- 3. ADD text_fields column + DROP description
-- =========================================================================================
ALTER TABLE public.prompt_templates
  ADD COLUMN IF NOT EXISTS text_fields TEXT;

ALTER TABLE public.prompt_templates
  DROP COLUMN IF EXISTS description;

-- =========================================================================================
-- 4. ADD example image columns
-- =========================================================================================
ALTER TABLE public.prompt_templates
  ADD COLUMN IF NOT EXISTS example_before_url TEXT,
  ADD COLUMN IF NOT EXISTS example_after_url TEXT;

-- =========================================================================================
-- 5. MAKE category optional (nullable)
-- =========================================================================================
ALTER TABLE public.prompt_templates
  ALTER COLUMN category DROP NOT NULL;

-- =========================================================================================
-- 6. ADD input_urls column to generated_larps
-- =========================================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'generated_larps'
      AND column_name = 'input_urls'
  ) THEN
    ALTER TABLE public.generated_larps ADD COLUMN input_urls TEXT;
  END IF;
END $$;
