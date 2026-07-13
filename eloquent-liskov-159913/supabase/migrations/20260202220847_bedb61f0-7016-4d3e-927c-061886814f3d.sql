-- Add admin review columns to car_owner_profiles
ALTER TABLE car_owner_profiles
  ADD COLUMN IF NOT EXISTS admin_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Insert P2P beta mode settings
INSERT INTO system_settings (key, value, description, category, is_public)
VALUES 
  ('p2p_owner_beta_mode', 'true', 'Enable invite-only owner beta mode', 'p2p', false),
  ('p2p_beta_cities', '["Los Angeles", "Miami"]', 'Cities accepting beta applications', 'p2p', true),
  ('p2p_beta_message', '"We are currently accepting a limited number of owners for our private beta. Applications are reviewed manually."', 'Custom beta message to display', 'p2p', true)
ON CONFLICT (key) DO NOTHING;