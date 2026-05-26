-- CRITICAL SECURITY FIX: Add RLS policies to exposed tables
-- This migration protects sensitive PII, financial data, and operational information

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 1. PROFILES - Users can only see their own profile
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. DRIVERS - Drivers see own, admins see all
-- =====================================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_select_own_or_admin" ON public.drivers;
CREATE POLICY "drivers_select_own_or_admin" ON public.drivers
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "drivers_update_own" ON public.drivers;
CREATE POLICY "drivers_update_own" ON public.drivers
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "drivers_insert_own" ON public.drivers;
CREATE POLICY "drivers_insert_own" ON public.drivers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 3. EMERGENCY_CONTACTS - Owner's drivers only
-- =====================================================
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emergency_contacts_select" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_select" ON public.emergency_contacts
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "emergency_contacts_modify" ON public.emergency_contacts;
CREATE POLICY "emergency_contacts_modify" ON public.emergency_contacts
  FOR ALL USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 4. STAFF_MEMBERS - Restaurant owners only
-- =====================================================
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_members_select" ON public.staff_members;
CREATE POLICY "staff_members_select" ON public.staff_members
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "staff_members_modify" ON public.staff_members;
CREATE POLICY "staff_members_modify" ON public.staff_members
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

-- =====================================================
-- 5. LOYALTY_MEMBERS - Restaurant owners only
-- =====================================================
ALTER TABLE public.loyalty_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_members_select" ON public.loyalty_members;
CREATE POLICY "loyalty_members_select" ON public.loyalty_members
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "loyalty_members_modify" ON public.loyalty_members;
CREATE POLICY "loyalty_members_modify" ON public.loyalty_members
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

-- =====================================================
-- 6. DRIVER_WITHDRAWALS - Driver's own only
-- =====================================================
ALTER TABLE public.driver_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_withdrawals_select" ON public.driver_withdrawals;
CREATE POLICY "driver_withdrawals_select" ON public.driver_withdrawals
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "driver_withdrawals_insert" ON public.driver_withdrawals;
CREATE POLICY "driver_withdrawals_insert" ON public.driver_withdrawals
  FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 7. DRIVER_EARNINGS - Driver's own only
-- =====================================================
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_earnings_select" ON public.driver_earnings;
CREATE POLICY "driver_earnings_select" ON public.driver_earnings
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- =====================================================
-- 8. DRIVER_EXPENSES - Driver's own only
-- =====================================================
ALTER TABLE public.driver_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_expenses_select" ON public.driver_expenses;
CREATE POLICY "driver_expenses_select" ON public.driver_expenses
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "driver_expenses_modify" ON public.driver_expenses;
CREATE POLICY "driver_expenses_modify" ON public.driver_expenses
  FOR ALL USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 9. FUEL_ENTRIES - Driver's own only
-- =====================================================
ALTER TABLE public.fuel_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_entries_select" ON public.fuel_entries;
CREATE POLICY "fuel_entries_select" ON public.fuel_entries
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "fuel_entries_modify" ON public.fuel_entries;
CREATE POLICY "fuel_entries_modify" ON public.fuel_entries
  FOR ALL USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 10. GIFT_CARDS - Restaurant owner only
-- =====================================================
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gift_cards_select" ON public.gift_cards;
CREATE POLICY "gift_cards_select" ON public.gift_cards
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "gift_cards_modify" ON public.gift_cards;
CREATE POLICY "gift_cards_modify" ON public.gift_cards
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

