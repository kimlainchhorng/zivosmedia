-- Owner notifications (useSalonRealtimeNotifications) listen for INSERTs on
-- salon_bookings so the owner gets a toast when a customer requests a
-- booking from the public site. That only fires when the table is in the
-- supabase_realtime publication; add it idempotently.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'salon_bookings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.salon_bookings';
  END IF;
END $$;

-- REPLICA IDENTITY FULL so payload.new in the postgres_changes event
-- carries every column the hook reads (status, source, client_name,
-- service_name), not just the primary key.
ALTER TABLE public.salon_bookings REPLICA IDENTITY FULL;
