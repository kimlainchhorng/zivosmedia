
-- Tighten truck_sales INSERT
DROP POLICY "Auth users can insert truck_sales" ON public.truck_sales;
CREATE POLICY "Users can insert own truck_sales" ON public.truck_sales FOR INSERT TO authenticated
  WITH CHECK (driver_user_id = auth.uid());

-- Tighten truck_sale_items INSERT
DROP POLICY "Auth users can insert truck_sale_items" ON public.truck_sale_items;
CREATE POLICY "Users can insert own truck_sale_items" ON public.truck_sale_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.truck_sales ts WHERE ts.id = sale_id AND ts.driver_user_id = auth.uid()));

-- Tighten merchant_ad_spend INSERT
DROP POLICY "Auth users can insert ad spend" ON public.merchant_ad_spend;
CREATE POLICY "Store owners can insert ad spend" ON public.merchant_ad_spend FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = auth.uid()));
