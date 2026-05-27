-- Per-item happy hour pricing. All three columns must be set for happy hour
-- to be considered active. happy_hour_end is exclusive and may wrap past
-- midnight (start=22, end=2 → 10pm–2am inclusive of the start hour).

ALTER TABLE public.cafe_menu_items
  ADD COLUMN IF NOT EXISTS happy_hour_price_cents integer
    CHECK (happy_hour_price_cents IS NULL OR happy_hour_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS happy_hour_start smallint
    CHECK (happy_hour_start IS NULL OR (happy_hour_start >= 0 AND happy_hour_start <= 23)),
  ADD COLUMN IF NOT EXISTS happy_hour_end smallint
    CHECK (happy_hour_end IS NULL OR (happy_hour_end >= 0 AND happy_hour_end <= 23));

-- Helper: is happy hour active for a row at the store's local "now"? We
-- approximate "store time" with the server's UTC for now — most cafes set
-- this in their local timezone via the date_trunc, and a global cron flip
-- would be heavier than the feature warrants. Wraps past midnight via OR.
CREATE OR REPLACE FUNCTION public.cafe_menu_item_happy_hour_active(
  p_price integer, p_start smallint, p_end smallint, p_now timestamptz
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_price IS NOT NULL AND p_start IS NOT NULL AND p_end IS NOT NULL
    AND CASE
      -- Same-day window: start <= now-hour < end
      WHEN p_start < p_end THEN
        EXTRACT(HOUR FROM p_now)::int >= p_start
        AND EXTRACT(HOUR FROM p_now)::int < p_end
      -- Wrap past midnight: start..23 OR 0..end-1
      WHEN p_start > p_end THEN
        EXTRACT(HOUR FROM p_now)::int >= p_start
        OR EXTRACT(HOUR FROM p_now)::int < p_end
      ELSE false
    END;
$$;
