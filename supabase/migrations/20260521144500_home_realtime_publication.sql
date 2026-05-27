-- Enable Supabase Realtime for the customer-facing home data surfaces.
-- Guarded so it is safe on environments where some tables were already added.
DO $$
DECLARE
  realtime_table text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    RETURN;
  END IF;

  FOREACH realtime_table IN ARRAY ARRAY[
    'food_orders',
    'trips',
    'scheduled_bookings',
    'customer_wallets',
    'customer_wallet_transactions',
    'user_favorites',
    'restaurants'
  ] LOOP
    IF to_regclass(format('public.%I', realtime_table)) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = realtime_table
      )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', realtime_table);
    END IF;
  END LOOP;
END $$;