-- =====================================================
-- 11. TRIPS - Rider or driver participants only
-- =====================================================
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select_participants" ON public.trips;
CREATE POLICY "trips_select_participants" ON public.trips
  FOR SELECT USING (
    rider_id = auth.uid() 
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "trips_insert" ON public.trips;
CREATE POLICY "trips_insert" ON public.trips
  FOR INSERT WITH CHECK (rider_id = auth.uid());

DROP POLICY IF EXISTS "trips_update" ON public.trips;
CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE USING (
    rider_id = auth.uid() 
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- =====================================================
-- 12. FOOD_ORDERS - Customer or driver only
-- =====================================================
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_orders_select" ON public.food_orders;
CREATE POLICY "food_orders_select" ON public.food_orders
  FOR SELECT USING (
    customer_id = auth.uid() 
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "food_orders_insert" ON public.food_orders;
CREATE POLICY "food_orders_insert" ON public.food_orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "food_orders_update" ON public.food_orders;
CREATE POLICY "food_orders_update" ON public.food_orders
  FOR UPDATE USING (
    customer_id = auth.uid() 
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- =====================================================
-- 13. DRIVER_LOCATION_HISTORY - Driver's own only
-- =====================================================
ALTER TABLE public.driver_location_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_location_history_select" ON public.driver_location_history;
CREATE POLICY "driver_location_history_select" ON public.driver_location_history
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "driver_location_history_insert" ON public.driver_location_history;
CREATE POLICY "driver_location_history_insert" ON public.driver_location_history
  FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 14. FLIGHT_BOOKINGS - Booker (customer_id) only
-- =====================================================
ALTER TABLE public.flight_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flight_bookings_select" ON public.flight_bookings;
CREATE POLICY "flight_bookings_select" ON public.flight_bookings
  FOR SELECT USING (customer_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "flight_bookings_modify" ON public.flight_bookings;
CREATE POLICY "flight_bookings_modify" ON public.flight_bookings
  FOR ALL USING (customer_id = auth.uid());

-- =====================================================
-- 15. HOTEL_BOOKINGS - Booker (customer_id) only
-- =====================================================
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_bookings_select" ON public.hotel_bookings;
CREATE POLICY "hotel_bookings_select" ON public.hotel_bookings
  FOR SELECT USING (customer_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "hotel_bookings_modify" ON public.hotel_bookings;
CREATE POLICY "hotel_bookings_modify" ON public.hotel_bookings
  FOR ALL USING (customer_id = auth.uid());

-- =====================================================
-- 16. CAR_RENTALS - Renter (customer_id) only
-- =====================================================
ALTER TABLE public.car_rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "car_rentals_select" ON public.car_rentals;
CREATE POLICY "car_rentals_select" ON public.car_rentals
  FOR SELECT USING (customer_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "car_rentals_modify" ON public.car_rentals;
CREATE POLICY "car_rentals_modify" ON public.car_rentals
  FOR ALL USING (customer_id = auth.uid());

-- =====================================================
-- 17. AUDIT_LOGS - Admin only
-- =====================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- =====================================================
-- 18. SECURITY_EVENTS - Admin only
-- =====================================================
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_events_admin_only" ON public.security_events;
CREATE POLICY "security_events_admin_only" ON public.security_events
  FOR SELECT USING (public.is_admin(auth.uid()));

-- =====================================================
-- 19. SOS_ALERTS - Driver's own only (no user_id col)
-- =====================================================
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sos_alerts_select" ON public.sos_alerts;
CREATE POLICY "sos_alerts_select" ON public.sos_alerts
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "sos_alerts_insert" ON public.sos_alerts;
CREATE POLICY "sos_alerts_insert" ON public.sos_alerts
  FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 20. SAFETY_INCIDENTS - Driver owner or admin
-- =====================================================
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "safety_incidents_select" ON public.safety_incidents;
CREATE POLICY "safety_incidents_select" ON public.safety_incidents
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "safety_incidents_insert" ON public.safety_incidents;
CREATE POLICY "safety_incidents_insert" ON public.safety_incidents
  FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 21. VEHICLE_SERVICE_LOGS - Driver only
-- =====================================================
ALTER TABLE public.vehicle_service_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_service_logs_select" ON public.vehicle_service_logs;
CREATE POLICY "vehicle_service_logs_select" ON public.vehicle_service_logs
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "vehicle_service_logs_modify" ON public.vehicle_service_logs;
CREATE POLICY "vehicle_service_logs_modify" ON public.vehicle_service_logs
  FOR ALL USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 22. CUSTOMER_ORDERS - Restaurant owner or admin
-- =====================================================
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_orders_select" ON public.customer_orders;
CREATE POLICY "customer_orders_select" ON public.customer_orders
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "customer_orders_modify" ON public.customer_orders;
CREATE POLICY "customer_orders_modify" ON public.customer_orders
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

-- =====================================================
-- 23. WAITLIST - Restaurant owner only
-- =====================================================
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_select" ON public.waitlist;
CREATE POLICY "waitlist_select" ON public.waitlist
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "waitlist_modify" ON public.waitlist;
CREATE POLICY "waitlist_modify" ON public.waitlist
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

-- =====================================================
-- 24. RESERVATIONS - Restaurant owner only
-- =====================================================
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
CREATE POLICY "reservations_select" ON public.reservations
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "reservations_modify" ON public.reservations;
CREATE POLICY "reservations_modify" ON public.reservations
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  );

-- =====================================================
-- 25. CUSTOMER_FEEDBACK - Restaurant owner or public read
-- =====================================================
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_feedback_select" ON public.customer_feedback;
CREATE POLICY "customer_feedback_select" ON public.customer_feedback
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR public.is_admin(auth.uid())
    OR is_public = true
  );

DROP POLICY IF EXISTS "customer_feedback_insert" ON public.customer_feedback;
CREATE POLICY "customer_feedback_insert" ON public.customer_feedback
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 26. TRANSACTIONS - User's own only
-- =====================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- =====================================================
-- 27. WITHDRAWALS - Driver's own only
-- =====================================================
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_select" ON public.withdrawals;
CREATE POLICY "withdrawals_select" ON public.withdrawals
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "withdrawals_insert" ON public.withdrawals;
CREATE POLICY "withdrawals_insert" ON public.withdrawals
  FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- =====================================================
-- 28. VEHICLES - Driver's own only
-- =====================================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "vehicles_modify" ON public.vehicles;
CREATE POLICY "vehicles_modify" ON public.vehicles
  FOR ALL USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );