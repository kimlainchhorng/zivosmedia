-- Daily message: an optional banner the owner sets to announce a special,
-- hours change, etc. `until` is the auto-expiry — once past, the message
-- still lives but the customer page suppresses it (cleaner than asking
-- owners to remember to clear stale messages).

ALTER TABLE public.cafe_settings
  ADD COLUMN IF NOT EXISTS daily_message text,
  ADD COLUMN IF NOT EXISTS daily_message_until timestamptz;
