-- Manager PIN for sensitive actions (currently: refunds). PIN is stored as
-- a SHA-256 hex digest of (store_id || pin) — adequate to keep honest staff
-- honest. Anyone with DB access can still bypass; this is a UI gate, not a
-- crypto security boundary.

ALTER TABLE public.cafe_settings
  ADD COLUMN IF NOT EXISTS manager_pin_hash text,
  ADD COLUMN IF NOT EXISTS require_pin_for_refund boolean NOT NULL DEFAULT false;
