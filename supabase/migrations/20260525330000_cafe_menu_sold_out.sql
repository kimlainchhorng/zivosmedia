-- Sold-out / "86'd" flag on cafe_menu_items. The owner flips this on when
-- they run out of an ingredient mid-shift; the public order page treats it
-- like a soft disable. A cron job clears the flag nightly so tomorrow
-- starts fresh.

ALTER TABLE public.cafe_menu_items
  ADD COLUMN IF NOT EXISTS is_sold_out boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS cafe_menu_items_sold_out_idx
  ON public.cafe_menu_items(store_id) WHERE is_sold_out = true;

-- Nightly reset: 04:00 UTC every day. Idempotent install.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drop any prior version of the same job before re-creating.
    PERFORM cron.unschedule(jobid)
      FROM cron.job WHERE jobname = 'cafe_reset_sold_out_nightly';
    PERFORM cron.schedule(
      'cafe_reset_sold_out_nightly',
      '0 4 * * *',
      $reset$ UPDATE public.cafe_menu_items SET is_sold_out = false WHERE is_sold_out = true; $reset$
    );
  END IF;
END $$;
