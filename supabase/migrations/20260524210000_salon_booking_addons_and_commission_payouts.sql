-- Two more salon tables that live in production but had no local migration:
--
--   salon_booking_addons    — extra services tacked onto a booking
--                             (e.g. a manicure add-on with the haircut)
--   salon_commission_payouts — ledger of stylist payouts, written by the
--                             Tips & Commissions section's "Mark paid" button

-- ===== Booking add-ons =====
CREATE TABLE IF NOT EXISTS public.salon_booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.salon_bookings(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.salon_services(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 100),
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0 AND duration_minutes <= 480),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_booking_addons_booking_idx
  ON public.salon_booking_addons (booking_id);
CREATE INDEX IF NOT EXISTS salon_booking_addons_store_idx
  ON public.salon_booking_addons (store_id, created_at DESC);

ALTER TABLE public.salon_booking_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage booking addons - all"
  ON public.salon_booking_addons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_booking_addons.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_booking_addons.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- ===== Commission payouts =====
CREATE TABLE IF NOT EXISTS public.salon_commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES public.salon_stylists(id) ON DELETE CASCADE,

  -- Period this payout covers. Inclusive date range; stored as DATE so the
  -- UI can pick the calendar boundary without timezone surprises.
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  CONSTRAINT salon_commission_payouts_period_order CHECK (period_to >= period_from),

  services_count INTEGER NOT NULL DEFAULT 0 CHECK (services_count >= 0),
  service_revenue_cents INTEGER NOT NULL DEFAULT 0 CHECK (service_revenue_cents >= 0),
  tips_cents INTEGER NOT NULL DEFAULT 0 CHECK (tips_cents >= 0),
  commission_cents INTEGER NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  -- Cash actually handed to the stylist (commission + tips, usually).
  total_paid_cents INTEGER NOT NULL CHECK (total_paid_cents >= 0),

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_commission_payouts_store_paid_idx
  ON public.salon_commission_payouts (store_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS salon_commission_payouts_stylist_period_idx
  ON public.salon_commission_payouts (stylist_id, period_from DESC);

ALTER TABLE public.salon_commission_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage commission payouts - all"
  ON public.salon_commission_payouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_commission_payouts.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_commission_payouts.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- A stylist linked through salon_stylists.user_id can read their own payout
-- history (for a "my earnings" view), but not write — payouts only come from
-- the owner side.
CREATE POLICY "Stylists can read their own payouts"
  ON public.salon_commission_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      WHERE st.id = salon_commission_payouts.stylist_id
        AND st.user_id = (SELECT auth.uid())
    )
  );
