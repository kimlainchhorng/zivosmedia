-- Add the correct Gmail spelling to allowlist
INSERT INTO signup_allowlist (email) VALUES 
  ('chhorgkimlain1@gmail.com')
ON CONFLICT (email) DO NOTHING;