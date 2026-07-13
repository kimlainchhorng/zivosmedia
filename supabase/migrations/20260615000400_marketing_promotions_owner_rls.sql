-- Store-profile owners can manage their promotions. The existing owner policy
-- keyed on the legacy `restaurants` table (merchant_id IN restaurants), so
-- store_profiles-based stores could never view or manage their promos — the
-- promotions list showed 0 and direct writes were blocked.
create policy "Store-profile owners manage promotions"
on public.promotions for all to authenticated
using (public.user_owns_store(merchant_id, (select auth.uid())))
with check (public.user_owns_store(merchant_id, (select auth.uid())));

-- Owners can view their own ad-studio events (was restaurants-only).
create policy "Store-profile owners view ad events"
on public.ads_studio_events for select to authenticated
using (public.user_owns_store(store_id, (select auth.uid())));

-- Owners can view redemptions of their own promo codes (was restaurants-only).
create policy "Store-profile owners view promo redemptions"
on public.marketing_promo_redemptions for select to authenticated
using (exists (
  select 1 from public.marketing_promo_codes p
  join public.store_profiles s on s.id = p.store_id
  where p.id = marketing_promo_redemptions.promo_code_id
    and s.owner_id = (select auth.uid())
));
