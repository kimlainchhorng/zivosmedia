-- Add allowed emails to signup_allowlist
INSERT INTO signup_allowlist (email) VALUES 
  ('kimlain@hizivo.com'),
  ('support@hizivo.com'),
  ('chhorngkimlain1@gmail.com')
ON CONFLICT (email) DO NOTHING;