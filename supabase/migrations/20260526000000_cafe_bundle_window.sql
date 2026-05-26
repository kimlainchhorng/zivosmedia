-- Phase 64: time-windowed bundles. Owner pins a combo to e.g. 11:30–14:30
-- so "Lunch combo" only shows up at lunch. Times are stored TIME (no tz),
-- treated as server-local — same convention as cafe_hours. NULL on both
-- columns means "always active". Wrap past midnight supported (end < start
-- means e.g. 22:00–02:00).

ALTER TABLE public.cafe_bundles
  ADD COLUMN IF NOT EXISTS active_start_time TIME,
  ADD COLUMN IF NOT EXISTS active_end_time   TIME;

ALTER TABLE public.cafe_bundles
  DROP CONSTRAINT IF EXISTS cafe_bundles_window_pair;
ALTER TABLE public.cafe_bundles
  ADD CONSTRAINT cafe_bundles_window_pair CHECK (
    (active_start_time IS NULL AND active_end_time IS NULL)
    OR (active_start_time IS NOT NULL AND active_end_time IS NOT NULL
        AND active_start_time <> active_end_time)
  );

CREATE OR REPLACE FUNCTION public.cafe_bundle_window_active(
  p_start TIME, p_end TIME, p_now TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    CASE
      WHEN p_start IS NULL OR p_end IS NULL THEN true
      WHEN p_end > p_start THEN
        (p_now::TIME) >= p_start AND (p_now::TIME) < p_end
      ELSE
        (p_now::TIME) >= p_start OR (p_now::TIME) < p_end
    END;
$$;
