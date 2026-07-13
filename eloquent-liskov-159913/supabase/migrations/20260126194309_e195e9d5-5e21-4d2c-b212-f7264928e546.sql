-- Create enum for booking statuses
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');

-- Create enum for partner status
CREATE TYPE public.partner_status AS ENUM ('pending', 'active', 'suspended', 'inactive');

-- ============================================
-- RESTAURANTS MODULE
-- ============================================

-- Restaurant partners table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT NOT NULL,
  address TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  rating NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  avg_prep_time INTEGER DEFAULT 30,
  is_open BOOLEAN DEFAULT false,
  opening_hours JSONB,
  status partner_status DEFAULT 'pending',
  commission_rate NUMERIC DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Menu items for restaurants
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  preparation_time INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Food orders
CREATE TABLE public.food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  delivery_fee NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat NUMERIC NOT NULL,
  delivery_lng NUMERIC NOT NULL,
  special_instructions TEXT,
  status booking_status DEFAULT 'pending',
  estimated_prep_time INTEGER,
  estimated_delivery_time INTEGER,
  placed_at TIMESTAMPTZ DEFAULT now(),
  prepared_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CAR RENTAL MODULE
-- ============================================

-- Rental cars inventory
CREATE TABLE public.rental_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  license_plate TEXT NOT NULL UNIQUE,
  vin TEXT,
  category TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 5,
  transmission TEXT NOT NULL DEFAULT 'automatic',
  fuel_type TEXT NOT NULL DEFAULT 'petrol',
  mileage INTEGER DEFAULT 0,
  daily_rate NUMERIC NOT NULL,
  weekly_rate NUMERIC,
  monthly_rate NUMERIC,
  deposit_amount NUMERIC DEFAULT 0,
  location_address TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  features JSONB,
  images JSONB,
  is_available BOOLEAN DEFAULT true,
  status partner_status DEFAULT 'active',
  rating NUMERIC DEFAULT 0,
  total_rentals INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Car rental bookings
CREATE TABLE public.car_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  car_id UUID REFERENCES public.rental_cars(id) NOT NULL,
  pickup_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ NOT NULL,
  actual_return_date TIMESTAMPTZ,
  pickup_location TEXT NOT NULL,
  return_location TEXT,
  daily_rate NUMERIC NOT NULL,
  total_days INTEGER NOT NULL,
  subtotal NUMERIC NOT NULL,
  insurance_fee NUMERIC DEFAULT 0,
  additional_fees NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  deposit_paid NUMERIC DEFAULT 0,
  status booking_status DEFAULT 'pending',
  driver_license_number TEXT,
  notes TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FLIGHT BOOKING MODULE
-- ============================================

-- Airlines (partner airlines)
CREATE TABLE public.airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Available flights
CREATE TABLE public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id UUID REFERENCES public.airlines(id) NOT NULL,
  flight_number TEXT NOT NULL,
  departure_airport TEXT NOT NULL,
  departure_city TEXT NOT NULL,
  departure_country TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  arrival_country TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  aircraft_type TEXT,
  economy_price NUMERIC NOT NULL,
  business_price NUMERIC,
  first_class_price NUMERIC,
  economy_seats_available INTEGER DEFAULT 0,
  business_seats_available INTEGER DEFAULT 0,
  first_class_seats_available INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Flight bookings
CREATE TABLE public.flight_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  flight_id UUID REFERENCES public.flights(id) NOT NULL,
  return_flight_id UUID REFERENCES public.flights(id),
  passengers JSONB NOT NULL,
  cabin_class TEXT NOT NULL DEFAULT 'economy',
  seat_selection JSONB,
  price_per_passenger NUMERIC NOT NULL,
  total_passengers INTEGER NOT NULL,
  subtotal NUMERIC NOT NULL,
  taxes_fees NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  booking_reference TEXT NOT NULL UNIQUE,
  status booking_status DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- HOTEL BOOKING MODULE
-- ============================================

-- Hotels
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  star_rating INTEGER DEFAULT 3,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  images JSONB,
  amenities JSONB,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '11:00',
  cancellation_policy TEXT,
  rating NUMERIC DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  status partner_status DEFAULT 'pending',
  commission_rate NUMERIC DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hotel room types
