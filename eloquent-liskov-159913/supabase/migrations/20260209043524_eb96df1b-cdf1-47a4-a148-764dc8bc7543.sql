-- ============================================
-- Customer Role Enforcement
-- ============================================

-- 1) Create is_customer() helper function
CREATE OR REPLACE FUNCTION public.is_customer(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'customer'
  )
$$;

-- 2) Auto-assign customer role on signup
CREATE OR REPLACE FUNCTION public.assign_customer_role_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_assign_customer ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created_assign_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_customer_role_on_signup();

-- 3) Backfill existing users with customer role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'customer'::app_role
FROM auth.users
WHERE id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'customer'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) Update RLS policies for customer tables

-- food_orders: Customer SELECT
DROP POLICY IF EXISTS "Customers can view own food orders" ON public.food_orders;
CREATE POLICY "Customers can view own food orders"
  ON public.food_orders FOR SELECT
  USING (customer_id = auth.uid() AND is_customer(auth.uid()));

-- food_orders: Customer INSERT
DROP POLICY IF EXISTS "Customers can create food orders" ON public.food_orders;
CREATE POLICY "Customers can create food orders"
  ON public.food_orders FOR INSERT
  WITH CHECK (customer_id = auth.uid() AND is_customer(auth.uid()));

-- trips: Customer SELECT (uses rider_id)
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (rider_id = auth.uid() AND is_customer(auth.uid()));

-- trips: Customer INSERT
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
CREATE POLICY "Users can create trips"
  ON public.trips FOR INSERT
  WITH CHECK (rider_id = auth.uid() AND is_customer(auth.uid()));

-- travel_orders: Customer SELECT (uses user_id)
DROP POLICY IF EXISTS "Customers can view own travel orders" ON public.travel_orders;
CREATE POLICY "Customers can view own travel orders"
  ON public.travel_orders FOR SELECT
  USING (user_id = auth.uid() AND is_customer(auth.uid()));

-- travel_orders: Customer INSERT
DROP POLICY IF EXISTS "Customers can create travel orders" ON public.travel_orders;
CREATE POLICY "Customers can create travel orders"
  ON public.travel_orders FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_customer(auth.uid()));

-- travel_orders: Customer UPDATE (for cancellation requests)
DROP POLICY IF EXISTS "Customers can update own travel orders" ON public.travel_orders;
CREATE POLICY "Customers can update own travel orders"
  ON public.travel_orders FOR UPDATE
  USING (user_id = auth.uid() AND is_customer(auth.uid()));

-- hotel_bookings: Customer SELECT (uses customer_id)
DROP POLICY IF EXISTS "Customers can view own hotel bookings" ON public.hotel_bookings;
CREATE POLICY "Customers can view own hotel bookings"
  ON public.hotel_bookings FOR SELECT
  USING (customer_id = auth.uid() AND is_customer(auth.uid()));

-- hotel_bookings: Customer INSERT
DROP POLICY IF EXISTS "Customers can create hotel bookings" ON public.hotel_bookings;
CREATE POLICY "Customers can create hotel bookings"
  ON public.hotel_bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid() AND is_customer(auth.uid()));

-- customer_wallets: Customer SELECT (uses user_id)
DROP POLICY IF EXISTS "Users can view own wallet" ON public.customer_wallets;
CREATE POLICY "Users can view own wallet"
  ON public.customer_wallets FOR SELECT
  USING (user_id = auth.uid() AND is_customer(auth.uid()));