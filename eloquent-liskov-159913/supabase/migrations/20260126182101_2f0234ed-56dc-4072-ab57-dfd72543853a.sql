-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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
      AND role = _role
  )
$$;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create driver_status enum
CREATE TYPE public.driver_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- Create drivers table
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    license_number TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_model TEXT,
    vehicle_plate TEXT NOT NULL,
    avatar_url TEXT,
    status driver_status DEFAULT 'pending',
    rating DECIMAL(3,2) DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    documents_verified BOOLEAN DEFAULT false,
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create trip_status enum
CREATE TYPE public.trip_status AS ENUM ('requested', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled');

-- Create trips table
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    distance_km DECIMAL(10, 2),
    duration_minutes INTEGER,
    fare_amount DECIMAL(10, 2),
    status trip_status DEFAULT 'requested',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create pricing table
CREATE TABLE public.pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_type TEXT NOT NULL UNIQUE,
    base_fare DECIMAL(10, 2) NOT NULL DEFAULT 2.50,
    per_km_rate DECIMAL(10, 2) NOT NULL DEFAULT 1.50,
    per_minute_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.25,
    minimum_fare DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    surge_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pricing
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Drivers policies
CREATE POLICY "Drivers can view their own record"
ON public.drivers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own record"
ON public.drivers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all drivers"
ON public.drivers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view verified drivers"
ON public.drivers FOR SELECT
USING (status = 'verified' AND is_online = true);

-- Trips policies
CREATE POLICY "Users can view their own trips"
ON public.trips FOR SELECT
USING (auth.uid() = rider_id);

CREATE POLICY "Drivers can view assigned trips"
ON public.trips FOR SELECT
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all trips"
ON public.trips FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Pricing policies
CREATE POLICY "Anyone can view active pricing"
ON public.pricing FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage pricing"
ON public.pricing FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_updated_at
    BEFORE UPDATE ON public.pricing
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pricing options
INSERT INTO public.pricing (vehicle_type, base_fare, per_km_rate, per_minute_rate, minimum_fare)
VALUES 
    ('economy', 2.50, 1.20, 0.20, 5.00),
    ('comfort', 3.50, 1.80, 0.30, 8.00),
    ('premium', 5.00, 2.50, 0.45, 12.00),
    ('xl', 4.00, 2.00, 0.35, 10.00);