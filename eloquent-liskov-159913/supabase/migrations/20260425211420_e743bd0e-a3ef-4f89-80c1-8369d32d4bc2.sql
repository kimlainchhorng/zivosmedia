-- 1) Auto-create btree indexes for every single-column FK in public missing one.
DO $$
DECLARE
  rec RECORD;
  idx_name text;
BEGIN
  FOR rec IN
    WITH fks AS (
      SELECT
        c.conrelid::regclass::text AS table_name,
        a.attname AS column_name
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'f'
        AND c.connamespace = 'public'::regnamespace
        AND array_length(c.conkey, 1) = 1
    ),
    idx AS (
      SELECT t.relname AS table_name, a.attname AS column_name
      FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = i.indkey[0]
      WHERE n.nspname = 'public' AND i.indkey[1] = 0
    )
    SELECT DISTINCT fks.table_name, fks.column_name
    FROM fks
    LEFT JOIN idx
      ON idx.table_name = split_part(fks.table_name, '.', -1)
     AND idx.column_name = fks.column_name
    WHERE idx.column_name IS NULL
  LOOP
    idx_name := left(
      'idx_' || regexp_replace(rec.table_name, '^public\.', '') || '_' || rec.column_name,
      63
    );
    BEGIN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %s (%I)',
        idx_name, rec.table_name, rec.column_name
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %: %', idx_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- 2) Composite + BRIN hot-path indexes, fully guarded by column existence.
DO $$
DECLARE
  -- helper inline lambda via a subquery: returns true if all columns exist on table
  has_cols boolean;
BEGIN
  -- food_orders (restaurant_id, status, created_at) and (customer_user_id, created_at)
  IF to_regclass('public.food_orders') IS NOT NULL THEN
    SELECT count(*) = 3 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='food_orders'
      AND column_name IN ('restaurant_id','status','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_food_orders_restaurant_status_created ON public.food_orders (restaurant_id, status, created_at DESC)';
    END IF;

    SELECT count(*) = 2 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='food_orders'
      AND column_name IN ('customer_user_id','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_food_orders_customer_created ON public.food_orders (customer_user_id, created_at DESC)';
    END IF;
  END IF;

  -- trips (driver_id, status, created_at) and (customer_user_id, status, created_at)
  IF to_regclass('public.trips') IS NOT NULL THEN
    SELECT count(*) = 3 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trips'
      AND column_name IN ('driver_id','status','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_driver_status_created ON public.trips (driver_id, status, created_at DESC)';
    END IF;

    SELECT count(*) = 3 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trips'
      AND column_name IN ('customer_user_id','status','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trips_customer_status_created ON public.trips (customer_user_id, status, created_at DESC)';
    END IF;
  END IF;

  -- customer_orders (restaurant_id, status, created_at)
  IF to_regclass('public.customer_orders') IS NOT NULL THEN
    SELECT count(*) = 3 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='customer_orders'
      AND column_name IN ('restaurant_id','status','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customer_orders_restaurant_status_created ON public.customer_orders (restaurant_id, status, created_at DESC)';
    END IF;
  END IF;

  -- deliveries (driver_user_id, status, created_at)
  IF to_regclass('public.deliveries') IS NOT NULL THEN
    SELECT count(*) = 3 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='deliveries'
      AND column_name IN ('driver_user_id','status','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_deliveries_driver_status_created ON public.deliveries (driver_user_id, status, created_at DESC)';
    END IF;
  END IF;

  -- chat_messages (chat_id, created_at)
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    SELECT count(*) = 2 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='chat_messages'
      AND column_name IN ('chat_id','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON public.chat_messages (chat_id, created_at DESC)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chat_messages_created_brin ON public.chat_messages USING BRIN (created_at)';
    END IF;
  END IF;

  -- messages (conversation_id, created_at)
  IF to_regclass('public.messages') IS NOT NULL THEN
    SELECT count(*) = 2 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages'
      AND column_name IN ('conversation_id','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_created_brin ON public.messages USING BRIN (created_at)';
    END IF;
  END IF;

  -- notifications (user_id, read_at NULLS FIRST, created_at)
  IF to_regclass('public.notifications') IS NOT NULL THEN
    SELECT count(*) = 3 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications'
      AND column_name IN ('user_id','read_at','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read_at NULLS FIRST, created_at DESC)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_created_brin ON public.notifications USING BRIN (created_at)';
    END IF;
  END IF;

  -- driver_locations (driver_id, updated_at)
  IF to_regclass('public.driver_locations') IS NOT NULL THEN
    SELECT count(*) = 2 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='driver_locations'
      AND column_name IN ('driver_id','updated_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_updated ON public.driver_locations (driver_id, updated_at DESC)';
    END IF;
  END IF;

  -- audit_logs BRIN(created_at)
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    SELECT count(*) = 1 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='audit_logs' AND column_name='created_at';
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_brin ON public.audit_logs USING BRIN (created_at)';
    END IF;
  END IF;

  -- analytics_events
  IF to_regclass('public.analytics_events') IS NOT NULL THEN
    SELECT count(*) = 2 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analytics_events'
      AND column_name IN ('user_id','created_at');
    IF has_cols THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON public.analytics_events (user_id, created_at DESC)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_analytics_events_created_brin ON public.analytics_events USING BRIN (created_at)';
    END IF;
  END IF;
END $$;

-- 3) Refresh planner stats on the heaviest tables so the new indexes are picked immediately.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.food_orders','public.trips','public.messages','public.chat_messages',
    'public.notifications','public.orders','public.customer_orders',
    'public.deliveries','public.driver_locations','public.analytics_events'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE 'ANALYZE ' || t;
    END IF;
  END LOOP;
END $$;