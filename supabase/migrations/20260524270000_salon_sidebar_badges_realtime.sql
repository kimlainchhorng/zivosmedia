-- useSalonSidebarBadges subscribes to postgres_changes on three salon tables
-- so the Bookings / Waitlist / Reviews / Retail tabs show a live unread count.
-- salon_bookings was already added to the publication in
-- 20260524220000_salon_bookings_realtime_publication.sql; the other three
-- were missed, so a new waitlist entry, a new review, or a retail row
-- dropping below low-stock never bumped the sidebar count.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'salon_waitlist'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_waitlist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'salon_reviews'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_reviews';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'salon_retail_products'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_retail_products';
  END IF;
END $$;

-- REPLICA IDENTITY FULL on each, matching the salon_bookings setup, so the
-- postgres_changes payload carries enough columns for the badges hook to
-- evaluate (e.g., a low-stock filter would otherwise have to re-query).
ALTER TABLE public.salon_waitlist REPLICA IDENTITY FULL;
ALTER TABLE public.salon_reviews REPLICA IDENTITY FULL;
ALTER TABLE public.salon_retail_products REPLICA IDENTITY FULL;
