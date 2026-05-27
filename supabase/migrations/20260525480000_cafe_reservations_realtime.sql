-- Realtime for cafe_reservations: owner gets a toast when a new pending
-- reservation arrives via the public RPC. Same pattern as Phase 32's
-- cafe_inventory_items setup — REPLICA IDENTITY FULL so postgres_changes
-- payloads carry the row, plus publication membership.

ALTER TABLE public.cafe_reservations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cafe_reservations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cafe_reservations';
  END IF;
END $$;