CREATE TABLE public.hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL,
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  bed_type TEXT,
  size_sqm INTEGER,
  price_per_night NUMERIC NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 1,
  amenities JSONB,
  images JSONB,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hotel bookings
CREATE TABLE public.hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  hotel_id UUID REFERENCES public.hotels(id) NOT NULL,
  room_id UUID REFERENCES public.hotel_rooms(id) NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  room_count INTEGER NOT NULL DEFAULT 1,
  price_per_night NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  taxes_fees NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  special_requests TEXT,
  booking_reference TEXT NOT NULL UNIQUE,
  status booking_status DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  rating INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- RESTAURANTS POLICIES
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants
  FOR SELECT USING (status = 'active');

CREATE POLICY "Owners can manage their restaurants" ON public.restaurants
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all restaurants" ON public.restaurants
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- MENU ITEMS POLICIES
CREATE POLICY "Anyone can view available menu items" ON public.menu_items
  FOR SELECT USING (is_available = true);

CREATE POLICY "Restaurant owners can manage menu items" ON public.menu_items
  FOR ALL USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all menu items" ON public.menu_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- FOOD ORDERS POLICIES
CREATE POLICY "Customers can view their food orders" ON public.food_orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create food orders" ON public.food_orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Restaurant owners can view their orders" ON public.food_orders
  FOR SELECT USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Restaurant owners can update order status" ON public.food_orders
  FOR UPDATE USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all food orders" ON public.food_orders
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RENTAL CARS POLICIES
CREATE POLICY "Anyone can view available rental cars" ON public.rental_cars
  FOR SELECT USING (is_available = true AND status = 'active');

CREATE POLICY "Owners can manage their cars" ON public.rental_cars
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all rental cars" ON public.rental_cars
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- CAR RENTALS POLICIES
CREATE POLICY "Customers can view their car rentals" ON public.car_rentals
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create car rentals" ON public.car_rentals
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Car owners can view rentals of their cars" ON public.car_rentals
  FOR SELECT USING (car_id IN (
    SELECT id FROM public.rental_cars WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Car owners can update rental status" ON public.car_rentals
  FOR UPDATE USING (car_id IN (
    SELECT id FROM public.rental_cars WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all car rentals" ON public.car_rentals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- AIRLINES POLICIES
CREATE POLICY "Anyone can view active airlines" ON public.airlines
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage airlines" ON public.airlines
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- FLIGHTS POLICIES
CREATE POLICY "Anyone can view active flights" ON public.flights
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage flights" ON public.flights
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- FLIGHT BOOKINGS POLICIES
CREATE POLICY "Customers can view their flight bookings" ON public.flight_bookings
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create flight bookings" ON public.flight_bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all flight bookings" ON public.flight_bookings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- HOTELS POLICIES
CREATE POLICY "Anyone can view active hotels" ON public.hotels
  FOR SELECT USING (status = 'active');

CREATE POLICY "Owners can manage their hotels" ON public.hotels
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all hotels" ON public.hotels
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- HOTEL ROOMS POLICIES
CREATE POLICY "Anyone can view available hotel rooms" ON public.hotel_rooms
  FOR SELECT USING (is_available = true);

CREATE POLICY "Hotel owners can manage rooms" ON public.hotel_rooms
  FOR ALL USING (hotel_id IN (
    SELECT id FROM public.hotels WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all hotel rooms" ON public.hotel_rooms
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- HOTEL BOOKINGS POLICIES
CREATE POLICY "Customers can view their hotel bookings" ON public.hotel_bookings
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create hotel bookings" ON public.hotel_bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Hotel owners can view bookings" ON public.hotel_bookings
  FOR SELECT USING (hotel_id IN (
    SELECT id FROM public.hotels WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Hotel owners can update booking status" ON public.hotel_bookings
  FOR UPDATE USING (hotel_id IN (
    SELECT id FROM public.hotels WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all hotel bookings" ON public.hotel_bookings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_orders_updated_at BEFORE UPDATE ON public.food_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_cars_updated_at BEFORE UPDATE ON public.rental_cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_rentals_updated_at BEFORE UPDATE ON public.car_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON public.flights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_bookings_updated_at BEFORE UPDATE ON public.flight_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_rooms_updated_at BEFORE UPDATE ON public.hotel_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();