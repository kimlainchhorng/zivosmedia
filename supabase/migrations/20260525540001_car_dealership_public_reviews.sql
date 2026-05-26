------------------------------------------------------------------------
-- Car dealership — public review submission
--
-- Customers can submit one review per delivered deal via a public URL like
--   /car-dealership/:slug/review/:dealId
--
-- The deal_id acts as a soft token: dealers email/SMS the link to the
-- customer after delivery. The RLS policy enforces that the linked sale
-- actually exists and is delivered/completed; a UNIQUE partial index
-- prevents the same deal from accumulating multiple reviews.
--
-- The review form needs to display the vehicle to the customer, but we
-- can't expose `car_dealership_sales` rows to anonymous users (PII like
-- phone/email/sale price would leak). Instead, a SECURITY DEFINER function
-- returns only the safe columns for a single sale id.
--
-- Submitted reviews land with is_visible=false so the admin moderates
-- before they appear publicly.
------------------------------------------------------------------------

-- One review per delivered deal. Partial index so legacy NULL sale_id
-- rows (admin-created, vehicle-only) remain unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS car_dealership_reviews_unique_per_sale
  ON public.car_dealership_reviews (sale_id) WHERE sale_id IS NOT NULL;

-- Public INSERT: anonymous customers can submit a review for a sale that
-- belongs to the same store, has status completed/delivered, and isn't
-- already reviewed (UNIQUE INDEX above blocks the second submit).
DROP POLICY IF EXISTS "Public submit dealership review"
  ON public.car_dealership_reviews;
CREATE POLICY "Public submit dealership review"
  ON public.car_dealership_reviews FOR INSERT TO anon, authenticated
  WITH CHECK (
    sale_id IS NOT NULL
    AND is_visible = false  -- public submissions are unmoderated by default
    AND EXISTS (
      SELECT 1 FROM public.car_dealership_sales s
      WHERE s.id = car_dealership_reviews.sale_id
        AND s.store_id = car_dealership_reviews.store_id
        AND s.status IN ('completed', 'delivered')
    )
  );

-- Controlled lookup function — returns ONLY the fields the review form
-- needs (vehicle label, customer name, status). Does not expose phone /
-- email / sale price / any other PII.
CREATE OR REPLACE FUNCTION public.get_deal_for_review(p_sale_id UUID)
RETURNS TABLE (
  store_id UUID,
  vehicle_label TEXT,
  vehicle_vin TEXT,
  customer_name TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.store_id, s.vehicle_label, s.vehicle_vin, s.customer_name, s.status::TEXT
  FROM public.car_dealership_sales s
  WHERE s.id = p_sale_id
    AND s.status IN ('completed', 'delivered');
$$;

GRANT EXECUTE ON FUNCTION public.get_deal_for_review(UUID) TO anon, authenticated;

COMMENT ON INDEX public.car_dealership_reviews_unique_per_sale IS
  'One review per delivered deal — protects the public review-submit endpoint from duplicate submissions.';

COMMENT ON FUNCTION public.get_deal_for_review(UUID) IS
  'Public review-submit lookup: returns the vehicle label + customer name for a delivered/completed deal. Returns no rows otherwise. Does not expose phone/email/sale_price.';
