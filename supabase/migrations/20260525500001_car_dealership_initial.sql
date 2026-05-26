-- Car Dealership module — initial schema.
-- Mirrors the salon / car-rental module pattern: store-scoped tables,
-- owner-only RLS, snapshots on sales so later edits to vehicle rows don't
-- rewrite history.

------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_vehicle_status') THEN
    CREATE TYPE public.car_dealership_vehicle_status AS ENUM (
      'available',
      'reserved',
      'pending_sale',
      'sold',
      'in_transit',
      'service',
      'retired'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_condition') THEN
    CREATE TYPE public.car_dealership_condition AS ENUM (
      'new',
      'used',
      'certified_preowned'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_transmission') THEN
    CREATE TYPE public.car_dealership_transmission AS ENUM (
      'automatic',
      'manual',
      'cvt',
      'dual_clutch',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_fuel') THEN
    CREATE TYPE public.car_dealership_fuel AS ENUM (
      'gasoline',
      'diesel',
      'hybrid',
      'plugin_hybrid',
      'electric',
      'flex_fuel',
      'lpg',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_drivetrain') THEN
    CREATE TYPE public.car_dealership_drivetrain AS ENUM (
      'fwd',
      'rwd',
      'awd',
      '4wd'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_lead_status') THEN
    CREATE TYPE public.car_dealership_lead_status AS ENUM (
      'new',
      'contacted',
      'qualified',
      'test_drive_scheduled',
      'negotiating',
      'won',
      'lost'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_test_drive_status') THEN
    CREATE TYPE public.car_dealership_test_drive_status AS ENUM (
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_sale_status') THEN
    CREATE TYPE public.car_dealership_sale_status AS ENUM (
      'quote',
      'pending',
      'deposit_paid',
      'financing',
      'completed',
      'delivered',
      'cancelled',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_dealership_financing_status') THEN
    CREATE TYPE public.car_dealership_financing_status AS ENUM (
      'draft',
      'submitted',
      'approved',
      'conditionally_approved',
      'declined',
      'funded',
      'cancelled'
    );
  END IF;
END$$;

------------------------------------------------------------------------
-- Vehicles (inventory)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  -- Identity
  stock_number TEXT,
  vin TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
  body_type TEXT,
  exterior_color TEXT,
  interior_color TEXT,
  license_plate TEXT,

  -- Classification
  condition public.car_dealership_condition NOT NULL DEFAULT 'used',
  transmission public.car_dealership_transmission NOT NULL DEFAULT 'automatic',
  fuel_type public.car_dealership_fuel NOT NULL DEFAULT 'gasoline',
  drivetrain public.car_dealership_drivetrain,
  engine TEXT,
  cylinders INTEGER CHECK (cylinders IS NULL OR cylinders BETWEEN 1 AND 16),
  doors INTEGER CHECK (doors IS NULL OR doors BETWEEN 1 AND 10),
  seats INTEGER CHECK (seats IS NULL OR seats BETWEEN 1 AND 30),
  mileage INTEGER CHECK (mileage IS NULL OR mileage >= 0),
  mileage_unit TEXT NOT NULL DEFAULT 'mi' CHECK (mileage_unit IN ('mi', 'km')),

  -- Financials
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  asking_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (asking_price_cents >= 0),
  msrp_cents INTEGER NOT NULL DEFAULT 0 CHECK (msrp_cents >= 0),
  min_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_price_cents >= 0),

  -- Media
  photo_url TEXT,
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  video_url TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT CHECK (description IS NULL OR char_length(description) <= 5000),

  -- Lot tracking
  acquired_at DATE,
  acquired_from TEXT,
  location_label TEXT,
  days_on_lot INTEGER NOT NULL DEFAULT 0,

  status public.car_dealership_vehicle_status NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_vehicles_store_idx
  ON public.car_dealership_vehicles (store_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS car_dealership_vehicles_status_idx
  ON public.car_dealership_vehicles (store_id, status);
CREATE INDEX IF NOT EXISTS car_dealership_vehicles_makemodel_idx
  ON public.car_dealership_vehicles (store_id, make, model);
CREATE UNIQUE INDEX IF NOT EXISTS car_dealership_vehicles_vin_unique
  ON public.car_dealership_vehicles (store_id, lower(vin))
  WHERE vin IS NOT NULL AND vin <> '';
CREATE UNIQUE INDEX IF NOT EXISTS car_dealership_vehicles_stock_unique
  ON public.car_dealership_vehicles (store_id, lower(stock_number))
  WHERE stock_number IS NOT NULL AND stock_number <> '';

------------------------------------------------------------------------
-- Customers (buyer book)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 160),
  email TEXT,
  phone TEXT,
  date_of_birth DATE,

  driver_license_number TEXT,
  driver_license_state TEXT,
  driver_license_country TEXT,
  driver_license_expiry DATE,

  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,

  -- Soft KYC / sales context
  employer TEXT,
  occupation TEXT,
  income_band TEXT,
  preferred_contact TEXT CHECK (preferred_contact IS NULL OR preferred_contact IN ('phone', 'email', 'sms', 'whatsapp')),

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,

  total_purchases INTEGER NOT NULL DEFAULT 0 CHECK (total_purchases >= 0),
  lifetime_value_cents INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_value_cents >= 0),
  last_purchase_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_customers_store_idx
  ON public.car_dealership_customers (store_id);
CREATE INDEX IF NOT EXISTS car_dealership_customers_phone_idx
  ON public.car_dealership_customers (store_id, lower(phone)) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_dealership_customers_email_idx
  ON public.car_dealership_customers (store_id, lower(email)) WHERE email IS NOT NULL;

------------------------------------------------------------------------
-- Leads (sales pipeline)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  customer_id UUID REFERENCES public.car_dealership_customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.car_dealership_vehicles(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Snapshot
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  vehicle_label TEXT,

  source TEXT NOT NULL DEFAULT 'walk_in'
    CHECK (source IN ('walk_in', 'phone', 'web', 'referral', 'social', 'event', 'auto_trader', 'cars_com', 'other')),
  status public.car_dealership_lead_status NOT NULL DEFAULT 'new',

  budget_min_cents INTEGER CHECK (budget_min_cents IS NULL OR budget_min_cents >= 0),
  budget_max_cents INTEGER CHECK (budget_max_cents IS NULL OR budget_max_cents >= 0),
  desired_make TEXT,
  desired_model TEXT,
  desired_year_min INTEGER,
  desired_year_max INTEGER,
  trade_in_interested BOOLEAN NOT NULL DEFAULT false,
  financing_needed BOOLEAN NOT NULL DEFAULT false,

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  lost_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_leads_store_idx
  ON public.car_dealership_leads (store_id, status);
CREATE INDEX IF NOT EXISTS car_dealership_leads_followup_idx
  ON public.car_dealership_leads (store_id, next_followup_at)
  WHERE status NOT IN ('won', 'lost');
CREATE INDEX IF NOT EXISTS car_dealership_leads_vehicle_idx
  ON public.car_dealership_leads (vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_dealership_leads_customer_idx
  ON public.car_dealership_leads (customer_id) WHERE customer_id IS NOT NULL;

------------------------------------------------------------------------
-- Test drives
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.car_dealership_leads(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.car_dealership_vehicles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.car_dealership_customers(id) ON DELETE SET NULL,
  salesperson_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Snapshots
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  vehicle_label TEXT NOT NULL,

  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 480),

  status public.car_dealership_test_drive_status NOT NULL DEFAULT 'scheduled',

  start_odometer INTEGER CHECK (start_odometer IS NULL OR start_odometer >= 0),
  end_odometer INTEGER CHECK (end_odometer IS NULL OR end_odometer >= 0),
  start_fuel_level INTEGER CHECK (start_fuel_level IS NULL OR start_fuel_level BETWEEN 0 AND 100),
  end_fuel_level INTEGER CHECK (end_fuel_level IS NULL OR end_fuel_level BETWEEN 0 AND 100),

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  cancellation_reason TEXT,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_test_drives_store_idx
  ON public.car_dealership_test_drives (store_id, scheduled_at);
CREATE INDEX IF NOT EXISTS car_dealership_test_drives_vehicle_idx
  ON public.car_dealership_test_drives (vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_dealership_test_drives_status_idx
  ON public.car_dealership_test_drives (store_id, status);

------------------------------------------------------------------------
-- Sales
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  vehicle_id UUID REFERENCES public.car_dealership_vehicles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.car_dealership_customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.car_dealership_leads(id) ON DELETE SET NULL,
  salesperson_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Snapshots
  vehicle_label TEXT NOT NULL,
  vehicle_vin TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  salesperson_name TEXT,

  deal_number TEXT NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10)),

  -- Pricing breakdown (all cents)
  sale_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (sale_price_cents >= 0),
  trade_in_value_cents INTEGER NOT NULL DEFAULT 0 CHECK (trade_in_value_cents >= 0),
  trade_in_payoff_cents INTEGER NOT NULL DEFAULT 0 CHECK (trade_in_payoff_cents >= 0),
  rebate_cents INTEGER NOT NULL DEFAULT 0 CHECK (rebate_cents >= 0),
  doc_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (doc_fee_cents >= 0),
  registration_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (registration_fee_cents >= 0),
  title_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (title_fee_cents >= 0),
  other_fees_cents INTEGER NOT NULL DEFAULT 0 CHECK (other_fees_cents >= 0),
  taxes_cents INTEGER NOT NULL DEFAULT 0 CHECK (taxes_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  warranty_cents INTEGER NOT NULL DEFAULT 0 CHECK (warranty_cents >= 0),
  gap_insurance_cents INTEGER NOT NULL DEFAULT 0 CHECK (gap_insurance_cents >= 0),

  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),

  deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  amount_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  balance_due_cents INTEGER NOT NULL DEFAULT 0,

  status public.car_dealership_sale_status NOT NULL DEFAULT 'quote',
  payment_method TEXT
    CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'financing', 'lease', 'bank_transfer', 'check', 'other')),

  sold_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  customer_notes TEXT CHECK (customer_notes IS NULL OR char_length(customer_notes) <= 1000),
  internal_notes TEXT CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 2000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_sales_store_idx
  ON public.car_dealership_sales (store_id, status);
CREATE INDEX IF NOT EXISTS car_dealership_sales_vehicle_idx
  ON public.car_dealership_sales (vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_dealership_sales_customer_idx
  ON public.car_dealership_sales (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_dealership_sales_sold_at_idx
  ON public.car_dealership_sales (store_id, sold_at DESC) WHERE sold_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS car_dealership_sales_deal_number_unique
  ON public.car_dealership_sales (deal_number);

------------------------------------------------------------------------
-- Trade-ins
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_trade_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.car_dealership_sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.car_dealership_customers(id) ON DELETE SET NULL,
  appraiser_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
  trim TEXT,
  vin TEXT,
  license_plate TEXT,
  mileage INTEGER CHECK (mileage IS NULL OR mileage >= 0),
  color TEXT,
  condition TEXT CHECK (condition IS NULL OR condition IN ('excellent', 'good', 'fair', 'poor', 'salvage')),

  appraised_value_cents INTEGER NOT NULL DEFAULT 0 CHECK (appraised_value_cents >= 0),
  offered_value_cents INTEGER NOT NULL DEFAULT 0 CHECK (offered_value_cents >= 0),
  payoff_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (payoff_amount_cents >= 0),
  payoff_lender TEXT,

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'appraised'
    CHECK (status IN ('appraised', 'offered', 'accepted', 'declined', 'completed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_trade_ins_store_idx
  ON public.car_dealership_trade_ins (store_id, status);
CREATE INDEX IF NOT EXISTS car_dealership_trade_ins_sale_idx
  ON public.car_dealership_trade_ins (sale_id) WHERE sale_id IS NOT NULL;

------------------------------------------------------------------------
-- Financing
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_financing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.car_dealership_sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.car_dealership_customers(id) ON DELETE SET NULL,

  lender_name TEXT,
  application_number TEXT,

  amount_financed_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_financed_cents >= 0),
  down_payment_cents INTEGER NOT NULL DEFAULT 0 CHECK (down_payment_cents >= 0),
  apr_bps INTEGER NOT NULL DEFAULT 0 CHECK (apr_bps >= 0 AND apr_bps <= 100000),
  term_months INTEGER NOT NULL DEFAULT 60 CHECK (term_months BETWEEN 1 AND 120),
  monthly_payment_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_payment_cents >= 0),
  first_payment_due DATE,
  payment_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (payment_frequency IN ('weekly', 'biweekly', 'monthly')),

  status public.car_dealership_financing_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  decision_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_financing_store_idx
  ON public.car_dealership_financing (store_id, status);
CREATE INDEX IF NOT EXISTS car_dealership_financing_sale_idx
  ON public.car_dealership_financing (sale_id) WHERE sale_id IS NOT NULL;

------------------------------------------------------------------------
-- Lead activity log (notes / calls / emails / SMS)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.car_dealership_leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('note', 'call', 'email', 'sms', 'meeting', 'test_drive', 'status_change', 'system')),
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 500),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 4000),

  outcome TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_lead_activities_lead_idx
  ON public.car_dealership_lead_activities (lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS car_dealership_lead_activities_store_idx
  ON public.car_dealership_lead_activities (store_id, occurred_at DESC);

------------------------------------------------------------------------
-- Expenses (categorized cost log, mirrors salon_expenses)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.car_dealership_vehicles(id) ON DELETE SET NULL,

  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('acquisition', 'reconditioning', 'detailing', 'transport', 'parts', 'advertising', 'rent', 'utilities', 'insurance', 'payroll', 'licensing', 'general')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 300),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  vendor TEXT,
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_expenses_store_idx
  ON public.car_dealership_expenses (store_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS car_dealership_expenses_vehicle_idx
  ON public.car_dealership_expenses (vehicle_id) WHERE vehicle_id IS NOT NULL;

------------------------------------------------------------------------
-- Reviews (customer feedback after delivery)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.car_dealership_sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.car_dealership_customers(id) ON DELETE SET NULL,

  customer_name TEXT NOT NULL,
  vehicle_label TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,

  owner_response TEXT,
  owner_responded_at TIMESTAMPTZ,
  is_visible BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_reviews_store_idx
  ON public.car_dealership_reviews (store_id, created_at DESC) WHERE is_visible;

------------------------------------------------------------------------
-- Updated-at trigger fn (shared across this module)
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_dealership_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'car_dealership_vehicles',
    'car_dealership_customers',
    'car_dealership_leads',
    'car_dealership_test_drives',
    'car_dealership_sales',
    'car_dealership_trade_ins',
    'car_dealership_financing',
    'car_dealership_expenses',
    'car_dealership_reviews'
  ] LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS %1$s_set_updated_at ON public.%1$I;
      CREATE TRIGGER %1$s_set_updated_at BEFORE UPDATE ON public.%1$I
        FOR EACH ROW EXECUTE FUNCTION public.tg_car_dealership_set_updated_at();
    $f$, t);
  END LOOP;
END$$;

------------------------------------------------------------------------
-- Sales rollups: keep total_cents and balance_due_cents in sync with the
-- breakdown columns.
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_dealership_sales_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.subtotal_cents :=
    GREATEST(0,
      NEW.sale_price_cents
      + NEW.doc_fee_cents
      + NEW.registration_fee_cents
      + NEW.title_fee_cents
      + NEW.other_fees_cents
      + NEW.warranty_cents
      + NEW.gap_insurance_cents
      - NEW.discount_cents
      - NEW.rebate_cents
    );

  NEW.total_cents :=
    GREATEST(0,
      NEW.subtotal_cents
      + NEW.taxes_cents
      - (NEW.trade_in_value_cents - NEW.trade_in_payoff_cents)
    );

  NEW.balance_due_cents := NEW.total_cents - NEW.amount_paid_cents;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS car_dealership_sales_rollup ON public.car_dealership_sales;
CREATE TRIGGER car_dealership_sales_rollup
  BEFORE INSERT OR UPDATE ON public.car_dealership_sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_dealership_sales_rollup();

------------------------------------------------------------------------
-- Vehicle status sync: flipping a sale to 'completed' marks the vehicle
-- 'sold'; flipping back from completed to cancelled/refunded releases it.
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_dealership_vehicle_status_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('pending', 'deposit_paid', 'financing') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.car_dealership_vehicles
      SET status = 'pending_sale'
      WHERE id = NEW.vehicle_id AND status NOT IN ('sold', 'retired');
  END IF;

  IF NEW.status IN ('completed', 'delivered') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.car_dealership_vehicles
      SET status = 'sold'
      WHERE id = NEW.vehicle_id;
  END IF;

  IF NEW.status IN ('cancelled', 'refunded')
     AND OLD.status IN ('pending', 'deposit_paid', 'financing', 'completed', 'delivered') THEN
    UPDATE public.car_dealership_vehicles
      SET status = 'available'
      WHERE id = NEW.vehicle_id AND status NOT IN ('retired');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS car_dealership_sales_vehicle_status_sync ON public.car_dealership_sales;
CREATE TRIGGER car_dealership_sales_vehicle_status_sync
  AFTER UPDATE OF status ON public.car_dealership_sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_dealership_vehicle_status_sync();

------------------------------------------------------------------------
-- Customer purchase counter sync (sale flips to 'completed' or 'delivered')
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_dealership_customers_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('completed', 'delivered')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND (OLD.status NOT IN ('completed', 'delivered') OR OLD.status IS NULL) THEN
    UPDATE public.car_dealership_customers
      SET total_purchases = total_purchases + 1,
          lifetime_value_cents = lifetime_value_cents + NEW.total_cents,
          last_purchase_at = COALESCE(NEW.sold_at, now())
      WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS car_dealership_sales_customer_sync ON public.car_dealership_sales;
CREATE TRIGGER car_dealership_sales_customer_sync
  AFTER UPDATE OF status ON public.car_dealership_sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_dealership_customers_sync();

------------------------------------------------------------------------
-- RLS — owners + admins manage everything; public can SELECT active
-- vehicles & insert leads from the storefront.
------------------------------------------------------------------------

ALTER TABLE public.car_dealership_vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_test_drives      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_sales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_trade_ins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_financing        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_lead_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_dealership_reviews          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'car_dealership_vehicles',
    'car_dealership_customers',
    'car_dealership_leads',
    'car_dealership_test_drives',
    'car_dealership_sales',
    'car_dealership_trade_ins',
    'car_dealership_financing',
    'car_dealership_lead_activities',
    'car_dealership_expenses',
    'car_dealership_reviews'
  ] LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Owners manage %1$s - select" ON public.%1$I;
      CREATE POLICY "Owners manage %1$s - select" ON public.%1$I FOR SELECT TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Owners manage %1$s - insert" ON public.%1$I;
      CREATE POLICY "Owners manage %1$s - insert" ON public.%1$I FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Owners manage %1$s - update" ON public.%1$I;
      CREATE POLICY "Owners manage %1$s - update" ON public.%1$I FOR UPDATE TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Owners manage %1$s - delete" ON public.%1$I;
      CREATE POLICY "Owners manage %1$s - delete" ON public.%1$I FOR DELETE TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
  END LOOP;
END$$;

-- Public read for the storefront: active vehicles + visible reviews.
DROP POLICY IF EXISTS "Public read active dealership vehicles" ON public.car_dealership_vehicles;
CREATE POLICY "Public read active dealership vehicles"
  ON public.car_dealership_vehicles FOR SELECT TO anon, authenticated
  USING (is_active = true AND status NOT IN ('retired'));

DROP POLICY IF EXISTS "Public read dealership reviews" ON public.car_dealership_reviews;
CREATE POLICY "Public read dealership reviews"
  ON public.car_dealership_reviews FOR SELECT TO anon, authenticated
  USING (is_visible = true);

-- Public can create a lead from the storefront contact form.
DROP POLICY IF EXISTS "Public can create dealership leads" ON public.car_dealership_leads;
CREATE POLICY "Public can create dealership leads"
  ON public.car_dealership_leads FOR INSERT TO anon, authenticated
  WITH CHECK (source IN ('web', 'phone'));
