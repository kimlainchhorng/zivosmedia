-- Create driver_earnings table for detailed earnings breakdown
CREATE TABLE IF NOT EXISTS public.driver_earnings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    earning_type TEXT NOT NULL DEFAULT 'trip', -- trip, bonus, tip, incentive, referral
    base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    tip_amount NUMERIC(10,2) DEFAULT 0,
    bonus_amount NUMERIC(10,2) DEFAULT 0,
    platform_fee NUMERIC(10,2) DEFAULT 0,
    net_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'card', -- card, cash, wallet
    is_cash_collected BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commission_settings table for platform fee configuration
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL, -- rides, food_delivery, package_delivery
    vehicle_type TEXT, -- economy, comfort, premium, xl
    commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    minimum_fee NUMERIC(10,2) DEFAULT 0,
    maximum_fee NUMERIC(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_cash_collections table for tracking cash deposits
CREATE TABLE IF NOT EXISTS public.driver_cash_collections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    collection_method TEXT DEFAULT 'bank_deposit', -- bank_deposit, in_person, mobile_transfer
    reference_number TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, confirmed, disputed
    confirmed_by UUID,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_schedules table for shift management
CREATE TABLE IF NOT EXISTS public.driver_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_driver_actions table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_driver_actions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- suspend, activate, message, assign_trip, update_commission
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_driver_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_earnings
CREATE POLICY "Drivers can view their own earnings"
    ON public.driver_earnings FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.drivers WHERE id = driver_id));

CREATE POLICY "Admins can view all earnings"
    ON public.driver_earnings FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert earnings"
    ON public.driver_earnings FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for commission_settings
CREATE POLICY "Anyone can view active commission settings"
    ON public.commission_settings FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage commission settings"
    ON public.commission_settings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for driver_cash_collections
CREATE POLICY "Drivers can view their own cash collections"
    ON public.driver_cash_collections FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.drivers WHERE id = driver_id));

CREATE POLICY "Drivers can insert their own cash collections"
    ON public.driver_cash_collections FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.drivers WHERE id = driver_id));

CREATE POLICY "Admins can manage all cash collections"
    ON public.driver_cash_collections FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for driver_schedules
CREATE POLICY "Drivers can manage their own schedules"
    ON public.driver_schedules FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.drivers WHERE id = driver_id));

CREATE POLICY "Admins can view all schedules"
    ON public.driver_schedules FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admin_driver_actions
CREATE POLICY "Admins can manage driver actions"
    ON public.admin_driver_actions FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON public.driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created_at ON public.driver_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_driver_cash_collections_driver_id ON public.driver_cash_collections(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_id ON public.driver_schedules(driver_id);
CREATE INDEX IF NOT EXISTS idx_admin_driver_actions_driver_id ON public.admin_driver_actions(driver_id);

-- Insert default commission settings
INSERT INTO public.commission_settings (name, service_type, vehicle_type, commission_percentage, minimum_fee)
VALUES 
    ('Economy Rides', 'rides', 'economy', 20.00, 1.00),
    ('Comfort Rides', 'rides', 'comfort', 18.00, 1.50),
    ('Premium Rides', 'rides', 'premium', 15.00, 2.00),
    ('XL Rides', 'rides', 'xl', 18.00, 2.00),
    ('Food Delivery', 'food_delivery', NULL, 25.00, 1.00),
    ('Package Delivery', 'package_delivery', NULL, 22.00, 1.50)
ON CONFLICT DO NOTHING;