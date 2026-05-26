-- Car rental — expenses and maintenance log.

------------------------------------------------------------------------
-- Expenses
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.car_rental_vehicles(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('fuel', 'insurance', 'maintenance', 'cleaning', 'lot_rent', 'registration', 'taxes', 'parts', 'tires', 'office', 'marketing', 'other')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 250),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  paid_to TEXT,
  payment_method TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_expenses_store_date_idx
  ON public.car_rental_expenses (store_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS car_rental_expenses_vehicle_idx
  ON public.car_rental_expenses (vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_rental_expenses_category_idx
  ON public.car_rental_expenses (store_id, category);

------------------------------------------------------------------------
-- Maintenance log
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.car_rental_vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL DEFAULT 'other'
    CHECK (service_type IN ('oil_change', 'tire_rotation', 'tire_replacement', 'brake_service', 'battery', 'inspection', 'cleaning', 'detailing', 'body_work', 'engine', 'transmission', 'recall', 'other')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  shop TEXT,
  odometer INTEGER CHECK (odometer IS NULL OR odometer >= 0),
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_service_due_date DATE,
  next_service_due_odometer INTEGER,
  /** If true, the vehicle's status becomes 'maintenance' on insert and back to
   *  'available' on completion. The UI updates the vehicle directly so this
   *  flag is just informational for reports. */
  took_vehicle_offline BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_maintenance_store_date_idx
  ON public.car_rental_maintenance (store_id, service_date DESC);
CREATE INDEX IF NOT EXISTS car_rental_maintenance_vehicle_idx
  ON public.car_rental_maintenance (vehicle_id, service_date DESC);

------------------------------------------------------------------------
-- updated_at triggers (reuse shared function)
------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_expenses_set_updated_at') THEN
    CREATE TRIGGER car_rental_expenses_set_updated_at BEFORE UPDATE ON public.car_rental_expenses
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_maintenance_set_updated_at') THEN
    CREATE TRIGGER car_rental_maintenance_set_updated_at BEFORE UPDATE ON public.car_rental_maintenance
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
END$$;

------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------

ALTER TABLE public.car_rental_expenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_maintenance ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'car_rental_expenses',
    'car_rental_maintenance'
  ] LOOP
    EXECUTE format($f$
      CREATE POLICY "Owners manage %1$s - select" ON public.%1$I FOR SELECT TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owners manage %1$s - insert" ON public.%1$I FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
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
      CREATE POLICY "Owners manage %1$s - delete" ON public.%1$I FOR DELETE TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;
