-- Gate salon gift-card mutations through salon-gift-card-manage.
-- Owners/admins and recipients keep read access; issue/redeem/activate/delete
-- now require service-role validation in the Edge Function.

ALTER TABLE public.salon_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_gift_card_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage gift cards - all" ON public.salon_gift_cards;
DROP POLICY IF EXISTS "Owners manage gift card redemptions - all" ON public.salon_gift_card_redemptions;

DROP POLICY IF EXISTS "Owners read gift cards" ON public.salon_gift_cards;
CREATE POLICY "Owners read gift cards"
  ON public.salon_gift_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_gift_cards.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners read gift card redemptions" ON public.salon_gift_card_redemptions;
CREATE POLICY "Owners read gift card redemptions"
  ON public.salon_gift_card_redemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_gift_card_redemptions.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon gift card inserts require trusted server-side validation" ON public.salon_gift_cards;
CREATE POLICY "Salon gift card inserts require trusted server-side validation"
  ON public.salon_gift_cards
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon gift card updates require trusted server-side validation" ON public.salon_gift_cards;
CREATE POLICY "Salon gift card updates require trusted server-side validation"
  ON public.salon_gift_cards
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon gift card deletes require trusted server-side validation" ON public.salon_gift_cards;
CREATE POLICY "Salon gift card deletes require trusted server-side validation"
  ON public.salon_gift_cards
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Salon gift card redemption inserts require trusted server-side validation" ON public.salon_gift_card_redemptions;
CREATE POLICY "Salon gift card redemption inserts require trusted server-side validation"
  ON public.salon_gift_card_redemptions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon gift card redemption updates require trusted server-side validation" ON public.salon_gift_card_redemptions;
CREATE POLICY "Salon gift card redemption updates require trusted server-side validation"
  ON public.salon_gift_card_redemptions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon gift card redemption deletes require trusted server-side validation" ON public.salon_gift_card_redemptions;
CREATE POLICY "Salon gift card redemption deletes require trusted server-side validation"
  ON public.salon_gift_card_redemptions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_gift_cards FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_gift_card_redemptions FROM anon, authenticated;

GRANT SELECT ON TABLE public.salon_gift_cards TO authenticated;
GRANT SELECT ON TABLE public.salon_gift_card_redemptions TO authenticated;
GRANT ALL ON TABLE public.salon_gift_cards TO service_role;
GRANT ALL ON TABLE public.salon_gift_card_redemptions TO service_role;
