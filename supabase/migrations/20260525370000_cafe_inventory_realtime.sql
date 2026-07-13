-- Enable Supabase Realtime for cafe_inventory_items so the admin gets a
-- low-stock toast when an order completion (or manual adjustment) crosses
-- below the threshold. REPLICA IDENTITY FULL is required for the
-- postgres_changes payload to include the old row, which we need to detect
-- the "crossing" — without it, payload.old comes back empty.

ALTER TABLE public.cafe_inventory_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cafe_inventory_items'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_inventory_items';
  END IF;
END $$;
