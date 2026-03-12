-- Add keywords column to prompt_templates
ALTER TABLE prompt_templates
  ADD COLUMN IF NOT EXISTS keywords TEXT;
