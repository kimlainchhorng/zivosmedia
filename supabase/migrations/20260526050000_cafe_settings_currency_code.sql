-- Phase 67: per-store currency. ISO 4217 alpha code (USD, KHR, THB, etc).
-- Default USD so existing stores see no change. CHECK enforces format.

ALTER TABLE public.cafe_settings
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'USD'
    CHECK (currency_code ~ '^[A-Z]{3}$');
