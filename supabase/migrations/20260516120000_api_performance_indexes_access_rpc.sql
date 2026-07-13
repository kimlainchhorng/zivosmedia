-- Backend/API performance pass:
-- 1) Add narrow indexes for hot app queries.
-- 2) Collapse repeated frontend access checks into one RPC.

CREATE INDEX IF NOT EXISTS idx_store_profiles_active_name
  ON public.store_profiles (name)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_store_profiles_owner_created
  ON public.store_profiles (owner_id, created_at DESC)
  WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_products_store_stock_created
  ON public.store_products (store_id, created_at DESC)
  WHERE in_stock = true;

CREATE INDEX IF NOT EXISTS idx_eats_zones_active_city
  ON public.eats_zones (city_name)
  WHERE is_active = true AND zone_code <> 'DEFAULT';

CREATE INDEX IF NOT EXISTS idx_app_settings_global_key
  ON public.app_settings (key)
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_channel_created
  ON public.notifications (user_id, channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_receiver_unread_created
  ON public.direct_messages (receiver_id, created_at DESC)
  WHERE is_read = false;

DO $$
BEGIN
  IF to_regclass('public.pricing_config') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pricing_config_created_desc ON public.pricing_config (created_at DESC)';
  END IF;

  IF to_regclass('public.shop_live_pulse') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shop_live_pulse_last_purchase ON public.shop_live_pulse (last_purchase_at DESC)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_user_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_roles text[] := ARRAY[]::text[];
  v_driver_id uuid;
  v_restaurant_id uuid;
  v_car_rental_ids uuid[] := ARRAY[]::uuid[];
  v_hotel_id uuid;
  v_store_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'isAdmin', false,
      'isDriver', false,
      'isRestaurantOwner', false,
      'isCarRentalOwner', false,
      'isHotelOwner', false,
      'isFlightManager', false,
      'isStoreOwner', false,
      'isSupport', false,
      'isModerator', false,
      'isOperations', false,
      'roles', ARRAY[]::text[]
    );
  END IF;

  SELECT COALESCE(array_agg(role::text ORDER BY role::text), ARRAY[]::text[])
    INTO v_roles
  FROM public.user_roles
  WHERE user_id = v_uid;

  SELECT id INTO v_driver_id
  FROM public.drivers
  WHERE user_id = v_uid
  LIMIT 1;

  SELECT id INTO v_restaurant_id
  FROM public.restaurants
  WHERE owner_id = v_uid
  LIMIT 1;

  SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::uuid[])
    INTO v_car_rental_ids
  FROM public.rental_cars
  WHERE owner_id = v_uid;

  SELECT id INTO v_hotel_id
  FROM public.hotels
  WHERE owner_id = v_uid
  LIMIT 1;

  SELECT id INTO v_store_id
  FROM public.store_profiles
  WHERE owner_id = v_uid
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'isAdmin', 'admin' = ANY(v_roles) OR 'super_admin' = ANY(v_roles),
    'isDriver', v_driver_id IS NOT NULL,
    'isRestaurantOwner', v_restaurant_id IS NOT NULL,
    'isCarRentalOwner', cardinality(v_car_rental_ids) > 0,
    'isHotelOwner', v_hotel_id IS NOT NULL,
    'isFlightManager', 'admin' = ANY(v_roles) OR 'super_admin' = ANY(v_roles),
    'isStoreOwner', v_store_id IS NOT NULL,
    'isSupport', 'support' = ANY(v_roles),
    'isModerator', 'moderator' = ANY(v_roles),
    'isOperations', 'operations' = ANY(v_roles),
    'roles', v_roles,
    'driverId', v_driver_id,
    'restaurantId', v_restaurant_id,
    'carRentalIds', v_car_rental_ids,
    'hotelId', v_hotel_id,
    'storeId', v_store_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_user_access() TO authenticated;
