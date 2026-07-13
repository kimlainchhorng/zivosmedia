-- ads_studio_daily_spend SELECT was gated only on the legacy `restaurants` table,
-- so store_profiles owners (the current store model) could not read their own ad
-- spend — the Marketing → Performance panel showed $0 spend for real owners even
-- when spend existed. Add an additive owner SELECT policy keyed on store_profiles
-- via user_owns_store, mirroring ads_studio_events. Admin access is unchanged.
create policy "Store-profile owners view daily spend"
on public.ads_studio_daily_spend for select to authenticated
using (public.user_owns_store(store_id, (select auth.uid())));
