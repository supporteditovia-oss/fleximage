-- Create app_settings table for runtime configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default values
INSERT INTO app_settings (key, value) VALUES ('force_kie_ai', 'false') ON CONFLICT DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('fallback_timeout_ms', '105000') ON CONFLICT DO NOTHING;
