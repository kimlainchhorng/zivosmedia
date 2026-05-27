-- KDS, owner orders view, and sidebar-badges hooks all subscribe to
-- postgres_changes on cafe_orders / cafe_order_items / cafe_payments. Those
-- only fire when the tables are in the supabase_realtime publication; add
-- each one idempotently, mirroring the salon_bookings realtime migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cafe_orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cafe_order_items'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_order_items';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cafe_payments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_payments';
  END IF;
END $$;

-- REPLICA IDENTITY FULL so the postgres_changes event payload carries every
-- column the hooks read after a refresh (the hooks ignore the payload itself
-- and re-fetch, but FULL keeps the contract uniform with salon_bookings and
-- guards against future code that does read payload.new directly).
ALTER TABLE public.cafe_orders REPLICA IDENTITY FULL;
ALTER TABLE public.cafe_order_items REPLICA IDENTITY FULL;
ALTER TABLE public.cafe_payments REPLICA IDENTITY FULL;
